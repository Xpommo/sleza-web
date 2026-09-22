// Демо-данные кабинета. Только для макета — при подключении бэкенда заменяется
// запросом к API, форма объектов сохраняется.
//
// Проект = один домен + привязанный оператор (ООО/ИП с ИНН). Именно так работает
// сканер и так выдаются документы: политика всегда на конкретный сайт конкретного юрлица.

export const CURRENT_USER = {
  email: 'director@alfa-school.ru',
  name: 'Кирилл',
  // Агентский режим доступен только аккаунтам с ролью агентства — обычный клиент
  // фильтра «Мои / Клиентские» вообще не видит.
  isAgency: false,
};

// checks — статус каждой из шести проверок. Раньше здесь лежали счётчики, а сами
// проверки раскладывались по ним механически — и на странице проекта Google Analytics
// мог оказаться «в норме» рядом с текстом о том, что данные уходят в США.
// Теперь статус проверки — единственный источник правды, счётчики считаются из него.
// fineMax — верхняя граница штрафа по найденному, в рублях: показываем «до N ₽».
// lastScanDays — сколько дней назад проверяли. paidUntil — до какой даты оплачена подписка.
export const PROJECTS = [
  {
    id: 'p1',
    name: 'Школа Альфа',
    domain: 'alfa-school.ru',
    org: { name: 'ООО «Альфа Образование»', inn: '7701234567' },
    owner: { type: 'mine' },
    // Google Analytics намеренно не входит: продукт пока не продаёт устранение
    // этой находки, отсутствие ключа читается всеми хелперами как «в норме».
    checks: { '152-ФЗ': 'violation', '149-ФЗ': 'recommendation', 'ЕРИР': 'ok', 'Оферта': 'ok', 'Куки': 'violation' },
    fineMax: 300000,
    lastScanDays: 7,
    docs: 'outdated',
    monitoring: true,
    paidUntil: '12.09.2026',
  },
  {
    id: 'p2',
    name: 'Бета Магазин',
    domain: 'beta-shop.ru',
    org: { name: 'ИП Петров П. П.', inn: '502912345678' },
    owner: { type: 'client', clientName: 'Бета Ритейл' },
    checks: { '152-ФЗ': 'ok', '149-ФЗ': 'ok', 'ЕРИР': 'ok', 'Оферта': 'ok', 'Куки': 'recommendation', 'Google Analytics': 'ok' },
    fineMax: 30000,
    lastScanDays: 2,
    docs: 'ok',
    monitoring: true,
    paidUntil: '01.08.2026',
  },
  {
    id: 'p3',
    name: 'Гамма Клиника',
    domain: 'gamma-clinic.ru',
    org: { name: 'ООО «Гамма Мед»', inn: '7809876543' },
    owner: { type: 'client', clientName: 'Гамма Групп' },
    checks: { '152-ФЗ': 'violation', '149-ФЗ': 'violation', 'ЕРИР': 'risk', 'Оферта': 'violation', 'Куки': 'risk', 'Google Analytics': 'ok' },
    fineMax: 700000,
    lastScanDays: 34,
    docs: 'none',
    monitoring: false,
    paidUntil: '18.07.2026',   // просрочено
  },
  {
    id: 'p4',
    name: 'Дельта Услуги',
    domain: 'delta-service.ru',
    org: { name: 'ООО «Дельта Сервис»', inn: '7712345678' },
    owner: { type: 'mine' },
    checks: { '152-ФЗ': 'ok', '149-ФЗ': 'recommendation', 'ЕРИР': 'risk', 'Оферта': 'ok', 'Куки': 'risk', 'Google Analytics': 'recommendation' },
    fineMax: 100000,
    lastScanDays: 4,
    docs: 'ok',
    monitoring: true,
    paidUntil: '03.11.2026',
  },
  {
    id: 'p5',
    name: 'Эпсилон Курсы',
    domain: 'epsilon-edu.ru',
    org: { name: 'ИП Смирнова А. В.', inn: '771812345678' },
    owner: { type: 'client', clientName: 'Эпсилон' },
    checks: { '152-ФЗ': 'violation', '149-ФЗ': 'ok', 'ЕРИР': 'ok', 'Оферта': 'recommendation', 'Куки': 'ok', 'Google Analytics': 'ok' },
    fineMax: 150000,
    lastScanDays: 12,
    docs: 'outdated',
    monitoring: false,
    paidUntil: '27.08.2026',
  },
  {
    id: 'p6',
    name: 'Дзета Логистика',
    domain: 'zeta-logistic.ru',
    org: { name: 'ООО «Дзета Транс»', inn: '5024567890' },
    owner: { type: 'mine' },
    checks: { '152-ФЗ': 'ok', '149-ФЗ': 'ok', 'ЕРИР': 'ok', 'Оферта': 'ok', 'Куки': 'ok', 'Google Analytics': 'ok' },
    fineMax: 0,
    lastScanDays: 1,
    docs: 'ok',
    monitoring: true,
    paidUntil: '30.12.2026',
  },
  {
    id: 'p7',
    name: 'Тета Студия',
    domain: 'theta-studio.ru',
    org: { name: 'ИП Иванов И. И.', inn: '470112345678' },
    owner: { type: 'client', clientName: 'Тета' },
    checks: { '152-ФЗ': 'violation', '149-ФЗ': 'recommendation', 'ЕРИР': 'risk', 'Оферта': 'recommendation', 'Куки': 'ok', 'Google Analytics': 'ok' },
    fineMax: 200000,
    lastScanDays: 41,
    docs: 'none',
    monitoring: false,
    paidUntil: '09.08.2026',
  },
];

// ── Шкала статусов ───────────────────────────────────────────────────────────
// В сводке три состояния и три слова — нарушения / замечания / чисто.
// Внутри проекта (шесть проверок) остаются точные статусы сканера: нарушение,
// риск, рекомендация, в норме. Сводка простая, детализация не теряет смысла.

export const TONE = { danger: 'danger', warn: 'warn', ok: 'ok' };

// Счётчики выводятся из статусов проверок — так карточка, полоска и страница
// проекта не могут разойтись между собой.
export function counts(p) {
  const values = Object.values(p.checks);
  return {
    violations:      values.filter(v => v === 'violation').length,
    risks:           values.filter(v => v === 'risk').length,
    recommendations: values.filter(v => v === 'recommendation').length,
    ok:              values.filter(v => v === 'ok').length,
  };
}

// Заголовок вычисляется ИЗ полоски проверок, а не задаётся отдельно: иначе
// «нарушений нет» может стоять над полоской, где есть незелёные сегменты.
export function projectSummary(p) {
  const { violations, risks, recommendations } = counts(p);
  const remarks = risks + recommendations;
  const remarksLabel = remarks > 0
    ? `${remarks} ${plural(remarks, 'замечание', 'замечания', 'замечаний')}`
    : null;

  if (violations > 0) {
    return {
      tone: 'danger',
      label: `${violations} ${plural(violations, 'нарушение', 'нарушения', 'нарушений')}`,
      // Замечания нельзя проглатывать: в полоске они видны жёлтым и синим,
      // и заголовок «2 нарушения» над шестью сегментами не описывает картину.
      secondary: remarksLabel,
    };
  }
  if (remarks > 0) return { tone: 'warn', label: remarksLabel, secondary: null };
  return { tone: 'ok', label: 'Чисто', secondary: null };
}

// Шесть проверок в фиксированном порядке — полоска на карточке показывает именно их.
// К полоске обязательна легенда: без неё цветные сегменты ничего не сообщают.
export const CHECK_NAMES = ['152-ФЗ', '149-ФЗ', 'ЕРИР', 'Оферта', 'Куки', 'Google Analytics'];

export const SEGMENT_LEGEND = [
  { tone: 'danger', text: 'нарушение' },
  { tone: 'warn',   text: 'риск' },
  { tone: 'brand',  text: 'рекомендация' },
  { tone: 'ok',     text: 'в норме' },
];

const STATUS_TO_TONE = { violation: 'danger', risk: 'warn', recommendation: 'brand', ok: 'ok' };

// Сегмент = конкретная проверка со своим статусом, а не абстрактная доля счётчика:
// наведя на него, видно, о какой именно проверке речь.
export function checkSegments(p) {
  return CHECK_NAMES.map(name => ({ name, tone: STATUS_TO_TONE[p.checks[name]] || 'ok' }));
}

// «до N ₽» — верхняя граница для юрлица. Показываем только там, где есть что терять.
export function fineLabel(p) {
  if (!p.fineMax) return null;
  return `риск до ${new Intl.NumberFormat('ru-RU').format(p.fineMax)} ₽`;
}

// Документы — второй по силе сигнал после нарушений, поэтому у них своя триада,
// а не одинаковый серый на все три состояния.
export const DOCS_LABEL = {
  none:     { text: 'документов нет',   tone: 'danger' },
  outdated: { text: 'документы устарели', tone: 'warn' },
  ok:       { text: 'документы актуальны', tone: 'ok' },
};

// Месяц без проверки при включённом мониторинге — аномалия, а не серая подпись.
export const STALE_DAYS = 30;

export function scanLabel(p) {
  const stale = p.lastScanDays >= STALE_DAYS;
  return {
    stale,
    text: stale
      ? `не проверялся ${p.lastScanDays} ${plural(p.lastScanDays, 'день', 'дня', 'дней')}`
      : `проверен ${daysAgo(p.lastScanDays)}`,
  };
}

// Дата в моках задана строкой дд.мм.гггг — сравниваем с «сегодня» макета.
const TODAY = new Date('2026-07-31');

export function paymentState(p) {
  const [d, m, y] = p.paidUntil.split('.').map(Number);
  const until = new Date(y, m - 1, d);
  const days = Math.round((until - TODAY) / 86400000);
  if (days < 0)  return { tone: 'danger', text: `просрочено с ${p.paidUntil}` };
  if (days <= 14) return { tone: 'warn',  text: `оплачено до ${p.paidUntil}` };
  return { tone: 'muted', text: `оплачено до ${p.paidUntil}` };
}

// Проект «горит» тем сильнее, чем больше нарушений; замечания — вторым весом.
// Используется для сортировки по умолчанию: сначала то, где горит.
export function severityScore(p) {
  const c = counts(p);
  return c.violations * 100 + c.risks * 10 + c.recommendations;
}

// Для клиента с одним сайтом «проект» — чужое слово; для агентства с двадцатью — рабочее.
// Один компонент, разные подписи.
export function terms(isAgency) {
  return isAgency
    ? { one: 'проект', many: 'Проекты', add: 'Добавить проект',
        countWords: ['проект', 'проекта', 'проектов'],
        emptyTitle: 'Добавьте первый проект', searchPlaceholder: 'Название, домен или ИНН' }
    : { one: 'сайт', many: 'Мои сайты', add: 'Добавить сайт',
        countWords: ['сайт', 'сайта', 'сайтов'],
        emptyTitle: 'Добавьте первый сайт', searchPlaceholder: 'Название, домен или ИНН' };
}

export const DISCLAIMER =
  'Автоматическая проверка, не юридическое заключение. Суммы — верхняя граница штрафа для юрлица.';

export function plural(n, one, few, many) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

export function daysAgo(n) {
  if (n === 0) return 'сегодня';
  if (n === 1) return 'вчера';
  return `${n} ${plural(n, 'день', 'дня', 'дней')} назад`;
}
