/**
 * Помощник: проверить токен и узнать chat id (без браузера).
 *
 * 1) Добавь в backend/.env строку:  TELEGRAM_BOT_TOKEN=<токен от @BotFather>
 * 2) Напиши своему боту в Telegram любое сообщение (например «привет»)
 * 3) Из backend:  node src/agent/tg-setup.mjs
 *    → выведет твой chat id. Добавь его в .env как TELEGRAM_CHAT_ID=...
 *
 * Если у бота висит вебхук (это ломает getUpdates), скрипт это покажет.
 * Чтобы снять вебхук (только для отдельного ТЕСТОВОГО бота!):
 *    node src/agent/tg-setup.mjs --delete-webhook
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
try { process.loadEnvFile(resolve(__dir, '../../.env')); } catch {}

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error('❌ Нет TELEGRAM_BOT_TOKEN в backend/.env. Добавь строку TELEGRAM_BOT_TOKEN=... и запусти снова.');
  process.exit(1);
}
const API = `https://api.telegram.org/bot${TOKEN}`;
const call = async (m, body) => (await fetch(`${API}/${m}`, body ? { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) } : {})).json();

// 1) токен валиден?
const me = await call('getMe');
if (!me.ok) { console.error('❌ Токен не принят Telegram:', me.description, '\nПроверь, что скопировал токен целиком от @BotFather.'); process.exit(1); }
console.log(`✅ Токен рабочий. Бот: @${me.result.username} (${me.result.first_name})`);

// 2) вебхук?
const wh = await call('getWebhookInfo');
if (wh.ok && wh.result.url) {
  console.log(`\n⚠️  У бота активен ВЕБХУК: ${wh.result.url}`);
  console.log('   Поэтому getUpdates (и ссылка в браузере) выдают ошибку 409 Conflict.');
  if (process.argv.includes('--delete-webhook')) {
    const d = await call('deleteWebhook', { drop_pending_updates: false });
    console.log(d.ok ? '   🧹 Вебхук снят — теперь getUpdates работает.' : '   ❌ Не смог снять вебхук: ' + d.description);
  } else {
    console.log('   → Если это ОТДЕЛЬНЫЙ тестовый бот — запусти: node src/agent/tg-setup.mjs --delete-webhook');
    console.log('   → Если это ПРОД-бот — лучше заведи у @BotFather новый бот для тестов, не трогая этот.');
    process.exit(0);
  }
}

// 3) chat id из обновлений
const upd = await call('getUpdates', null);
if (!upd.ok) { console.error('❌ getUpdates:', upd.description); process.exit(1); }
const chats = new Map();
for (const u of upd.result) {
  const c = u.message?.chat || u.edited_message?.chat;
  if (c) chats.set(String(c.id), `${c.first_name || ''} ${c.username ? '@'+c.username : ''} (${c.type})`.trim());
}
if (chats.size === 0) {
  console.log('\n📭 Обновлений нет. Открой бота в Telegram, напиши ему «привет», потом запусти скрипт снова.');
} else {
  console.log('\n📋 Найденные чаты (возьми свой id):');
  for (const [id, who] of chats) console.log(`   TELEGRAM_CHAT_ID=${id}   — ${who}`);
  console.log('\nДобавь нужную строку TELEGRAM_CHAT_ID=... в backend/.env и запусти бота: node src/agent/bot.mjs');
}
