/**
 * Мозг агента: берёт системный промпт из KB + короткую историю диалога → ответ.
 * Stateless по дизайну; историю хранит вызывающий (bot.mjs держит по чату).
 */
import { buildSystemPrompt } from './kb.js';
import { chat } from './llm.js';

const SYSTEM = buildSystemPrompt();

/**
 * @param {Array<{role:'user'|'assistant',content:string}>} history  последние реплики (включая текущую от user)
 * @param {string|null} scanContext  блок «РЕАЛЬНЫЙ РЕЗУЛЬТАТ СКАНА …» или null
 * @returns {Promise<string>}
 */
export async function reply(history, scanContext = null) {
  // ограничиваем историю последними 8 репликами, чтобы держать контекст компактным
  const messages = history.slice(-8);
  // реальные данные скана подаём отдельным system-блоком (если есть)
  const system = scanContext
    ? `${SYSTEM}\n\n=== ДАННЫЕ ДЛЯ ЭТОГО ОТВЕТА (отвечай строго по ним) ===\n${scanContext}`
    : SYSTEM;
  const answer = await chat({ system, messages });
  return answer || 'Извините, не смог сформулировать ответ. Могу подключить коллегу — оставьте контакт.';
}

export { SYSTEM as systemPrompt };
