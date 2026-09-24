// Сайты аккаунта — одно место, где считается состояние каждого сайта.
//
// Модель (решения владельца 23.09):
// - у каждого сайта свой тариф, свой год подписки и своя дата продления:
//   сайт, добавленный посреди года, начинает свой отсчёт. Одна дата на все
//   сайты свела бы оплату в один счёт на сотни тысяч раз в год — такой счёт
//   клиент не оплатит;
// - общие на аккаунт — способ оплаты, карта, плательщик и почта для актов;
// - тарифом, оплатой и отключением управляют в «Оплате», в строке сайта.
//
// Анкета в хранилище — это открытый сейчас сайт плюс общее на аккаунт
// (профиль, вход, обращения, способ оплаты, карта, плательщик, почта для
// актов). Остальные сайты лежат в extraSites:
// - настоящие (real) — добавленные через «Добавить сайт»: всё, что относится
//   к сайту, — в fields, подписка — в собственных полях строки. «Открыть»
//   меняет их местами с открытым сайтом (openSite), и анкета, кабинет и
//   «Оплата» работают с ним как с единственным;
// - демо — строки пресета «Несколько сайтов» панели «Макет»: открываются
//   поверх основного (siteAnketa), ответы анкеты у них общие с основным.

import { loadAnketa, replaceAnketa, saveAnketa } from '../../start/_shared/anketaState';
import { PRICE, TARIFFS, formatDate, paidPeriod, subState, trialEndAt, trialEnds } from './subscription';

export const MAIN = 'main';
const CURRENT = 'current_site_v1';

// Тариф выбирает клиент — в «Оплате», пока идёт пробный период (владелец
// 24.09). До выбора его нет: «Тариф Х · 12 000 ₽» в «Обзоре» сразу после
// установки выглядел решённым за клиента. Оплаченный сайт без записи о
// тарифе (старые состояния макета) — на первом тарифе.
function mainTariff(a) {
  return a.siteTariff || a.billing?.tariff || (a.billing?.paidAt ? TARIFFS[0] : null);
}

// ─── какой сайт открыт в кабинете ────────────────────────────────────────
export function setCurrentSite(key) {
  try {
    window.sessionStorage.setItem(CURRENT, key);
  } catch {
    /* без хранилища открывается основной сайт */
  }
}

// Какой сайт открыт — для «Оплатить» с «Обзора»: «Оплата» раскрывает
// оплату именно его.
export function currentSiteKey() {
  return currentKey();
}

function currentKey() {
  try {
    return window.sessionStorage.getItem(CURRENT) || MAIN;
  } catch {
    return MAIN;
  }
}

// Анкета в том виде, в каком её читают экраны сайта: для демо-сайта поверх
// основной — его домен, компания, реквизиты и состояние подписки. Настройки
// аккаунта (способ оплаты, карта, плательщик, почта для актов) — общие.
export function siteAnketa(a = loadAnketa()) {
  const key = currentKey();
  const s = key === MAIN ? null : (a.extraSites || []).find((x) => x.key === key);
  if (!s) return a;
  return {
    ...a,
    ...(s.fields || {}),
    domain: s.domain,
    companyName: s.fields?.companyName ?? s.company,
    stepsDone: s.real ? s.fields?.stepsDone || 0 : 5,
    installed: s.real ? Boolean(s.fields?.installed) : true,
    trialStartedAt: s.trialStartedAt,
    siteTariff: s.tariff,
    siteNextTariff: s.nextTariff || null,
    docEdits: s.docEdits || [],
    billing: { ...a.billing, paidAt: s.paidAt, paidYears: s.paidYears || 1, invoice: s.invoice, cancelled: s.cancelled, leaving: s.leaving, leavingAt: s.leavingAt, paidAmount: PRICE },
  };
}

// Правка данных открытого сайта (реквизиты): у демо-сайта — в его строку,
// а не в анкету основного.
export function saveSiteFields(patch) {
  const key = currentKey();
  const a = loadAnketa();
  const s = key === MAIN ? null : (a.extraSites || []).find((x) => x.key === key);
  if (!s) {
    saveAnketa(patch);
    return;
  }
  const { docEdits, ...fields } = patch;
  saveAnketa({
    extraSites: a.extraSites.map((x) =>
      x.key !== key ? x : { ...x, company: fields.companyName ?? x.company, fields: { ...x.fields, ...fields }, ...(docEdits ? { docEdits } : {}) },
    ),
  });
}

// ─── состояние каждого сайта ─────────────────────────────────────────────
// Сайт в том виде, в каком его понимает subState: у основного — сама анкета,
// у демо-сайта — его собственные поля.
function asAnketa(a, s) {
  if (s.key === MAIN) return a;
  if (s.real) return siteView(a, s);
  return { stepsDone: 5, installed: true, trialStartedAt: s.trialStartedAt, billing: { paidAt: s.paidAt, paidYears: s.paidYears || 1, invoice: s.invoice } };
}

function describe(a, s, now) {
  const v = asAnketa(a, s);
  const state = subState(v, now);
  const period = v.billing?.paidAt ? paidPeriod(v.billing.paidAt, v.billing.paidYears) : null;
  // Два разных желания — два флага (владелец 24.09):
  // - leaving — «Отключить сайт» (меню «⋯» в «Оплате»): сайт работает до
  //   конца оплаченного срока или пробного периода, дальше не продлевается;
  // - cancelled — выключенное автопродление: не уход, а продление вручную.
  //   В партнёрской программе (14.09) автопродление выключают, «чтобы не
  //   списывалось лишнее», а ручное продление — «механизм для партнёра».
  //   Раньше это был один флаг, и выключение автопродления вело в окно «Может,
  //   получится помочь?» с последствиями ухода.
  if (s.leaving && (state === 'paid' || state === 'trial')) {
    const until = state === 'paid' ? period.to : trialEnds(v);
    return { kind: 'off-soon', label: `до ${until} · без продления`, tone: 'warn', period, until };
  }
  if (state === 'notstarted') {
    return (v.stepsDone || 0) >= 4
      ? { kind: 'not-ready', label: 'код не установлен', tone: 'warn', period }
      : { kind: 'not-ready', label: 'анкета не закончена', tone: 'warn', period };
  }
  if (state === 'paid') return { kind: 'paid', label: `оплачено до ${period.to}`, tone: 'ok', period };
  if (state === 'pending') return { kind: 'pending', label: 'ждёт оплаты по счёту', tone: 'info', period };
  if (state === 'expired') return { kind: 'expired', label: 'пробный период закончился', tone: 'warn', period };
  return { kind: 'trial', label: `бесплатно до ${trialEnds(v)}`, tone: 'info', period };
}

export function accountSites(a, now = Date.now()) {
  const b = a.billing || {};
  const extra = a.extraSites || [];
  if (!a.domain && !extra.some((s) => s.real)) return [];
  const list = [
    ...(a.domain
      ? [{
          key: MAIN,
          domain: a.domain,
          company: a.companyName || '',
          tariff: mainTariff(a),
          nextTariff: a.siteNextTariff || null,
          cancelled: Boolean(b.cancelled),
          leaving: Boolean(b.leaving),
          leavingAt: b.leavingAt || null,
          invoice: b.invoice || null,
          paidAt: b.paidAt || null,
          paidYears: b.paidYears || 1,
          trialStartedAt: a.trialStartedAt || null,
          addedAt: a.siteAddedAt || 0,
          stepsDone: a.stepsDone || 0,
          real: true,
          demo: false,
        }]
      : []),
    ...extra.map((s) => ({ ...s, stepsDone: s.real ? s.fields?.stepsDone || 0 : 5, demo: !s.real })),
  ];
  // Порядок — по времени добавления, а не «открытый первым»: иначе карточки
  // переставлялись бы от того, какой сайт открывали последним.
  const order = (s) => (s.demo ? Infinity : s.addedAt || 0);
  return list
    .sort((x, y) => order(x) - order(y))
    .map((s) => ({ ...s, ...describe(a, s, now), price: PRICE }));
}

// ─── несколько настоящих сайтов ──────────────────────────────────────────
// Общее на аккаунт; всё остальное в анкете относится к открытому сайту.
const ACCOUNT_KEYS = ['role', 'personName', 'personEmail', 'personPhone', 'authVia', 'messengers', 'tickets', 'extraSites', 'billing'];
// В billing сайту принадлежат только его оплата и счёт; способ оплаты, карта,
// плательщик, почта для актов и нумерация счетов — аккаунту.
const SITE_BILLING = ['paidAt', 'paidYears', 'paidAmount', 'invoice', 'cancelled', 'cancelledAt', 'leaving', 'leavingAt', 'tariff'];

function accountPart(a) {
  const out = {};
  ACCOUNT_KEYS.forEach((k) => {
    if (a[k] !== undefined) out[k] = a[k];
  });
  const billing = { ...(a.billing || {}) };
  SITE_BILLING.forEach((k) => delete billing[k]);
  return { ...out, billing };
}

// Открытый сайт — строкой в extraSites, со всем, что к нему относится.
function stash(a) {
  const fields = {};
  Object.keys(a).forEach((k) => {
    if (!ACCOUNT_KEYS.includes(k)) fields[k] = a[k];
  });
  const b = a.billing || {};
  return {
    key: `site-${a.siteAddedAt || 0}-${a.domain}`,
    real: true,
    domain: a.domain,
    company: a.companyName || '',
    addedAt: a.siteAddedAt || 0,
    tariff: mainTariff(a),
    nextTariff: a.siteNextTariff || null,
    trialStartedAt: a.trialStartedAt || null,
    paidAt: b.paidAt || null,
    paidYears: b.paidYears || 1,
    paidAmount: b.paidAmount || null,
    invoice: b.invoice || null,
    cancelled: Boolean(b.cancelled),
    cancelledAt: b.cancelledAt || null,
    leaving: Boolean(b.leaving),
    leavingAt: b.leavingAt || null,
    docEdits: a.docEdits || [],
    fields,
  };
}

// Настоящий сайт из extraSites в виде анкеты: его ответы, реквизиты и
// подписка поверх общего на аккаунт. То же читает карточка «Моих сайтов».
export function siteView(a, s) {
  return {
    ...accountPart(a),
    ...s.fields,
    domain: s.domain,
    companyName: s.fields?.companyName ?? s.company,
    siteTariff: s.tariff,
    siteNextTariff: s.nextTariff || null,
    trialStartedAt: s.trialStartedAt,
    docEdits: s.docEdits || [],
    siteAddedAt: s.addedAt || 0,
    billing: {
      ...accountPart(a).billing,
      paidAt: s.paidAt,
      paidYears: s.paidYears || 1,
      paidAmount: s.paidAmount,
      invoice: s.invoice,
      cancelled: s.cancelled,
      cancelledAt: s.cancelledAt,
      leaving: s.leaving,
      leavingAt: s.leavingAt,
    },
  };
}

// Открыть сайт в кабинете. Настоящий — встаёт на место открытого (тот уходит
// в extraSites целиком), демо — как раньше, поверх основного.
export function openSite(key) {
  const a = loadAnketa();
  const s = key === MAIN ? null : (a.extraSites || []).find((x) => x.key === key);
  if (!s || !s.real) {
    setCurrentSite(key);
    return siteAnketa(a);
  }
  const rest = a.extraSites.filter((x) => x.key !== key);
  const next = { ...siteView(a, s), extraSites: a.domain ? [...rest, stash(a)] : rest };
  replaceAnketa(next);
  setCurrentSite(MAIN);
  return next;
}

// «Добавить сайт». Первый сайт — обычная анкета с «Вашего профиля». Если сайт
// уже есть, он уходит в список целиком, а новый начинается с «О сайте»:
// профиль — вопрос аккаунта, его уже знаем (живой макет, FUNNEL_ALL.skipIf по
// hasIdentity). skipProfile живёт в самом сайте, поэтому шкала «из 5» не
// схлопнется посреди первого прохождения и сохранится при возврате к сайту.
export function addSite() {
  const a = loadAnketa();
  setCurrentSite(MAIN);
  if (!a.domain) return a.stepsDone >= 1 ? '/app/start/site' : '/app/start/profile';
  replaceAnketa({
    ...accountPart(a),
    extraSites: [...(a.extraSites || []), stash(a)],
    stepsDone: 1,
    skipProfile: true,
    siteAddedAt: Date.now(),
  });
  return '/app/start/site';
}

// Ближайшее продление среди оплаченных сайтов — у каждого своя дата,
// поэтому показываем ближайшую, а не «общую».
// Ближайшее списание с баланса автопродлением: у оплаченного — дата
// продления, у сайта в пробном периоде — его конец. Выключенное
// автопродление и отключённый сайт не списывают.
function debitAt(s) {
  if (s.cancelled || s.leaving) return null;
  if (s.kind === 'paid' && s.paidAt) {
    const d = new Date(s.paidAt);
    d.setFullYear(d.getFullYear() + (s.paidYears || 1));
    return d.getTime();
  }
  if (s.kind === 'trial' && s.trialStartedAt) return trialEndAt(s);
  return null;
}

export function nextRenewal(sites) {
  const due = sites
    .map((s) => ({ site: s, at: debitAt(s) }))
    .filter((x) => x.at)
    .sort((x, y) => x.at - y.at)
    .map((x) => ({ ...x, date: formatDate(x.at) }));
  return due[0] || null;
}

// Хватит ли баланса на автопродления — по порядку дат, ближайшее первым:
// { [key]: { at, amount } } для сайтов, чей год баланс не покроет, — сколько
// не хватит и когда спишем. Покрытые сюда не попадают.
export function debitShortfall(sites, balance) {
  let left = balance;
  const short = {};
  sites
    .map((s) => ({ key: s.key, at: debitAt(s) }))
    .filter((x) => x.at)
    .sort((x, y) => x.at - y.at)
    .forEach(({ key, at }) => {
      if (left >= PRICE) left -= PRICE;
      else {
        short[key] = { at, amount: PRICE - left };
        left = 0;
      }
    });
  return short;
}

function patchSite(key, patchMain, patchDemo) {
  const a = loadAnketa();
  if (key === MAIN) {
    saveAnketa(patchMain(a));
    return;
  }
  saveAnketa({ extraSites: (a.extraSites || []).map((s) => (s.key === key ? { ...s, ...patchDemo(s) } : s)) });
}

// Тариф оплаченного сайта меняется с даты его продления — за текущий год уже
// заплачено по старому. До оплаты — сразу.
export function setSiteTariff(key, tariff, paid) {
  patchSite(
    key,
    (a) => (paid ? { siteNextTariff: tariff === mainTariff(a) ? null : tariff } : { siteTariff: tariff, siteNextTariff: null }),
    (s) => (paid ? { nextTariff: tariff === s.tariff ? null : tariff } : { tariff, nextTariff: null }),
  );
}

// Автопродление — только способ продлевать: выключенное не отключает сайт.
export function setSiteCancelled(key, cancelled) {
  patchSite(
    key,
    (a) => ({ billing: { ...a.billing, cancelled, cancelledAt: cancelled ? Date.now() : null } }),
    () => ({ cancelled }),
  );
}

// «Отключить сайт» / «Вернуть в подписку». Автопродление при этом не
// трогаем: вернувшийся сайт продлевается так же, как до отключения.
export function setSiteLeaving(key, leaving) {
  const at = leaving ? Date.now() : null;
  patchSite(
    key,
    (a) => ({ billing: { ...a.billing, leaving, leavingAt: at } }),
    () => ({ leaving, leavingAt: at }),
  );
}

// Оплата сайта: его год подписки начинается сейчас, со своей датой продления.
export function paySite(key) {
  patchSite(
    key,
    (a) => ({ billing: { ...a.billing, paidAt: Date.now(), paidAmount: PRICE, invoice: null, cancelled: false, leaving: false } }),
    () => ({ paidAt: Date.now(), invoice: null }),
  );
}

// ─── баланс аккаунта (партнёрская программа, 14.09) ─────────────────────
// Баланс один — у пользователя; у сайта своего нет. Пополняют баланс (картой
// или по счёту), а оплата года каждого сайта списывается с него: вручную
// («Оплатить год» / «Продлить ещё на год» — сразу) или автопродлением в дату
// продления. Операции — в истории для бухгалтерии.
export function balanceOf(a) {
  return a.billing?.balance || 0;
}

export function topUpBalance(amount, method) {
  const a = loadAnketa();
  const b = a.billing || {};
  saveAnketa({
    billing: {
      ...b,
      balance: (b.balance || 0) + amount,
      topupInvoice: null,
      ops: [...(b.ops || []), { at: Date.now(), kind: 'topup', amount, method }],
    },
  });
}

// Счёт на пополнение баланса — один на любую сумму, а не на каждый сайт.
export function issueTopupInvoice(amount, payer) {
  const a = loadAnketa();
  const seq = (a.billing?.invoiceSeq || 141) + 1;
  const invoice = { no: `${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`, at: Date.now(), payer, amount };
  saveAnketa({ billing: { ...a.billing, invoiceSeq: seq, topupInvoice: invoice } });
}

// Срок после оплаты года: оплачено — +12 месяцев к сроку; идёт пробный
// период — год начнётся после него (пробные дни не сгорают); иначе — сегодня.
function nextTerm(paidAt, paidYears, trialStartedAt) {
  if (paidAt) return { paidAt, paidYears: (paidYears || 1) + 1 };
  const trialEnd = trialEndAt({ trialStartedAt });
  if (trialEnd && trialEnd > Date.now()) return { paidAt: trialEnd, paidYears: 1 };
  return { paidAt: Date.now(), paidYears: 1 };
}

// Оплатить год сайта с баланса. false — не хватает денег.
export function payYearFromBalance(key) {
  const a = loadAnketa();
  const site = accountSites(a).find((x) => x.key === key);
  if (!site || balanceOf(a) < PRICE) return false;
  const b = a.billing || {};
  saveAnketa({
    billing: {
      ...b,
      balance: balanceOf(a) - PRICE,
      ops: [...(b.ops || []), { at: Date.now(), kind: 'debit', amount: PRICE, site: site.domain }],
    },
  });
  patchSite(
    key,
    (x) => ({ billing: { ...x.billing, ...nextTerm(x.billing?.paidAt, x.billing?.paidYears, x.trialStartedAt), paidAmount: PRICE, invoice: null } }),
    (s) => ({ ...nextTerm(s.paidAt, s.paidYears, s.trialStartedAt), invoice: null }),
  );
  return true;
}

// Когда с баланса спишут оплату сайта автопродлением, или null — не спишут.
export function nextDebit(site) {
  const at = debitAt(site);
  return at ? formatDate(at) : null;
}

// Счёт на один сайт. Номера сквозные на аккаунт — два разных счёта под одним
// номером быть не должно.
export function issueSiteInvoice(key, payer) {
  const a = loadAnketa();
  const seq = (a.billing?.invoiceSeq || 141) + 1;
  const invoice = { no: `${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`, at: Date.now(), payer, amount: PRICE };
  saveAnketa({ billing: { ...a.billing, invoiceSeq: seq } });
  patchSite(
    key,
    (x) => ({ billing: { ...x.billing, invoice } }),
    () => ({ invoice }),
  );
}

// ─── слова ───────────────────────────────────────────────────────────────
// Состояние словами карточки «Моих сайтов» — те же, что у основного сайта и
// в баннере «Обзора»: одно состояние — одно имя.
const CARD = {
  paid: 'Документы актуальны',
  'off-soon': 'Сайт отключается',
  off: 'Сайт отключён',
  pending: 'Счёт выставлен',
  expired: 'Пробный период закончился',
  trial: 'Пробный период',
  'not-ready': 'Документы собраны',
};
export function cardStatus(site) {
  const meta = site.kind === 'off-soon' ? `работает ${site.label}` : site.label;
  // В пробный период тариф ещё не действует — рядом с «Пробный период» его
  // название путало.
  return { label: CARD[site.kind], meta: site.kind === 'trial' || !site.tariff ? meta : `${meta} · ${site.tariff}`, tone: site.tone === 'muted' ? 'warn' : site.tone };
}

export function formatRub(n) {
  return `${n.toLocaleString('ru-RU')} ₽`;
}
