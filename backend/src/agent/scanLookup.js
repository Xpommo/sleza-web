/**
 * Подтягивает РЕАЛЬНЫЙ результат скана из БД, чтобы агент не выдумывал находки.
 * Read-only. Соединение ленивое, переиспользуется.
 */
import postgres from 'postgres';

let sql = null;
function db() {
  if (sql) return sql;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  sql = postgres(url, { ssl: 'require', max: 1, idle_timeout: 20 });
  return sql;
}

const STATUS_RU = {
  ok: 'соответствует ✅',
  pass: 'соответствует ✅',
  risk: 'риск ⚠️',
  warning: 'риск ⚠️',
  violation: 'нарушение ❌',
  fail: 'нарушение ❌',
};

/** Находит домен/URL в тексте. Возвращает hostname (без www) или null. */
export function extractHostname(text) {
  if (!text) return null;
  const m = text.match(/\b((?:https?:\/\/)?(?:[a-z0-9][a-z0-9-]*\.)+[a-z]{2,})(?:\/[^\s]*)?/i);
  if (!m) return null;
  let host = m[1].replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
  host = host.replace(/^www\./, '').replace(/[.,;:!?)]+$/, '');
  return host || null;
}

/** Приводит сырой result_json к компактной форме скана. */
export function normalizeScan(rj, fallbackHost, when) {
  rj = rj || {};
  const checks = (rj.aiData?.checks || rj.checks || []).map(c => ({
    id: c.id, law: c.law, status: c.status, issue: c.issue, action: c.action, fine: c.fine,
  }));
  return {
    hostname: rj.hostname || fallbackHost || null,
    scannedAt: when || rj.scannedAt || new Date().toISOString(),
    confidence: rj.confidence,
    partial: !!(rj.fallback || rj.firewalled || rj.blocked403),
    checks,
  };
}

/** Скан по uuid — основа модели владения (клиент приходит со своей ссылкой). null если нет. */
export async function getScanByUuid(uuid) {
  const conn = db();
  if (!conn || !uuid) return null;
  const rows = await conn`SELECT uuid, hostname, created_at, result_json FROM scans WHERE uuid = ${uuid} LIMIT 1`;
  if (!rows.length) return null;
  const r = rows[0];
  return { uuid: r.uuid, ...normalizeScan(r.result_json, r.hostname, r.created_at) };
}

/** Компактный блок реальных данных для промпта LLM. */
export function formatScanContext(scan) {
  if (!scan) return null;
  const when = new Date(scan.scannedAt).toLocaleDateString('ru-RU');
  const lines = scan.checks.map(c => {
    const st = STATUS_RU[c.status] || c.status || '?';
    const note = (c.status !== 'ok' && c.status !== 'pass' && c.issue) ? ` — ${c.issue}` : '';
    return `  • ${c.law}: ${st}${note}`;
  });
  const caveat = scan.partial
    ? '\n  ВНИМАНИЕ: скан был частичным (сайт блокировал доступ/firewall) — данные могут быть неполными, предупреди об этом.'
    : '';
  return `РЕАЛЬНЫЙ РЕЗУЛЬТАТ СКАНА ${scan.hostname} (проверено ${when}):\n${lines.join('\n')}${caveat}`;
}

export async function closeDb() { if (sql) { await sql.end({ timeout: 5 }); sql = null; } }
