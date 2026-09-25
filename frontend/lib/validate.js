// Валидация полей форм на фронте. Сообщения говорят, что сделать, а не «ошибка».
// Серверная проверка живёт отдельно (backend/src/validateLead.js) — эта нужна,
// чтобы не гонять заведомо битый ввод и подсказывать сразу в поле.

export const EMAIL_RE = /^[a-zA-Z0-9]([a-zA-Z0-9.+_-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

// → строка с ошибкой или null, если всё в порядке.
export function validateEmail(raw) {
  const email = (raw || '').trim();
  if (!email) return 'Введите email';
  if (!email.includes('@')) return 'Проверьте email: похоже, пропущена @';
  if (!EMAIL_RE.test(email)) return 'Некорректный email';
  return null;
}

// Оставляет только цифры и приводит 8/+7 к единому виду: до 11 цифр, начиная с 7.
// Код страны определяется по первой цифре, а не по длине строки: при посимвольном
// вводе длина проходит через все значения, и правило «10 цифр → дописать 7»
// срабатывало на промежуточном состоянии, сдвигая номер (8999… → +7 (799) 9…).
export function normalizePhone(raw) {
  let digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('8')) digits = '7' + digits.slice(1);
  else if (!digits.startsWith('7')) digits = '7' + digits;   // ввод начали с национальной цифры
  // +7 уже стоит в поле, а человек по привычке набирает «8 916…» или
  // вставляет «+7 916…»: вторая 8/7 перед 9 — это его собственный код страны,
  // а не часть номера (кодов +7 (89…) и +7 (79…) не бывает).
  if (/^7[78]9/.test(digits)) digits = '7' + digits.slice(2);
  return digits.slice(0, 11);
}

// Прогрессивная маска для ввода: +7 (999) 123-45-67.
export function formatPhone(raw) {
  const d = normalizePhone(raw);
  if (!d) return '';
  const rest = d.slice(1);
  let out = '+7';
  if (rest.length) out += ` (${rest.slice(0, 3)}`;
  if (rest.length > 3) out += `) ${rest.slice(3, 6)}`;
  if (rest.length > 6) out += `-${rest.slice(6, 8)}`;
  if (rest.length > 8) out += `-${rest.slice(8, 10)}`;
  return out;
}

// Для необязательного телефона: пусто — можно, начатый номер — только целиком.
export function phoneIncomplete(raw) {
  const d = normalizePhone(raw);
  return d.length > 1 && d.length < 11 ? 'Номер неполный: после +7 нужно 10 цифр.' : null;
}

export function validatePhone(raw) {
  const digits = normalizePhone(raw);
  if (!digits) return 'Введите номер телефона';
  if (digits.length < 11) return 'Номер неполный: нужно 11 цифр';
  if (digits.length > 11 || digits[0] !== '7') return 'Проверьте номер: ожидается российский формат';
  return null;
}
