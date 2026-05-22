// Pure validation utilities for lead capture — no external deps.

// Strict email format regex.
// Allows: letters, digits, dots, +, -, _ in local part; domain with dots; TLD 2+ chars.
const EMAIL_RE = /^[a-zA-Z0-9]([a-zA-Z0-9.+_-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

const COMPANY_JUNK = new Set([
  'test', 'тест', 'aaa', 'ааа', 'bbb', 'ббб', 'ccc', 'ввв',
  'asdf', 'qwerty', 'йцукен', 'фыва', 'zxcv', 'null', 'none',
  'company', 'компания', 'фирма', 'org', 'organization',
  'no', 'нет', 'na', 'n/a', 'xxx', 'yyy', 'zzz',
]);

/**
 * Validate email format (format only, no network).
 * Returns null if valid, or an error string.
 */
export function validateEmail(email) {
  const v = (email || '').trim();
  if (!v) return 'Введите email';
  if (v.indexOf('..') !== -1) return 'Некорректный email';
  if (v.startsWith('.') || v.split('@')[0]?.endsWith('.')) return 'Некорректный email';
  if (!EMAIL_RE.test(v)) return 'Некорректный email — проверьте формат';
  return null;
}

/**
 * Validate company name.
 * Returns null if valid, or an error string.
 */
export function validateCompany(company) {
  const v = (company || '').trim();
  if (!v) return 'Введите название компании';
  if (v.length < 2) return 'Название слишком короткое';

  // Must contain at least 2 letters (Cyrillic or Latin)
  const letters = v.match(/[a-zA-Zа-яёА-ЯЁ]/g) || [];
  if (letters.length < 2) return 'Введите корректное название компании';

  // Must not be all the same character
  if (new Set(v.toLowerCase().replace(/\s/g, '')).size <= 1) return 'Введите корректное название компании';

  // Must not be a known junk value
  if (COMPANY_JUNK.has(v.toLowerCase())) return 'Введите реальное название компании';

  return null;
}

/**
 * Check if email domain has MX records (i.e. can receive mail).
 * Returns null if valid, or an error string.
 * Requires Node.js dns module — only call from backend.
 */
export async function validateEmailMX(email) {
  const format = validateEmail(email);
  if (format) return format;

  const domain = email.trim().split('@')[1];
  try {
    const { promises: dns } = await import('dns');
    const records = await dns.resolveMx(domain);
    if (!records || records.length === 0) return 'Email-домен не принимает почту';
    return null;
  } catch {
    return `Email-домен не найден (${domain})`;
  }
}
