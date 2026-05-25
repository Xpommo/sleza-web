/**
 * Telegram Bot — lead notifications + admin commands.
 *
 * Setup (one-time):
 *   1. Open @BotFather in Telegram → /newbot → get TOKEN
 *   2. Send /start to your new bot
 *   3. GET https://api.telegram.org/bot{TOKEN}/getUpdates → find "chat":{"id":...}
 *   4. In Railway Variables set:
 *        TELEGRAM_BOT_TOKEN=<token from BotFather>
 *        TELEGRAM_CHAT_ID=<your chat id from step 3>
 *
 * Commands:
 *   /stats   — leads + scans stats (24h / 7d / total)
 *   /leads   — last 5 leads
 *   /leads N — last N leads (max 20)
 */

const TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID  = process.env.TELEGRAM_CHAT_ID;
const FRONTEND = (process.env.FRONTEND_URL || 'https://sleza-web.vercel.app').replace(/\/$/, '');

export function tgEnabled() {
  return !!(TOKEN && CHAT_ID);
}

async function callApi(method, body) {
  if (!TOKEN) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    return res.json();
  } catch (e) {
    console.warn(`[tg] API call ${method} failed:`, e.message);
    return null;
  }
}

export async function sendMessage(text) {
  if (!tgEnabled()) return;
  return callApi('sendMessage', { chat_id: CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true });
}

export async function sendLeadNotification({ email, company, scanUuid }) {
  const reportUrl = scanUuid ? `${FRONTEND}/?report=${scanUuid}` : null;
  const lines = [
    '🔔 <b>Новый лид!</b>',
    '',
    `📧 ${escHtml(email)}`,
    `🏢 ${escHtml(company)}`,
  ];
  if (reportUrl) lines.push(`🔗 <a href="${reportUrl}">Открыть отчёт</a>`);
  lines.push('', `⏰ ${ruDateTime()}`);
  return sendMessage(lines.join('\n'));
}

// ── Webhook setup ─────────────────────────────────────────────────────────────

export function getWebhookSecret() {
  if (process.env.TELEGRAM_WEBHOOK_SECRET) return process.env.TELEGRAM_WEBHOOK_SECRET;
  // Derive from token so no extra env var is required
  return TOKEN ? TOKEN.split(':')[1]?.slice(0, 32) ?? 'sleza-tg-secret' : 'sleza-tg-secret';
}

export async function registerWebhook(backendUrl) {
  if (!tgEnabled()) return;
  const url    = `${backendUrl.replace(/\/$/, '')}/api/tg/webhook`;
  const secret = getWebhookSecret();
  const result = await callApi('setWebhook', {
    url,
    secret_token:     secret,
    allowed_updates:  ['message'],
    drop_pending_updates: true,
  });
  if (result?.ok) {
    console.log(`[tg] webhook registered → ${url}`);
  } else {
    console.warn('[tg] webhook registration failed:', result?.description);
  }
}

// ── Command handler ───────────────────────────────────────────────────────────

export async function handleUpdate(update, db) {
  const msg = update?.message;
  if (!msg?.text) return;

  const fromChat = String(msg.chat.id);

  // Only the configured admin chat can run commands
  if (String(CHAT_ID) !== fromChat) {
    await callApi('sendMessage', { chat_id: fromChat, text: '⛔ Доступ запрещён.' });
    return;
  }

  const [cmd, ...args] = msg.text.trim().split(/\s+/);

  if (cmd === '/start' || cmd === '/help') {
    await sendMessage([
      '👋 <b>Sleza Admin Bot</b>',
      '',
      'Команды:',
      '/stats — статистика лидов и сканов',
      '/leads — последние 5 лидов',
      '/leads 10 — последние N лидов (макс. 20)',
    ].join('\n'));

  } else if (cmd === '/stats') {
    const [ls, ss] = await Promise.all([db.getLeadStats(), db.getScanStats()]);
    await sendMessage([
      '📊 <b>Статистика</b>',
      '',
      '<b>Лиды:</b>',
      `  Всего: ${ls?.total ?? '—'}`,
      `  За 7 дней: ${ls?.last_7_days ?? '—'}`,
      `  За 24 часа: ${ls?.last_24h ?? '—'}`,
      '',
      '<b>Сканы:</b>',
      `  Всего: ${ss?.total ?? '—'}`,
      `  За 7 дней: ${ss?.last_7_days ?? '—'}`,
      `  За 24 часа: ${ss?.last_24h ?? '—'}`,
    ].join('\n'));

  } else if (cmd === '/leads') {
    const limit = Math.min(Number(args[0]) || 5, 20);
    const leads = await db.getRecentLeads(limit);
    if (!leads.length) {
      await sendMessage('📭 Лидов пока нет.');
      return;
    }
    const lines = [`📋 <b>Последние ${leads.length} лидов:</b>`, ''];
    for (const l of leads) {
      const dt = ruDateTime(l.created_at);
      lines.push(`${dt} — ${escHtml(l.email)} / ${escHtml(l.company)}`);
    }
    await sendMessage(lines.join('\n'));
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function ruDateTime(date) {
  return new Date(date || Date.now()).toLocaleString('ru-RU', {
    timeZone:  'Europe/Moscow',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}
