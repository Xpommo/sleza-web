/**
 * Воронка ведения (Ступени 0–4). Рендерит {text, keyboard} из РЕАЛЬНЫХ данных скана.
 * Детерминированно, без LLM. Текст — Telegram HTML (parse_mode:'HTML' ставит bot.mjs).
 */
const SCANNER_URL = process.env.SCANNER_URL || 'https://fonarik-web.vercel.app';
const ICON = { ok: '✅', pass: '✅', risk: '⚠️', warning: '⚠️', violation: '❌', fail: '❌' };
const isProblem = c => c.status && !['ok', 'pass'].includes(c.status);
const kb = rows => ({ inline_keyboard: rows });
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const reportBtn = uuid => uuid
  ? [{ text: '📊 Полный отчёт на сайте', url: `${SCANNER_URL}?report=${uuid}` }]
  : [];

// Ступень 0 — карточка-итог
export function summaryCard(scan) {
  if (!scan.checks?.length) {
    return {
      text: `Не удалось прочитать <b>${esc(scan.hostname)}</b> — сайт ограничивал доступ.\n\nДавайте перепроверим или подключу коллегу.`,
      keyboard: kb([[{ text: '📞 Специалист', callback_data: 'f:human' }]]),
    };
  }
  let ok = 0, warn = 0, bad = 0;
  for (const c of scan.checks) {
    if (['ok', 'pass'].includes(c.status)) ok++;
    else if (['violation', 'fail'].includes(c.status)) bad++;
    else warn++;
  }
  const problems = scan.checks.filter(isProblem);
  const partial = scan.partial ? '\n⚡️ <i>Проверка частичная — сайт ограничивал доступ</i>' : '';

  const headline = problems.length
    ? `Внимания требуют: ${problems.slice(0, 3).map(c => `<b>${esc(c.law)}</b>`).join(', ')}.`
    : 'Серьёзных проблем нет — сайт в хорошей форме 👍';

  const text = `📋 <b>${esc(scan.hostname)}</b>${partial}\n\n` +
    `✅ <b>${ok}</b> ок  ·  ⚠️ <b>${warn}</b> риск  ·  ❌ <b>${bad}</b> нарушения\n\n` +
    `${headline}\n\n` +
    '<i>Автоматическая проверка — разберём и подскажу, как закрыть.</i>';

  const rBtn = reportBtn(scan.uuid);
  const rows = problems.length
    ? [
        ...(rBtn.length ? [rBtn] : []),
        [{ text: '🔎 Разобрать по порядку', callback_data: 'f:walk' }],
        [{ text: '❓ Чем грозит', callback_data: 'f:risks' }, { text: '📞 Специалист', callback_data: 'f:human' }],
      ]
    : [
        ...(rBtn.length ? [rBtn] : []),
        [{ text: '❓ Задать вопрос', callback_data: 'f:ask' }],
        [{ text: '📞 Специалист', callback_data: 'f:human' }],
      ];
  return { text, keyboard: kb(rows) };
}

// Ступень 1 — одна находка
export function findingCard(scan, idx = 0) {
  const problems = scan.checks.filter(isProblem);
  if (idx >= problems.length) return null;
  const c = problems[idx];
  const icon = ICON[c.status] || '⚠️';
  const fine = c.fine
    ? `\n\n💰 <b>Санкция:</b> <code>${esc(c.fine)}</code>\n<i>На практике РКН часто сначала выносит предписание.</i>`
    : '';
  const text = `${icon} <b>${esc(c.law)}</b>  <code>${idx + 1}/${problems.length}</code>\n\n` +
    `${esc(c.issue || '')}${fine}`;

  const last = idx === problems.length - 1;
  const back = idx > 0
    ? { text: '⬅️ Назад', callback_data: `f:walk:${idx - 1}` }
    : { text: '⬅️ К итогу', callback_data: 'f:card' };
  const fwd = last
    ? { text: '✅ Готово', callback_data: 'f:done' }
    : { text: '➡️ Дальше', callback_data: `f:walk:${idx + 1}` };
  return {
    text,
    keyboard: kb([
      [{ text: '🛠 Как закрыть', callback_data: `f:fix:${idx}` }],
      [back, fwd],
      [{ text: '❌ Это не так', callback_data: `f:nm:${idx}` }],
    ]),
  };
}

// Ступень 2 — как закрыть + контраст
export function fixCard(scan, idx = 0) {
  const problems = scan.checks.filter(isProblem);
  const c = problems[idx];
  if (!c) return null;
  const text = `🛠 <b>Как закрыть «${esc(c.law)}»</b>\n\n` +
    `${esc(c.action || '—')}\n\n` +
    '<i>Сделать можно самому — несколько часов, легко ошибиться в формулировках. ' +
    'Либо мы подготовим под ваш сайт по данным проверки.</i>';
  return {
    text,
    keyboard: kb([
      [{ text: '📄 Подготовьте за меня', callback_data: 'f:docs' }],
      [{ text: '⬅️ К находке', callback_data: `f:walk:${idx}` }, { text: '➡️ Дальше', callback_data: `f:walk:${idx + 1}` }],
      [{ text: '📞 Специалист', callback_data: 'f:human' }],
    ]),
  };
}

// Обзор рисков
export function risksCard(scan) {
  const problems = scan.checks.filter(isProblem);
  if (!problems.length) {
    return {
      text: '✅ <b>Серьёзных рисков нет</b> — сайт в хорошей форме 👍',
      keyboard: kb([[{ text: '📞 Специалист', callback_data: 'f:human' }]]),
    };
  }
  const lines = problems.map(c => {
    const icon = ICON[c.status] || '⚠️';
    const fine = c.fine ? ` — <code>${esc(c.fine)}</code>` : '';
    return `${icon} <b>${esc(c.law)}</b>${fine}`;
  });
  const text = `⚡️ <b>Чем грозит</b> <i>(максимальные санкции)</i>\n\n` +
    lines.join('\n') +
    '\n\n<i>На практике РКН часто сначала выносит предписание.</i>';

  const rBtn = reportBtn(scan.uuid);
  return {
    text,
    keyboard: kb([
      ...(rBtn.length ? [rBtn] : []),
      [{ text: '🔎 Разобрать по порядку', callback_data: 'f:walk' }],
      [{ text: '📄 Подготовьте за меня', callback_data: 'f:docs' }, { text: '📞 Специалист', callback_data: 'f:human' }],
      [{ text: '⬅️ К итогу', callback_data: 'f:card' }],
    ]),
  };
}

// Ступень 3 — контраст + CTA
export function docsCard(scan) {
  const problems = scan.checks.filter(isProblem).map(c => `<b>${esc(c.law)}</b>`);
  const text = `📄 <b>Что подготовим под ${esc(scan.hostname)}</b>\n\n` +
    `${problems.join(', ') || 'пакет документов под ваш сайт'}.\n\n` +
    'Юрист — <code>30–200 тыс. ₽</code> и неделя анкет.\n' +
    'У нас данные уже из проверки — заполнять ничего не надо, быстро и в разы дешевле.\n\n' +
    '<i>Сейчас мы в бете — берём льготно.</i>';
  return {
    text,
    keyboard: kb([
      [{ text: '✅ Хочу — подключите специалиста', callback_data: 'f:human' }],
      [{ text: '⬅️ К находкам', callback_data: 'f:walk' }],
    ]),
  };
}

// Финиш — все находки пройдены
export function doneCard(scan) {
  const rBtn = scan?.uuid ? reportBtn(scan.uuid) : [];
  return {
    text: '✅ <b>Все находки разобрали.</b>\n\nЧто дальше?',
    keyboard: kb([
      ...(rBtn.length ? [rBtn] : []),
      [{ text: '📄 Подготовьте документы', callback_data: 'f:docs' }],
      [{ text: '📞 Специалист', callback_data: 'f:human' }],
      [{ text: '⬅️ К итогу', callback_data: 'f:card' }],
    ]),
  };
}

export { isProblem, esc };
