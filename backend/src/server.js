/**
 * Fastify HTTP server — entry point for the backend.
 *
 * Two endpoints:
 *   POST /api/scan/single  — check one page (fast, ~15-30 sec)
 *   POST /api/scan/full    — check whole site (slow, ~2-5 min)
 *
 * Keys (Groq, Sleza) come from the request headers — never stored server-side.
 * Rate limiting: max 3 concurrent scans per IP to prevent abuse.
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { randomUUID } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { scanSinglePage, scanFullSite } from './scanner.js';
import { closeBrowser } from './pageContext.js';
import { initSchema, saveScan, getScan, findCachedScan, saveLead, saveSubscription, cleanupOldScans, dbEnabled, getCheckStats, getTopViolations, findScansWithStatus, saveFeedback, getFeedbackStats, getFeedbackPatterns, upsertDomainException, handleConfirmFeedback, getAllExceptions, expireExceptionsByCheckId, getDomainExceptionStatus, getRecentLeads, getLeadStats, getScanStats, saveEvent, getFunnel, saveDocRequest, getRecentDocRequests, getRecentScansRaw, getConsentStats } from './db.js';
import { tgEnabled, sendLeadNotification, registerWebhook, getWebhookSecret, handleUpdate } from './tg.js';
import { verifyException } from './scanner.js';
import { validateEmail, validateCompany, validateEmailMX } from './validateLead.js';
import { isSafeUrl } from './utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// Extract just the URL in case the env var was accidentally set as "FRONTEND_URL = https://..."
const FRONTEND_URL = (() => {
  const raw = process.env.FRONTEND_URL || 'http://localhost:3000';
  const m = raw.match(/https?:\/\/[^\s]+/);
  return m ? m[0].replace(/\/$/, '') : 'http://localhost:3000';
})();

const PORT = Number(process.env.PORT) || 3001;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',').map(o => o.trim()).filter(Boolean);

// trustProxy: behind Railway's proxy, read the real client IP from X-Forwarded-For
// so per-IP rate limits (and the `ip` stored on scans) are meaningful, not the proxy's.
const app = Fastify({ logger: true, trustProxy: true });

// Allow requests from the Next.js frontend
await app.register(cors, {
  origin: true, // mirrors request Origin — fine for demo; restrict before production
  methods: ['POST', 'GET', 'OPTIONS'],
});

// Simple in-memory rate limiter: max 3 concurrent scans per IP
const activeScans = new Map(); // ip → count
function checkRateLimit(ip) {
  const count = activeScans.get(ip) || 0;
  if (count >= 3) return false;
  activeScans.set(ip, count + 1);
  return true;
}
function releaseRateLimit(ip) {
  const count = activeScans.get(ip) || 1;
  if (count <= 1) activeScans.delete(ip);
  else activeScans.set(ip, count - 1);
}

// Fixed-window per-IP rate limiter for public POST endpoints (anti-spam on заявки /
// events / leads). Returns true if the request is allowed, false if over the limit.
const rateBuckets = new Map(); // `${bucket}:${ip}` → { count, resetAt }
function hitRateLimit(ip, bucket, max, windowMs) {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const e = rateBuckets.get(key);
  if (!e || now >= e.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (e.count >= max) return false;
  e.count++;
  return true;
}
// Sweep expired buckets so the Map can't grow unbounded with unique IPs.
setInterval(() => {
  const now = Date.now();
  for (const [k, e] of rateBuckets) if (now >= e.resetAt) rateBuckets.delete(k);
}, 5 * 60_000).unref();

// Extract keys from request headers — clients send their own API keys
function extractKeys(request) {
  return {
    groqKey:  request.headers['x-groq-key']  || process.env.DEFAULT_GROQ_KEY  || '',
    slezaKey: request.headers['x-sleza-key'] || process.env.DEFAULT_SLEZA_KEY || '',
  };
}


// Input validation schema
const scanBodySchema = {
  type: 'object',
  required: ['url'],
  properties: {
    url:      { type: 'string', minLength: 4, maxLength: 2048 },
    useAI:    { type: 'boolean' },
    siteType: { type: 'string', enum: ['auto', 'ecommerce', 'media', 'services', 'saas'] },
  },
};

app.post('/api/scan/single', { schema: { body: scanBodySchema } }, async (request, reply) => {
  const ip = request.ip;
  if (!checkRateLimit(ip)) {
    return reply.status(429).send({ error: 'Слишком много одновременных сканов с вашего IP. Подождите.' });
  }
  try {
    const { url, useAI = true, siteType = 'auto' } = request.body;
    if (!isSafeUrl(url)) return reply.status(400).send({ error: 'Недопустимый URL. Разрешены только публичные http/https адреса.' });
    const { groqKey, slezaKey } = extractKeys(request);

    // Return cached result if same URL was scanned recently (20 min window)
    const cached = await findCachedScan(url, siteType, useAI);
    if (cached) {
      app.log.info({ url }, 'cache hit — returning cached scan');
      return reply.send({ ...cached.result_json, uuid: cached.uuid, fromCache: true });
    }

    const result = await scanSinglePage({ url, groqKey, slezaKey, useAI, siteType });
    const uuid = randomUUID();
    await saveScan({ uuid, url, siteType, mode: 'single', useAI, result, ip });
    return reply.send({ ...result, uuid });
  } catch (err) {
    app.log.error(err);
    return reply.status(500).send({ error: String(err.message) });
  } finally {
    releaseRateLimit(ip);
  }
});

app.post('/api/scan/full', { schema: { body: scanBodySchema } }, async (request, reply) => {
  const ip = request.ip;
  if (!checkRateLimit(ip)) {
    return reply.status(429).send({ error: 'Слишком много одновременных сканов с вашего IP. Подождите.' });
  }
  try {
    const { url, useAI = true, siteType = 'auto' } = request.body;
    if (!isSafeUrl(url)) return reply.status(400).send({ error: 'Недопустимый URL. Разрешены только публичные http/https адреса.' });
    const { groqKey, slezaKey } = extractKeys(request);
    const result = await scanFullSite({
      url, groqKey, slezaKey, useAI, siteType,
      onProgress: p => app.log.info(p, 'scan progress'),
    });
    return reply.send(result);
  } catch (err) {
    app.log.error(err);
    return reply.status(500).send({ error: String(err.message) });
  } finally {
    releaseRateLimit(ip);
  }
});

// SSE endpoint for full site scan — streams progress events then final result.
// The browser opens this as a fetch with ReadableStream; no timeout issues.
app.post('/api/scan/full/stream', { schema: { body: scanBodySchema } }, async (request, reply) => {
  const ip = request.ip;
  if (!checkRateLimit(ip)) {
    return reply.status(429).send({ error: 'Слишком много одновременных сканов с вашего IP. Подождите.' });
  }

  const { url, useAI = true, siteType = 'auto' } = request.body;
  if (!isSafeUrl(url)) {
    return reply.status(400).send({ error: 'Недопустимый URL. Разрешены только публичные http/https адреса.' });
  }
  const { groqKey, slezaKey } = extractKeys(request);
  const origin = request.headers.origin || ALLOWED_ORIGINS[0];

  // Take raw control of the socket so we can stream SSE events
  reply.hijack();
  const res = reply.raw;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
  });

  const send = (data) => {
    try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch (_) {}
  };

  try {
    const result = await scanFullSite({
      url, groqKey, slezaKey, useAI, siteType,
      onProgress: (p) => send(p),
    });
    const uuid = randomUUID();
    await saveScan({ uuid, url, siteType, mode: 'full', useAI, result, ip: request.ip });
    send({ done: true, result: { ...result, uuid } });
  } catch (err) {
    app.log.error(err);
    send({ error: String(err.message) });
  } finally {
    releaseRateLimit(ip);
    res.end();
  }
});

// ── Results storage ──────────────────────────────────────────────────────────

app.get('/api/results/:uuid', async (request, reply) => {
  const { uuid } = request.params;
  if (!UUID_RE.test(uuid)) return reply.status(400).send({ error: 'Invalid UUID' });
  const record = await getScan(uuid);
  if (!record) return reply.status(404).send({ error: 'Отчёт не найден' });
  return reply.send({ uuid: record.uuid, createdAt: record.created_at, result: record.result_json });
});

// ── Leads ────────────────────────────────────────────────────────────────────

app.post('/api/leads', {
  schema: {
    body: {
      type: 'object',
      required: ['email', 'uuid'],
      properties: {
        email:   { type: 'string', maxLength: 254 },
        company: { type: ['string', 'null'], maxLength: 200 },
        uuid:    { type: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' },
      },
    },
  },
}, async (request, reply) => {
  if (!hitRateLimit(request.ip, 'leads', 5, 60_000)) {
    return reply.status(429).send({ error: 'Слишком много запросов. Попробуйте через минуту.' });
  }
  const { email, company, uuid } = request.body;

  const emailErr   = validateEmail(email);
  if (emailErr) return reply.status(400).send({ error: emailErr });

  const companyErr = validateCompany(company);
  if (companyErr) return reply.status(400).send({ error: companyErr });

  const mxErr = await validateEmailMX(email);
  if (mxErr) return reply.status(400).send({ error: mxErr });

  await saveLead({ email, company, scanUuid: uuid });
  // Fire-and-forget — don't block response if Telegram is slow
  sendLeadNotification({ email, company, scanUuid: uuid }).catch(() => {});
  return reply.send({ ok: true });
});

// ── Monitoring subscriptions ──────────────────────────────────────────────────

app.post('/api/subscribe', {
  schema: {
    body: {
      type: 'object',
      required: ['email', 'hostname'],
      properties: {
        email:     { type: 'string', maxLength: 254 },
        hostname:  { type: 'string', maxLength: 253 },
        scan_uuid: { type: 'string' },
      },
    },
  },
}, async (request, reply) => {
  if (!hitRateLimit(request.ip, 'subscribe', 5, 60_000)) {
    return reply.status(429).send({ error: 'Слишком много запросов. Попробуйте через минуту.' });
  }
  const { email, hostname, scan_uuid } = request.body;
  const emailErr = validateEmail(email);
  if (emailErr) return reply.status(400).send({ error: emailErr });
  await saveSubscription(email, hostname, scan_uuid || null);
  return reply.send({ ok: true });
});

// ── Funnel analytics ───────────────────────────────────────────────────────────

const VALID_EVENT_TYPES = new Set([
  'scan_done', 'doc_offer_shown', 'doc_offer_clicked', 'intake_opened', 'intake_submitted',
]);

// Public — frontend fires funnel steps. Fire-and-forget, always 200 (analytics must
// never break the UX). Unknown event types are silently ignored.
app.post('/api/events', {
  schema: {
    body: {
      type: 'object',
      required: ['type'],
      properties: {
        type:      { type: 'string', maxLength: 40 },
        scan_uuid: { type: ['string', 'null'], maxLength: 64 },
        hostname:  { type: ['string', 'null'], maxLength: 253 },
        utm:       { type: ['object', 'null'] },
      },
    },
  },
}, async (request, reply) => {
  const { type, scan_uuid, hostname, utm } = request.body;
  // Drop over-limit events silently — analytics must never surface an error to the UI.
  if (VALID_EVENT_TYPES.has(type) && hitRateLimit(request.ip, 'events', 60, 60_000)) {
    saveEvent({ type, scanUuid: scan_uuid || null, hostname: hostname || null, utm: utm || null }).catch(() => {});
  }
  return reply.send({ ok: true });
});

app.get('/api/admin/funnel', async (request, reply) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken || request.headers['x-admin-token'] !== adminToken) {
    return reply.status(401).send({ error: 'unauthorized' });
  }
  const days = Math.min(Number(request.query.days || 30), 90);
  const data = await getFunnel(days);
  return reply.send(data || { byType: [], bySource: [], days });
});

// ── Document-package заявка (Phase A concierge intake) ───────────────────────

const VALID_DOC_INTENTS = new Set(['doc_152_cookie']);

app.post('/api/doc-request', {
  schema: {
    body: {
      type: 'object',
      required: ['email', 'intent'],
      properties: {
        email:       { type: 'string', maxLength: 254 },
        hostname:    { type: ['string', 'null'], maxLength: 253 },
        scan_uuid:   { type: ['string', 'null'], maxLength: 64 },
        intent:      { type: 'string', maxLength: 40 },
        price_shown: { type: ['string', 'null'], maxLength: 40 },
        intake:      { type: ['object', 'null'] },
      },
    },
  },
}, async (request, reply) => {
  if (!hitRateLimit(request.ip, 'docreq', 5, 60_000)) {
    return reply.status(429).send({ error: 'Слишком много запросов. Попробуйте через минуту.' });
  }
  const { email, hostname, scan_uuid, intent, price_shown, intake } = request.body;
  const emailErr = validateEmail(email);
  if (emailErr) return reply.status(400).send({ error: emailErr });
  if (!VALID_DOC_INTENTS.has(intent)) return reply.status(400).send({ error: 'Invalid intent' });

  await saveDocRequest({
    email: email.trim(), hostname: hostname || null, scanUuid: scan_uuid || null,
    intent, priceShown: price_shown || null, intake: intake || null,
  });
  // Notify the concierge — fire-and-forget so a slow Telegram never blocks the response.
  sendTelegram(`📄 Заявка на пакет документов\nсайт: ${hostname || '—'}\nemail: ${email.trim()}\nпакет: ${intent} · ${price_shown || '—'}`).catch(() => {});
  return reply.send({ ok: true });
});

app.get('/api/admin/doc-requests', async (request, reply) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken || request.headers['x-admin-token'] !== adminToken) {
    return reply.status(401).send({ error: 'unauthorized' });
  }
  const rows = await getRecentDocRequests(Math.min(Number(request.query.limit || 20), 100));
  return reply.send(rows);
});

// "Скан дня" picker (Sprint A5) — surfaces the recent scan with the most violations
// as post material. Admin-only; the owner decides what to anonymize before posting.
app.get('/api/admin/scan-of-day', async (request, reply) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken || request.headers['x-admin-token'] !== adminToken) {
    return reply.status(401).send({ error: 'unauthorized' });
  }
  const rows = await getRecentScansRaw(7, 50);
  let best = null, bestCount = 0;
  for (const r of rows) {
    const checks = r.result_json?.aiData?.checks || [];
    const viols = checks.filter(c => c.status === 'violation');
    if (viols.length > bestCount) {
      bestCount = viols.length;
      best = {
        hostname: r.hostname,
        uuid: r.uuid,
        scannedAt: r.created_at,
        violations: viols.map(c => ({ law: c.law_code || c.law || c.id, fine: c.fine || null })),
      };
    }
  }
  return reply.send(best ? { found: true, ...best } : { found: false });
});

// ── PDF generation ───────────────────────────────────────────────────────────

// PDF is generated on-demand from Supabase data — no disk cache (safe on Railway restarts).
app.get('/api/results/:uuid/pdf', async (request, reply) => {
  const { uuid } = request.params;
  if (!UUID_RE.test(uuid)) return reply.status(400).send({ error: 'Invalid UUID' });
  const record = await getScan(uuid);
  if (!record) return reply.status(404).send({ error: 'Отчёт не найден' });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(`${FRONTEND_URL}/print?report=${uuid}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    });
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="sleza-${uuid.slice(0, 8)}.pdf"`)
      .send(pdfBuffer);
  } catch (err) {
    app.log.error(err, 'PDF generation failed');
    return reply.status(503).send({ error: 'PDF генерация не удалась, попробуйте позже' });
  } finally {
    await browser.close();
  }
});

// ── Admin smoke runner ───────────────────────────────────────────────────────

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat  = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text }),
    signal: AbortSignal.timeout(10000),
  }).catch(() => {});
}

// POST /api/admin/run-smoke
// Protected by ADMIN_TOKEN env var. Runs smoke test in background, sends Telegram on regression.
app.post('/api/admin/run-smoke', async (request, reply) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken || request.headers['x-admin-token'] !== adminToken) {
    return reply.status(401).send({ error: 'unauthorized' });
  }

  // Fire-and-forget — respond immediately, run smoke in background
  reply.send({ ok: true, message: 'Smoke test started' });

  const smokeJs = join(__dirname, '../test/smoke.js');
  const child = spawn(process.execPath, [smokeJs, '--vs-baseline', '--strict'], {
    cwd: join(__dirname, '..'),
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  child.stdout.on('data', d => { output += d; });
  child.stderr.on('data', d => { output += d; });

  child.on('close', async (code) => {
    app.log.info({ code }, 'smoke finished');
    if (code !== 0) {
      const lines = output.split('\n').filter(l => l.includes('РЕГРЕССИЯ') || l.includes('Итого')).join('\n');
      await sendTelegram(`🚨 Sleza smoke РЕГРЕССИЯ\n${new Date().toISOString()}\n\n${lines}`);
    }
  });
});

// ── Feedback ─────────────────────────────────────────────────────────────────

const VALID_CHECK_IDS = new Set(['offer', 'law149', 'law152', 'erir', 'drugs', 'cookie']);
const VALID_VERDICTS  = new Set(['confirm', 'false_positive']);

app.post('/api/feedback', {
  schema: {
    body: {
      type: 'object',
      required: ['scan_uuid', 'check_id', 'verdict'],
      properties: {
        scan_uuid: { type: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' },
        check_id:  { type: 'string' },
        verdict:   { type: 'string' },
      },
    },
  },
}, async (request, reply) => {
  const { scan_uuid, check_id, verdict } = request.body;
  if (!VALID_CHECK_IDS.has(check_id)) return reply.status(400).send({ error: 'Invalid check_id' });
  if (!VALID_VERDICTS.has(verdict))   return reply.status(400).send({ error: 'Invalid verdict' });
  const record = await getScan(scan_uuid);
  if (!record) return reply.status(404).send({ error: 'Скан не найден' });

  // Extract original issue text from scan result for D-analytics (К1 денормализация)
  const checks = record.result_json?.aiData?.checks ?? [];
  const checkData = checks.find(c => c.id === check_id);
  const issueText = checkData?._original?.issue ?? checkData?.issue ?? null;

  await saveFeedback({ scanUuid: scan_uuid, checkId: check_id, verdict, issueText });

  const hostname = record.hostname;
  if (hostname) {
    if (verdict === 'false_positive') {
      // Extract signals for verifyException
      const signals = {
        hasAdScripts: record.result_json?.aiData?.hasAdScripts ?? null,
        hasGtm:       record.result_json?.aiData?.hasGtm ?? null,
        siteType:     record.site_type ?? null,
      };
      const originalStatus = checkData?._original?.status ?? checkData?.status ?? 'violation';
      const exc = await upsertDomainException(hostname, check_id, originalStatus, signals);

      // Trigger async re-verify when threshold reached and not already verifying (К8)
      if (exc?.shouldVerify) {
        const originUrl = record.url;
        setImmediate(() => verifyException(hostname, check_id, originUrl).catch(e => {
          process.stderr.write(`[feedback] verifyException failed: ${e.message}\n`);
        }));
      }
    } else if (verdict === 'confirm') {
      await handleConfirmFeedback(hostname, check_id);
    }
  }

  return reply.status(201).send({ ok: true });
});

app.get('/api/admin/feedback-stats', async (request, reply) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken || request.headers['x-admin-token'] !== adminToken) {
    return reply.status(401).send({ error: 'unauthorized' });
  }
  const rows = await getFeedbackStats();
  return reply.send(rows);
});

app.get('/api/admin/exceptions', async (request, reply) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken || request.headers['x-admin-token'] !== adminToken) {
    return reply.status(401).send({ error: 'unauthorized' });
  }
  const rows = await getAllExceptions();
  return reply.send(rows);
});

app.post('/api/admin/exceptions/expire', async (request, reply) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken || request.headers['x-admin-token'] !== adminToken) {
    return reply.status(401).send({ error: 'unauthorized' });
  }
  const { check_id } = request.body || {};
  if (!check_id || !VALID_CHECK_IDS.has(check_id)) {
    return reply.status(400).send({ error: 'Invalid check_id' });
  }
  const count = await expireExceptionsByCheckId(check_id);
  return reply.send({ ok: true, expired: count });
});

app.get('/api/admin/patterns', async (request, reply) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken || request.headers['x-admin-token'] !== adminToken) {
    return reply.status(401).send({ error: 'unauthorized' });
  }
  const rows = await getFeedbackPatterns();
  return reply.send(rows);
});

// ── Admin analytics ──────────────────────────────────────────────────────────

// Public aggregate — scan count + top violations, no sensitive data
app.get('/api/stats', async (request, reply) => {
  const [s, violations] = await Promise.all([getScanStats(), getTopViolations()]);
  return reply.send({ scans: s?.total ?? 0, lastScanAt: s?.last_scan_at ?? null, violations });
});

app.get('/api/admin/stats', async (request, reply) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken || request.headers['x-admin-token'] !== adminToken) {
    return reply.status(401).send({ error: 'unauthorized' });
  }
  const days = Math.min(Number(request.query.days || 30), 90);
  const rows = await getCheckStats(days);
  return reply.send({ days, rows });
});

// Consent-defect stats: pre-checked checkbox + data-form-without-consent (flags inside law152).
app.get('/api/admin/consent-stats', async (request, reply) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken || request.headers['x-admin-token'] !== adminToken) {
    return reply.status(401).send({ error: 'unauthorized' });
  }
  const days = Math.min(Number(request.query.days || 90), 365);
  const stats = await getConsentStats(days);
  return reply.send({ days, ...(stats || {}) });
});

app.get('/api/admin/cases', async (request, reply) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken || request.headers['x-admin-token'] !== adminToken) {
    return reply.status(401).send({ error: 'unauthorized' });
  }
  const { check, status, days } = request.query;
  if (!check || !status) return reply.status(400).send({ error: 'check and status required' });
  const rows = await findScansWithStatus(check, status, Math.min(Number(days || 30), 90));
  return reply.send({ check, status, rows });
});

// ── Telegram webhook ──────────────────────────────────────────────────────────

app.post('/api/tg/webhook', async (request, reply) => {
  // Validate Telegram's secret token header
  const secret = getWebhookSecret();
  if (request.headers['x-telegram-bot-api-secret-token'] !== secret) {
    return reply.status(401).send({ error: 'unauthorized' });
  }
  // Process asynchronously — Telegram expects fast 200 response
  setImmediate(() => handleUpdate(request.body, { getRecentLeads, getLeadStats, getScanStats }).catch(e => {
    process.stderr.write(`[tg] handleUpdate error: ${e.message}\n`);
  }));
  return reply.status(200).send({ ok: true });
});

// v = реально задеплоенный коммит (Railway прокидывает RAILWAY_GIT_COMMIT_SHA);
// локально — короткий sha или 'dev'. Раньше тут был хардкод, который протух и вводил в заблуждение.
const DEPLOY_VERSION = (process.env.RAILWAY_GIT_COMMIT_SHA || 'dev').slice(0, 7);
app.get('/health', async () => ({ status: 'ok', time: new Date().toISOString(), v: DEPLOY_VERSION, db: dbEnabled, tg: tgEnabled() }));

const shutdown = async () => {
  await closeBrowser();
  await app.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

try {
  // Start listening first so Railway healthcheck passes immediately
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Backend running on http://localhost:${PORT}`);
  if (!process.env.ADMIN_TOKEN) {
    console.warn('[security] ADMIN_TOKEN is not set — all /api/admin/* and /api/debug/* endpoints are locked out. Set ADMIN_TOKEN in Railway env vars.');
  }
  // Init DB in background — server stays up even if Supabase is slow/unreachable
  initSchema()
    .then(() => cleanupOldScans(7))
    .then(n => { if (n > 0) console.log(`[db] cleaned up ${n} old scans`); })
    .catch(err => console.error('[db] init error:', err.message));
  // Register Telegram webhook if configured
  const backendUrl = process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : process.env.BACKEND_URL || '';
  if (backendUrl && tgEnabled()) {
    registerWebhook(backendUrl).catch(err => console.warn('[tg] webhook setup error:', err.message));
  } else if (tgEnabled()) {
    console.warn('[tg] Bot token set but RAILWAY_PUBLIC_DOMAIN / BACKEND_URL not configured — webhook not registered');
  }
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
