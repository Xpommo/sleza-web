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
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { scanSinglePage, scanFullSite } from './scanner.js';
import { closeBrowser } from './pageContext.js';
import { initSchema, saveScan, getScan, findCachedScan, saveLead, cleanupOldScans, dbEnabled } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PDFS_DIR = join(__dirname, '../pdfs');
const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// Extract just the URL in case the env var was accidentally set as "FRONTEND_URL = https://..."
const FRONTEND_URL = (() => {
  const raw = process.env.FRONTEND_URL || 'http://localhost:3000';
  const m = raw.match(/https?:\/\/[^\s]+/);
  return m ? m[0].replace(/\/$/, '') : 'http://localhost:3000';
})();

if (!existsSync(PDFS_DIR)) mkdirSync(PDFS_DIR, { recursive: true });

const PORT = Number(process.env.PORT) || 3001;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',').map(o => o.trim()).filter(Boolean);

const app = Fastify({ logger: true });

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

// ── Debug: show what links Playwright finds on a page ────────────────────────
app.get('/api/debug/links', async (request, reply) => {
  const { url } = request.query;
  if (!url) return reply.status(400).send({ error: 'url required' });
  const { buildPageContext } = await import('./pageContext.js');
  const ctx = await buildPageContext(url);
  return reply.send({
    policyLinks: ctx.policyLinks,
    offerLinks:  ctx.offerLinks,
    aboutLinks:  ctx.aboutLinks,
    returnLinks: ctx.returnLinks,
    totalLinks:  ctx.links?.length,
    hasCookieBanner: ctx.hasCookieBanner,
    hasAdScripts:    ctx.hasAdScripts,
  });
});

// ── Results storage ──────────────────────────────────────────────────────────

// Explicit save endpoint (for backward compat — scan endpoints now auto-save)
app.post('/api/results', async (request, reply) => {
  const { result } = request.body || {};
  if (!result || typeof result !== 'object') return reply.status(400).send({ error: 'result required' });
  // If result already has a uuid (from scan endpoint), reuse it
  const uuid = result.uuid || randomUUID();
  if (!result.uuid) {
    const url = result.url || result.hostname || 'unknown';
    await saveScan({ uuid, url, mode: result.mode || 'single', result });
  }
  return reply.send({ uuid });
});

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
      required: ['email', 'company', 'uuid'],
      properties: {
        email:   { type: 'string', maxLength: 254 },
        company: { type: 'string', maxLength: 200 },
        uuid:    { type: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' },
      },
    },
  },
}, async (request, reply) => {
  const { email, company, uuid } = request.body;
  await saveLead({ email, company, scanUuid: uuid });
  return reply.send({ ok: true });
});

// ── PDF generation ───────────────────────────────────────────────────────────

app.get('/api/results/:uuid/pdf', async (request, reply) => {
  const { uuid } = request.params;
  if (!UUID_RE.test(uuid)) return reply.status(400).send({ error: 'Invalid UUID' });
  const record = await getScan(uuid);
  if (!record) return reply.status(404).send({ error: 'Отчёт не найден' });

  const pdfFile = join(PDFS_DIR, `${uuid}.pdf`);
  if (!existsSync(pdfFile)) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
      // Use /print page — clean full report without UI chrome (form, buttons, landing)
      await page.goto(`${FRONTEND_URL}/print?report=${uuid}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1500);
      await page.pdf({
        path: pdfFile,
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      });
    } finally {
      await browser.close();
    }
  }

  return reply
    .header('Content-Type', 'application/pdf')
    .header('Content-Disposition', `attachment; filename="sleza-${uuid.slice(0, 8)}.pdf"`)
    .send(readFileSync(pdfFile));
});

app.get('/health', async () => ({ status: 'ok', time: new Date().toISOString(), v: 'r3-pdf-fallback' }));

const shutdown = async () => {
  await closeBrowser();
  await app.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

try {
  await initSchema();
  // Clean up scans older than 7 days on startup
  cleanupOldScans(7).then(n => { if (n > 0) console.log(`[db] cleaned up ${n} old scans`); }).catch(() => {});
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Backend running on http://localhost:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
