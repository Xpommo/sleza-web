/**
 * Простое файловое хранилище сессий бота (локально, без записи в прод-БД).
 * Переживает перезапуск бота: привязанные сайты и активный сайт сохраняются.
 * Для прода позже заменить на таблицу chat_links в БД (нужно write-разрешение).
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../../.agent-sessions.json');

export function loadStore() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; }
}

let timer = null, pending = null;
export function saveStore(obj) {
  pending = obj;
  if (timer) return;
  timer = setTimeout(() => {
    try { fs.writeFileSync(FILE, JSON.stringify(pending)); } catch (e) { console.error('[store] save:', e.message); }
    timer = null;
  }, 500);
}
