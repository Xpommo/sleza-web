/**
 * Agent bot handler — ядро бота Фонарик.
 * Импортируется из server.js (webhook, прод) и bot.mjs (long-poll, локальная разработка).
 */
import { reply as llmReply } from './agent.js';
import { extractHostname, getScanByUuid, formatScanContext } from './scanLookup.js';
import { summaryCard, findingCard, fixCard, risksCard, docsCard, doneCard, isProblem, esc } from './funnel.js';
import { loadStore, saveStore } from './store.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID ? String(process.env.TELEGRAM_CHAT_ID) : '';
const SCANNER_URL = process.env.SCANNER_URL || 'https://fonarik-web.vercel.app';
const API = TOKEN ? `https://api.telegram.org/bot${TOKEN}` : '';

async function tg(method, body) {
  if (!API) return null;
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

const send = (chatId, text) =>
  tg('sendMessage', { chat_id: chatId, text, disable_web_page_preview: true });

const sendHtml = (chatId, text, reply_markup) =>
  tg('sendMessage', {
    chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true,
    ...(reply_markup ? { reply_markup } : {}),
  });

const sendCard = (chatId, card) =>
  sendHtml(chatId, card.text, card.keyboard);

const sendSitePicker = (chatId, hosts, prompt = 'Про какой сайт? Выберите 👇') =>
  sendHtml(chatId, prompt, { inline_keyboard: hosts.map(h => [{ text: h, callback_data: 'site:' + h }]) });

const sendScanInvite = (chatId, prefix) =>
  sendHtml(chatId,
    `${prefix}\n\nПосле проверки нажмите «Обсудить в Telegram» или пришлите ссылку на отчёт.`,
    { inline_keyboard: [[{ text: '🔍 Проверить сайт', url: SCANNER_URL }]] },
  );

// ── Сессии ──
const sessions = new Map();
function getSession(id) {
  if (!sessions.has(id)) sessions.set(id, { history: [], owned: new Map(), activeHost: null });
  return sessions.get(id);
}
try {
  for (const [id, data] of Object.entries(loadStore())) {
    sessions.set(id, { history: [], owned: new Map(Object.entries(data.owned || {})), activeHost: data.activeHost || null });
  }
} catch { /* fresh start */ }

function persist() {
  const obj = {};
  for (const [id, s] of sessions) if (s.owned.size) obj[id] = { owned: Object.fromEntries(s.owned), activeHost: s.activeHost || null };
  saveStore(obj);
}

// ── Специалист: relay ──
const activeChats = new Map();
const replyButton = (chatId, who) => ({ inline_keyboard: [[{ text: '↩️ Ответить ' + who, callback_data: 'reply:' + chatId }]] });
const clientChatKb = { inline_keyboard: [[{ text: '🤖 Вернуться к боту', callback_data: 'f:bot' }]] };
const sendToClient = (target, text) =>
  sendHtml(target, `👨‍💼 <b>Специалист:</b> ${esc(text)}`, clientChatKb);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const logEvent = (type, host) => console.log(`[agent] ${type}${host ? ' · ' + host : ''}`);
const kbi = rows => ({ inline_keyboard: rows });

// ── Обработка сообщений ──
export async function handleMessage(msg) {
  const text = msg?.text?.trim();
  const chatId = String(msg.chat.id);
  if (!text) return;

  if (process.env.AGENT_ADMIN_ONLY === '1' && CHAT_ID && chatId !== CHAT_ID) {
    await send(chatId, '⛔ Доступ ограничен.');
    return;
  }

  const sess = getSession(chatId);
  const [cmd, ...args] = text.split(/\s+/);

  if (cmd === '/start' || cmd === '/help') {
    if (args[0] && UUID_RE.test(args[0])) {
      try {
        const scan = await getScanByUuid(args[0]);
        if (scan?.hostname) {
          sess.owned.set(scan.hostname, scan);
          sess.activeHost = scan.hostname;
          persist();
          logEvent('bot_summary_shown', scan.hostname);
          await sendHtml(chatId, '👋 <b>Фонарик</b> — помогу разобраться с проверкой и подскажу, как закрыть найденное.');
          await sendCard(chatId, summaryCard(scan));
          return;
        }
      } catch (e) { console.error('[start] uuid:', e.message); }
      await sendScanInvite(chatId, 'Не нашёл отчёт по этой ссылке.');
      return;
    }
    await sendHtml(chatId,
      '👋 <b>Фонарик</b> — подсвечиваю нарушения на сайтах\n\n' +
      'Я отвечаю по <b>вашему</b> отчёту. Если отчёта ещё нет — проверьте сайт 👇\n\n' +
      '<code>/mine</code> — ваши сайты  ·  <code>/reset</code> — сбросить диалог',
      { inline_keyboard: [[{ text: '🔍 Проверить сайт', url: SCANNER_URL }]] },
    );
    return;
  }

  if (cmd === '/reset') {
    sess.history = []; sess.activeHost = null;
    await sendHtml(chatId, '🧹 <b>Диалог очищен</b> <i>(проверенные сайты сохранены)</i>');
    return;
  }

  if (cmd === '/mine' || cmd === '/sites') {
    const hosts = [...sess.owned.keys()];
    if (!hosts.length) { await sendScanInvite(chatId, 'Пока нет проверенных сайтов.'); return; }
    await sendSitePicker(chatId, hosts, '📋 <b>Ваши сайты</b> — выберите 👇');
    return;
  }

  if (cmd === '/scan') {
    await sendScanInvite(chatId, 'Проверки делаем на основном сканере — там точнее.');
    return;
  }

  const isAdmin = CHAT_ID && chatId === CHAT_ID;

  if (cmd === '/chats' && isAdmin) {
    const rows = [...activeChats.entries()].map(([id, info]) =>
      [{ text: `↩️ ${info.who || 'chat ' + id}${info.host ? ' · ' + info.host : ''}`, callback_data: 'reply:' + id }],
    );
    if (!rows.length) await send(chatId, 'Активных диалогов нет.');
    else await sendHtml(chatId, '💬 <b>Кому ответить?</b>', { inline_keyboard: rows });
    return;
  }

  if (cmd === '/reply' && isAdmin) {
    const target = args[0]; const m = args.slice(1).join(' ');
    if (!target || !m) { await send(chatId, '/chats → кнопка «Ответить». Либо /reply <chatId> текст'); return; }
    await sendToClient(target, m);
    await send(chatId, '✓ отправлено');
    return;
  }

  if (cmd === '/bot') { sess.humanMode = false; await sendHtml(chatId, '🤖 <b>Вернулись к боту.</b> Спрашивайте по сайту или <code>/mine</code>'); return; }

  if (isAdmin && sess.awaitingReplyTo && !text.startsWith('/')) {
    const target = sess.awaitingReplyTo; sess.awaitingReplyTo = null;
    await sendToClient(target, text);
    await send(chatId, `✓ → ${activeChats.get(target)?.who || 'chat ' + target}`);
    return;
  }

  if (sess.humanMode) {
    const u = msg.from || {};
    const who = u.username ? '@' + u.username : (u.first_name || 'клиент');
    activeChats.set(chatId, { who, host: sess.activeHost });
    if (CHAT_ID) {
      await sendHtml(CHAT_ID, `💬 <b>${esc(who)}</b>: ${esc(text)}`, replyButton(chatId, who));
    }
    await sendHtml(chatId, '✓ <i>отправлено специалисту</i>', clientChatKb);
    return;
  }

  const host = extractHostname(text);
  if (host && sess.owned.has(host)) sess.activeHost = host;

  if (host && !sess.owned.has(host)) {
    await sendScanInvite(chatId, `Сайт <b>${esc(host)}</b> вы у нас не проверяли.`);
    return;
  }

  if (!host && sess.owned.size > 1 && !sess.activeHost) {
    await sendSitePicker(chatId, [...sess.owned.keys()]);
    return;
  }

  sess.history.push({ role: 'user', content: text });
  await tg('sendChatAction', { chat_id: chatId, action: 'typing' });

  let scanContext = null;
  if (host && sess.owned.has(host)) {
    scanContext = formatScanContext(sess.owned.get(host));
  } else if (sess.activeHost && sess.owned.has(sess.activeHost)) {
    scanContext = formatScanContext(sess.owned.get(sess.activeHost));
  } else if (sess.owned.size === 1) {
    sess.activeHost = [...sess.owned.keys()][0];
    scanContext = formatScanContext(sess.owned.get(sess.activeHost));
  }

  try {
    const answer = await llmReply(sess.history, scanContext);
    sess.history.push({ role: 'assistant', content: answer });
    if (sess.history.length > 16) sess.history.splice(0, sess.history.length - 16);
    await send(chatId, answer);
  } catch (e) {
    console.error('[agent] ошибка:', e.message);
    await send(chatId, '⚠️ Техническая заминка — попробуйте ещё раз.');
  }
}

// ── Колбэки кнопок ──
export async function handleCallback(cb) {
  const chatId = String(cb.message.chat.id);
  await tg('answerCallbackQuery', { callback_query_id: cb.id });
  if (process.env.AGENT_ADMIN_ONLY === '1' && CHAT_ID && chatId !== CHAT_ID) return;
  const sess = getSession(chatId);
  const data = cb.data || '';

  if (data.startsWith('reply:')) {
    if (!(CHAT_ID && chatId === CHAT_ID)) return;
    const target = data.slice(6);
    sess.awaitingReplyTo = target;
    const info = activeChats.get(target);
    await sendHtml(chatId, `✍️ Напишите ответ для <b>${esc(info?.who || 'chat ' + target)}</b>`);
    return;
  }

  if (data.startsWith('site:')) {
    const host = data.slice(5);
    if (!sess.owned.has(host)) { await send(chatId, 'Сайт не привязан. /sites'); return; }
    sess.activeHost = host;
    persist();
    await sendCard(chatId, summaryCard(sess.owned.get(host)));
    return;
  }

  if (!data.startsWith('f:')) return;
  const [, action, rawIdx] = data.split(':');
  const idx = rawIdx != null ? Number(rawIdx) : 0;
  const scan = sess.activeHost ? sess.owned.get(sess.activeHost) : null;

  if (action === 'human') {
    sess.humanMode = true;
    const u = cb.from || {};
    const who = u.username ? '@' + u.username : (u.first_name || 'клиент');
    activeChats.set(chatId, { who, host: sess.activeHost });
    logEvent('handoff', sess.activeHost);
    const selfTest = chatId === CHAT_ID ? '\n<i>(тест: вы здесь и клиент, и специалист)</i>' : '';
    if (CHAT_ID) {
      await sendHtml(CHAT_ID,
        `🔔 <b>Запрос на специалиста</b>\n\nКлиент: <b>${esc(who)}</b>\nСайт: <code>${esc(sess.activeHost || '—')}</code>${selfTest}`,
        replyButton(chatId, who),
      );
    }
    await sendCard(chatId, {
      text: '👨‍💼 <b>Вы на связи со специалистом.</b>\n\nПишите сюда — ответы придут в этот чат.',
      keyboard: clientChatKb,
    });
    return;
  }

  if (action === 'bot') {
    const was = sess.humanMode; sess.humanMode = false;
    if (was) {
      const info = activeChats.get(chatId); activeChats.delete(chatId);
      if (CHAT_ID && chatId !== CHAT_ID) await send(CHAT_ID, `ℹ️ ${info?.who || 'chat ' + chatId} вернулся к боту.`);
    }
    await sendHtml(chatId, '🤖 <b>Вернулись к боту.</b> Спрашивайте по сайту или <code>/mine</code>');
    return;
  }

  if (action === 'ask') {
    await sendHtml(chatId, 'Напишите вопрос — отвечу по вашему отчёту.');
    return;
  }

  if (!scan) {
    const hosts = [...sess.owned.keys()];
    if (hosts.length) await sendSitePicker(chatId, hosts, 'По какому сайту? 👇');
    else await sendScanInvite(chatId, 'Проверьте сайт на сканере — потом разберём вместе.');
    return;
  }
  logEvent('f:' + action, sess.activeHost);

  if (action === 'card') { await sendCard(chatId, summaryCard(scan)); return; }
  if (action === 'walk') { await sendCard(chatId, findingCard(scan, idx) || doneCard(scan)); return; }
  if (action === 'fix') { await sendCard(chatId, fixCard(scan, idx) || doneCard(scan)); return; }
  if (action === 'risks') { await sendCard(chatId, risksCard(scan)); return; }
  if (action === 'docs') { await sendCard(chatId, docsCard(scan)); return; }
  if (action === 'done') { await sendCard(chatId, doneCard(scan)); return; }
  if (action === 'nm') {
    const c = scan.checks.filter(isProblem)[idx];
    logEvent('feedback_dispute', `${sess.activeHost}/${c?.id || c?.law}`);
    await sendCard(chatId, {
      text: `Понял, спасибо — отметил по «<b>${esc(c?.law || 'этой проверке')}</b>». Передать коллеге для ручной проверки?`,
      keyboard: kbi([[{ text: '📞 Да, специалисту', callback_data: 'f:human' }], [{ text: '➡️ Дальше', callback_data: `f:walk:${idx + 1}` }]]),
    });
    return;
  }
}
