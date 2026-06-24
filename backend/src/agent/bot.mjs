/**
 * Локальный long-poll для разработки. Прод использует webhook через server.js.
 *
 * Запуск: cd backend && node src/agent/bot.mjs
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
try { process.loadEnvFile(resolve(__dir, '../../.env')); } catch {}

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) { console.error('❌ Нет TELEGRAM_BOT_TOKEN в backend/.env'); process.exit(1); }

const { handleMessage, handleCallback } = await import('./handler.js');
const { llmProvider } = await import('./llm.js');

const API = `https://api.telegram.org/bot${TOKEN}`;
const tg = async (method, body) => {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return res.json();
};

let offset = 0, stop = false;
process.on('SIGINT', () => { stop = true; console.log('\n👋 Останавливаюсь…'); });
console.log(`✅ Бот запущен (мозг: ${llmProvider()}). Ctrl+C — стоп.`);

while (!stop) {
  try {
    const r = await tg('getUpdates', { offset, timeout: 30, allowed_updates: ['message', 'callback_query'] });
    if (r?.result?.length) {
      for (const u of r.result) {
        offset = u.update_id + 1;
        if (u.message) await handleMessage(u.message).catch(e => console.error('msg:', e.message));
        else if (u.callback_query) await handleCallback(u.callback_query).catch(e => console.error('cb:', e.message));
      }
    }
  } catch (e) { console.error('[poll]', e.message); }
}
