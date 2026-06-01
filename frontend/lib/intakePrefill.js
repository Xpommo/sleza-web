// Pure mapping: scan result → document-intake form spec.
// The whole product wedge lives here — the scan pre-fills ~half the self-declaration
// so the client sees "вот что мы нашли — подтвердите и допишите", not a blank form.
//
// Sources (all already on the persisted scan result):
//   data.intakeSignals  — compact facts from pageContext (GA, Метрика, cookie, policy, requisites)
//   data.aiData.checks  — per-law verdicts (fallback when intakeSignals absent on old scans)
//   data.egrul          — operator name / INN / OGRN
//
// Returns { operator, known, ask, counts } — a render spec, no UI concerns.
// Pure & dependency-free so it is unit-testable from Node.

// What the scan cannot know — the client must declare these (self-declaration).
export const ASK_FIELDS = [
  {
    id: 'collected_data',
    label: 'Какие персональные данные вы собираете',
    type: 'multi',
    options: ['ФИО', 'Email', 'Телефон', 'Адрес', 'Платёжные данные', 'Геолокация', 'Биометрия'],
  },
  {
    id: 'purposes',
    label: 'Цели обработки',
    type: 'multi',
    options: ['Исполнение договора / заказа', 'Рассылка', 'Аналитика', 'Таргетированная реклама', 'Обратная связь'],
  },
  {
    id: 'recipients',
    label: 'Кому передаёте данные',
    type: 'multi',
    options: ['CRM', 'Сервис рассылок', 'Платёжный шлюз', 'Хостинг', 'Аналитика (Google и пр.)', 'Никому'],
  },
  {
    id: 'storage_location',
    label: 'Где хранятся данные',
    type: 'single',
    options: ['Серверы в РФ', 'За рубежом', 'Не знаю'],
  },
  {
    id: 'has_processors',
    label: 'Привлекаете подрядчиков к обработке (поручение обработки)',
    type: 'single',
    options: ['Да', 'Нет', 'Не знаю'],
  },
];

function findCheck(checks, id) {
  return (checks || []).find(c => c.id === id) || null;
}

// Builds the intake spec from a scan result object (the same `data` Results.js holds).
export function buildIntakePrefill(data) {
  const checks  = data?.aiData?.checks || [];
  const signals = data?.intakeSignals || null;
  const egrul   = data?.egrul || null;

  const ga      = findCheck(checks, 'ga');
  const law152  = findCheck(checks, 'law152');
  const erir    = findCheck(checks, 'erir');

  // Prefer explicit signals; fall back to coarse derivation from checks (old cached scans).
  const usesGA = signals ? signals.usesGoogleAnalytics : !!(ga && ga.status !== 'ok');
  const usesAnalytics  = signals ? signals.usesAnalytics  : false;
  const usesAds        = signals ? signals.usesAds        : !!(erir && erir.status !== 'ok');
  const hasCookieBanner = signals ? signals.hasCookieBanner : false;
  // Policy "found" is best captured by the law152 verdict (which factors in deep
  // discovery via fallback paths), with the page-level link signal as a secondary input.
  const law152ok = law152 && law152.status === 'ok';
  const hasPolicy = law152ok || (signals ? signals.hasPolicyLink : !!(law152 && law152.status === 'risk'));
  const hasPreChecked = signals ? signals.hasPreCheckedConsent : false;

  const operator = {
    name: signals?.operatorName || egrul?.result?.parsed?.name || null,
    inn:  signals?.inn  || egrul?.ids?.inn  || null,
    ogrn: signals?.ogrn || egrul?.ids?.ogrn || null,
  };

  // "Подтвердите" — booleans the scan determined. Each carries a hint of why it matters.
  const known = [
    { id: 'uses_ga',        label: 'Google Analytics (передача данных в Google, США)', value: usesGA,         note: usesGA ? 'требует уведомления РКН о трансграничной передаче' : '' },
    { id: 'uses_analytics', label: 'Аналитика / трекеры (Яндекс.Метрика и пр.)',       value: usesAnalytics,  note: '' },
    { id: 'uses_ads',       label: 'Рекламные скрипты на сайте',                        value: usesAds,        note: usesAds ? 'возможна маркировка рекламы (ЕРИР)' : '' },
    { id: 'cookie_banner',  label: 'Баннер согласия на cookie',                         value: hasCookieBanner, note: hasCookieBanner ? '' : 'трекинг есть, баннера нет — нужен' },
    { id: 'has_policy',     label: 'Политика конфиденциальности опубликована',          value: hasPolicy,      note: hasPolicy ? '' : 'не найдена — включим в пакет' },
  ];
  if (hasPreChecked) {
    known.push({ id: 'pre_checked', label: 'Галочка согласия предустановлена', value: true, note: 'нарушение ч.1 ст.9 152-ФЗ — согласие должно быть активным' });
  }

  // Operator is "known" too when EGRUL resolved it.
  const knownCount = known.length + (operator.name || operator.inn ? 1 : 0);
  const total = knownCount + ASK_FIELDS.length;

  return {
    operator,
    known,
    ask: ASK_FIELDS,
    counts: { known: knownCount, total },
  };
}
