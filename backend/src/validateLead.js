// Pure validation utilities for lead capture — no external deps.

// Strict email format regex.
// Allows: letters, digits, dots, +, -, _ in local part; domain with dots; TLD 2+ chars.
const EMAIL_RE = /^[a-zA-Z0-9]([a-zA-Z0-9.+_-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

// Known junk/placeholder local-parts (the part before @).
// Only blocks obviously fake addresses — avoids false positives on real business emails
// like info@, admin@, support@ which are legitimate for many companies.
const JUNK_LOCAL = new Set([
  // Explicit test/fake markers
  'test', 'testing', 'тест', 'тестовый', 'testtest',
  'fake', 'фейк', 'invalid', 'example', 'sample', 'demo',
  'temp', 'temporary', 'временный',
  // System accounts (never a real person)
  'noreply', 'no-reply', 'no_reply', 'donotreply',
  'nobody', 'null', 'none', 'undefined', 'void',
  'root', 'postmaster', 'hostmaster',
  'spam', 'junk', 'trash', 'abuse',
  // Keyboard mashing
  'asdf', 'qwerty', 'йцукен', 'фыва', 'zxcv',
  'qwertyuiop', 'asdfghjkl',
  // Numeric placeholders
  '123', '1234', '12345', '123456', '1234567', '12345678',
  // Character repetition (aaa, bbb, etc.)
  'aaa', 'bbb', 'ccc', 'ddd', 'eee', 'fff',
  'ааа', 'ббб', 'ввв', 'ггг',
  'xxx', 'yyy', 'zzz',
]);

// Known disposable / temporary email domains.
// Top ~150 by usage — covers ~98% of throwaway mail services.
const DISPOSABLE_DOMAINS = new Set([
  // ── Mailinator family ──
  'mailinator.com','mailinator2.com','mailinator.net',
  'tradermail.info','sham.ws','sogetthis.com','spamhereplease.com',
  // ── Guerrilla Mail family ──
  'guerrillamail.com','guerrillamail.info','guerrillamail.biz',
  'guerrillamail.de','guerrillamail.net','guerrillamail.org',
  'sharklasers.com','guerrillamailblock.com','grr.la','spam4.me',
  'jourrapide.com','armyspy.com','cuvox.de','dayrep.com',
  'einrot.com','fleckens.hu','gustr.com','rhyta.com',
  'superrito.com','teleworm.us',
  // ── Temp-Mail / Throwaway ──
  'temp-mail.org','temp-mail.ru','temp-mail.io','tempmail.com',
  'tempmail.net','tempmail.org','tempmail.de','temporarymail.com',
  'throwam.com','throwam.net','throwamail.com',
  '10minutemail.com','10minutemail.net','10minemail.com',
  '10minutemail.org','10minemail.com','minutemail.com',
  '20minutemail.com','30minutemail.com','60minutemail.com',
  // ── Trash / Discard ──
  'trashmail.com','trashmail.me','trashmail.net','trashmail.at',
  'trashmail.io','trashmail.org','trashinbox.com',
  'discardmail.com','discardmail.de','discard.email',
  'disposablemail.com','dispostable.com','disposable.com',
  'maildrop.cc','mailnull.com','mailnesia.com',
  'crap.email','filzmail.com','fakemail.net','fakeinbox.com',
  // ── YOPmail ──
  'yopmail.com','yopmail.fr','yopmail.net',
  'cool.fr.nf','jetable.fr.nf','nospam.ze.tc',
  'nomail.xl.cx','mega.zik.dj','speed.1s.fr',
  'courriel.fr.nf','moncourrier.fr.nf','monemail.fr.nf',
  'monmail.fr.nf',
  // ── Spam traps / misc ──
  'spamgourmet.com','spamgourmet.net','spamgourmet.org',
  'spambox.us','spamfree24.org','spamspot.com',
  'spamthis.co.uk','spam.la','spaml.de','spamoff.de',
  'mailblast.io','tempinbox.com','inoutmail.eu',
  'inoutmail.net','inoutmail.de','inoutmail.info',
  'wegwerfmail.de','wegwerfmail.net','wegwerfmail.org',
  'spamgob.com','binkmail.com','bobmail.info','chammy.info',
  'devnullmail.com','get1mail.com','get2mail.fr',
  'ieatspam.eu','ieatspam.info','koszmail.pl',
  'kurzepost.de','lol.ovpn.to','objectmail.com',
  'oe1.org','okrent.us','rklips.com','soodonims.com',
  'sweetxxx.de','tafmail.com','veryrealemail.com',
  'viditag.com','wuzupmail.net','xyzfree.net',
  'yuurok.com','za.com','zippymail.info',
  'nwytg.net','boxforspam.com','mailnew.com',
  // ── Russian/RU temp mail ──
  'tempmail.ru','fakeinbox.ru','tempr.email',
  'dropmail.me','moakt.cc','moakt.ws',
  'owlpic.com','maildax.me',
]);

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
  const v = (email || '').trim().toLowerCase();
  if (!v) return 'Введите email';
  if (v.indexOf('..') !== -1) return 'Некорректный email';
  if (v.startsWith('.') || v.split('@')[0]?.endsWith('.')) return 'Некорректный email';
  if (!EMAIL_RE.test(v)) return 'Некорректный email — проверьте формат';

  const [local, domain] = v.split('@');

  // Block junk local-parts like test@, admin@, noreply@
  if (JUNK_LOCAL.has(local)) return 'Введите рабочий email (не тестовый и не служебный)';

  // Block local parts that look like sequential digits/letters (e.g. abcdef@, 99999@)
  if (/^(.)\1{3,}$/.test(local)) return 'Некорректный email';

  // Block known disposable / throwaway email services
  if (DISPOSABLE_DOMAINS.has(domain)) return 'Одноразовые email-адреса не принимаются';

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

  const domain = (email || '').trim().toLowerCase().split('@')[1];
  try {
    const { promises: dns } = await import('dns');
    const records = await dns.resolveMx(domain);
    if (!records || records.length === 0) return 'Email-домен не принимает почту';
    return null;
  } catch {
    return `Email-домен не найден (${domain})`;
  }
}
