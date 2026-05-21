/**
 * Smoke test — запускает single-scan для каждого URL из test-urls.txt
 * и выводит таблицу статусов проверок.
 *
 * Использование:
 *   node backend/test/smoke.js              # без AI (быстрее)
 *   node backend/test/smoke.js --ai         # с AI (нужен DEFAULT_GROQ_KEY в .env)
 *   node backend/test/smoke.js --diff       # сравнить с предыдущим baseline
 *
 * Подавить диагностику скрипта (stderr):
 *   node backend/test/smoke.js 2>/dev/null
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const RESULTS   = join(__dirname, 'results');

// --- Load .env manually ---
function loadEnv() {
  const p = join(ROOT, '.env');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (k && !process.env[k]) process.env[k] = v;
  }
}
loadEnv();

const USE_AI = process.argv.includes('--ai');
const DIFF   = process.argv.includes('--diff');
const GROQ   = process.env.DEFAULT_GROQ_KEY || '';
const SLEZA  = process.env.DEFAULT_SLEZA_KEY || '';

// --- Read test URLs ---
function readUrls() {
  const path = join(ROOT, 'test-urls.txt');
  if (!existsSync(path)) {
    console.error('Нет файла backend/test-urls.txt — добавь URL и запусти снова.');
    process.exit(1);
  }
  const entries = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const parts = t.split(/\s+/);
    if (parts.length >= 2 && parts[1].startsWith('http')) {
      // format: <displayType> <url> [siteType]
      entries.push({ type: parts[0], url: parts[1], siteType: parts[2] || 'auto' });
    } else if (parts[0].startsWith('http')) {
      entries.push({ type: 'unknown', url: parts[0], siteType: 'auto' });
    }
  }
  if (entries.length === 0) {
    console.error('test-urls.txt пустой — добавь URL в формате: shop https://...');
    process.exit(1);
  }
  return entries;
}

// --- Import scanner ---
const { scanSinglePage } = await import('../src/scanner.js');
const { closeBrowser }   = await import('../src/pageContext.js');

// --- Helpers ---
const ICON = { ok: '✅', risk: '⚠️ ', violation: '❌', unknown: '❓', error: '💥' };
const CHECK_IDS = ['law152', 'law149', 'erir', 'offer', 'drugs'];

function getStatus(aiData, id) {
  if (!aiData?.checks) return 'unknown';
  const c = aiData.checks.find(x => x.id === id);
  return c?.status || 'unknown';
}

function icon(status) {
  return (ICON[status] || status).padEnd(3);
}

// --- Run scan with timeout ---
async function runScan(url, siteType = 'auto') {
  return Promise.race([
    scanSinglePage({ url, groqKey: GROQ, slezaKey: SLEZA, useAI: USE_AI, siteType }),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout 90s')), 90_000)),
  ]);
}

// --- Save result JSON ---
function saveResult(hostname, result) {
  mkdirSync(RESULTS, { recursive: true });
  const ts   = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const path = join(RESULTS, `${hostname}__${ts}.json`);
  writeFileSync(path, JSON.stringify(result, null, 2));
  return path;
}

// --- Load most recent saved result for diff ---
function loadPrevious(hostname) {
  if (!existsSync(RESULTS)) return null;
  const files = readdirSync(RESULTS)
    .filter(f => f.startsWith(hostname + '__') && f.endsWith('.json'))
    .sort();
  if (files.length < 2) return null; // need at least 2: previous + current
  const prev = files[files.length - 2]; // second-to-last (latest is current run)
  try { return JSON.parse(readFileSync(join(RESULTS, prev), 'utf8')); } catch { return null; }
}

// --- Print diff between two scan results ---
function printDiff(current, previous) {
  if (!previous) { console.log('    (нет предыдущего baseline)'); return; }
  let changed = false;
  for (const id of CHECK_IDS) {
    const prev = getStatus(previous.aiData, id);
    const curr = getStatus(current.aiData,  id);
    if (prev !== curr) {
      console.log(`    ${id.padEnd(8)}: ${icon(prev)} → ${icon(curr)}`);
      changed = true;
    }
  }
  if (!changed) console.log('    (нет изменений)');
}

// --- Main ---
const urls = readUrls();

console.log(`\n🔬 Sleza Smoke Test — ${new Date().toLocaleString('ru')}`);
console.log(`   AI: ${USE_AI ? (GROQ ? 'ON (ключ есть)' : 'ON — НО НЕТ КЛЮЧА!') : 'OFF (локальные проверки)'}`);
console.log(`   Sleza key: ${SLEZA ? 'есть' : 'нет'}`);
console.log(`   URLs: ${urls.length}\n`);

const HDR = `${'Тип'.padEnd(10)} ${'Домен'.padEnd(32)} 152   149   ERIR  Оферт Куки  ЕГРЮЛ Fl  Заметки`;
console.log(HDR);
console.log('─'.repeat(HDR.length));

const totals = { ok: 0, risk: 0, violation: 0, error: 0 };

for (const { type, url, siteType } of urls) {
  let hostname = url;
  try { hostname = new URL(url).hostname; } catch {}

  process.stdout.write(`${type.padEnd(10)} ${hostname.slice(0, 31).padEnd(32)} `);

  // Suppress VM script console.log ("[Слеза] ...") during scan
  const origLog = console.log;
  console.log = () => {};
  let result, scanErr;
  try {
    result = await runScan(url, siteType);
  } catch (e) {
    scanErr = e;
  } finally {
    console.log = origLog;
  }

  if (scanErr) {
    console.log(`💥 ${String(scanErr.message).slice(0, 70)}`);
    totals.error++;
    continue;
  }

  const ai    = result.aiData;
  const egrul = result.egrul?.result?.parsed;
  const egrulIcon = egrul ? (egrul.isActive ? '✅' : '❌') : '❓';
  const fallback  = result.fallback ? '⚡' : '  ';

  const notes = [];
  if (result.slezaError) notes.push('sleza-err');
  if (USE_AI && !GROQ)   notes.push('no-groq');

  const statuses = CHECK_IDS.map(id => getStatus(ai, id));
  for (const s of statuses) { if (s in totals) totals[s]++; }

  console.log(
    statuses.map(icon).join('  ') +
    `${egrulIcon.padEnd(6)}${fallback.padEnd(4)}` +
    notes.join(', ')
  );

  saveResult(hostname, result);

  if (DIFF) {
    const prev = loadPrevious(hostname);
    printDiff(result, prev);
  }
}

console.log('─'.repeat(HDR.length));
console.log(`\nИтого: ✅ ${totals.ok}  ⚠️  ${totals.risk}  ❌ ${totals.violation}  💥 ${totals.error}`);
console.log('Результаты: backend/test/results/');
console.log('⚡ = Playwright упал, использован plain fetch\n');

await closeBrowser();
