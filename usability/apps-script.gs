/**
 * Приёмник анкеты тестировщиков кабинета «Слеза Белый Сайт».
 *
 * Анкета (usability/index.html) шлёт сюда ответы кнопкой «Сохранить».
 * Одна строка — один тестировщик: повторное сохранение обновляет его строку.
 * Страница ответов (usability/answers.html) читает строки через doGet по ключу.
 *
 * Установка — в usability/README.md.
 */

// Пароль для страницы ответов. Замените на свой до публикации.
const ADMIN_KEY = 'ЗАМЕНИТЕ-НА-СВОЙ-ПАРОЛЬ';
const SHEET_NAME = 'Ответы';
const MAX_CELL = 5000;
// Полные ответы для страницы ответов; в ячейке Google Таблиц помещается до 50 000 знаков.
const JSON_KEY = 'Данные (JSON)';
const MAX_JSON = 45000;

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const raw = (e.postData && e.postData.contents) || '';
    if (raw.length > 200000) return out_({ ok: false, error: 'too_large' });
    const data = JSON.parse(raw);
    if (!data || typeof data.id !== 'string' || !/^[a-z0-9-]{8,64}$/i.test(data.id)) {
      return out_({ ok: false, error: 'bad_id' });
    }
    const row = data.row && typeof data.row === 'object' ? data.row : {};
    const sh = sheet_();

    const header = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
    ['id', 'Сохранено'].concat(Object.keys(row)).forEach((k) => {
      if (header.indexOf(k) === -1) header.push(k);
    });
    sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
    sh.setFrozenRows(1);

    const values = header.map((k) => {
      if (k === 'id') return data.id;
      if (k === 'Сохранено') return new Date();
      return cell_(row[k], k === JSON_KEY ? MAX_JSON : MAX_CELL);
    });
    const last = sh.getLastRow();
    const ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map((r) => r[0]) : [];
    const i = ids.indexOf(data.id);
    sh.getRange(i === -1 ? last + 1 : i + 2, 1, 1, header.length).setValues([values]);
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  if (!e.parameter || e.parameter.key !== ADMIN_KEY) return out_({ ok: false, error: 'unauthorized' });
  const sh = sheet_();
  const last = sh.getLastRow();
  if (last < 2) return out_({ ok: true, rows: [] });
  const all = sh.getRange(1, 1, last, sh.getLastColumn()).getValues();
  const header = all[0];
  const rows = all.slice(1).map((r) => {
    const o = {};
    header.forEach((k, j) => { o[k] = r[j] instanceof Date ? r[j].toISOString() : r[j]; });
    return o;
  });
  return out_({ ok: true, rows });
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

// Обрезаем длинное и гасим формулы: ячейка, начатая с = + - @, иначе выполнится.
function cell_(v, max) {
  if (v === undefined || v === null) return '';
  const s = String(v).slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
