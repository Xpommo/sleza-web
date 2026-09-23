// Сайты аккаунта — одно место, где считается состояние каждого сайта.
//
// Модель (решения владельца 23.09):
// - у каждого сайта свой тариф, свой год подписки и своя дата продления:
//   сайт, добавленный посреди года, начинает свой отсчёт. Одна дата на все
//   сайты свела бы оплату в один счёт на сотни тысяч раз в год — такой счёт
//   клиент не оплатит;
// - общие на аккаунт — способ оплаты, карта, плательщик и почта для актов;
// - тарифом, оплатой и отключением управляют в «Подписке», в строке сайта.
//
// Прототип держит один настоящий сайт — тот, что прошёл анкету; его оплата
// лежит в `billing` анкеты рядом с настройками аккаунта (способ, карта,
// плательщик). Остальные (extraSites) — демо-строки пресета «Несколько
// сайтов» в панели «Макет», со своими trialStartedAt / paidAt / invoice.
// Демо-сайт открывается в свой кабинет: те же экраны, его домен, компания и
// состояние (siteAnketa), ответы анкеты — общие с основным.

import { loadAnketa, saveAnketa } from '../../start/_shared/anketaState';
import { PRICE, TARIFFS, paidPeriod, subState, trialEnds } from './subscription';

export const MAIN = 'main';
const CURRENT = 'current_site_v1';

function mainTariff(a) {
  return a.siteTariff || a.billing?.tariff || TARIFFS[0];
}

// ─── какой сайт открыт в кабинете ────────────────────────────────────────
export function setCurrentSite(key) {
  try {
    window.sessionStorage.setItem(CURRENT, key);
  } catch {
    /* без хранилища открывается основной сайт */
  }
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
    stepsDone: 5,
    installed: true,
    trialStartedAt: s.trialStartedAt,
    siteTariff: s.tariff,
    siteNextTariff: s.nextTariff || null,
    docEdits: s.docEdits || [],
    billing: { ...a.billing, paidAt: s.paidAt, invoice: s.invoice, cancelled: s.cancelled, paidAmount: PRICE },
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
  return { stepsDone: 5, installed: true, trialStartedAt: s.trialStartedAt, billing: { paidAt: s.paidAt, invoice: s.invoice } };
}

function describe(a, s, now) {
  const v = asAnketa(a, s);
  const state = subState(v, now);
  const period = v.billing?.paidAt ? paidPeriod(v.billing.paidAt) : null;
  if (s.cancelled) {
    return state === 'paid'
      ? { kind: 'off-soon', label: `отключается · до ${period.to}`, tone: 'warn', period }
      : { kind: 'off', label: 'отключён', tone: 'muted', period };
  }
  if (state === 'notstarted') {
    return (v.stepsDone || 0) >= 4
      ? { kind: 'not-ready', label: 'код не установлен', tone: 'warn', period }
      : { kind: 'not-ready', label: 'анкета не закончена', tone: 'warn', period };
  }
  if (state === 'paid') return { kind: 'paid', label: `оплачено до ${period.to}`, tone: 'ok', period };
  if (state === 'pending') return { kind: 'pending', label: 'ждёт оплаты по счёту', tone: 'info', period };
  if (state === 'expired') return { kind: 'expired', label: 'пробный период закончился', tone: 'warn', period };
  return { kind: 'trial', label: `пробный до ${trialEnds(v)}`, tone: 'info', period };
}

export function accountSites(a, now = Date.now()) {
  if (!a.domain) return [];
  const b = a.billing || {};
  const list = [
    {
      key: MAIN,
      domain: a.domain,
      company: a.companyName || '',
      tariff: mainTariff(a),
      nextTariff: a.siteNextTariff || null,
      cancelled: Boolean(b.cancelled),
      invoice: b.invoice || null,
      paidAt: b.paidAt || null,
      demo: false,
    },
    ...(a.extraSites || []).map((s) => ({ ...s, demo: true })),
  ];
  return list.map((s) => ({ ...s, ...describe(a, s, now), price: PRICE }));
}

// Ближайшее продление среди оплаченных сайтов — у каждого своя дата,
// поэтому показываем ближайшую, а не «общую».
export function nextRenewal(sites) {
  const due = sites
    .filter((s) => s.kind === 'paid')
    .map((s) => ({ site: s, date: s.period.renew, at: s.paidAt }))
    .sort((x, y) => x.at - y.at);
  return due[0] || null;
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

export function setSiteCancelled(key, cancelled) {
  patchSite(
    key,
    (a) => ({ billing: { ...a.billing, cancelled, cancelledAt: cancelled ? Date.now() : null } }),
    () => ({ cancelled }),
  );
}

// Оплата сайта: его год подписки начинается сейчас, со своей датой продления.
export function paySite(key) {
  patchSite(
    key,
    (a) => ({ billing: { ...a.billing, paidAt: Date.now(), paidAmount: PRICE, invoice: null, cancelled: false } }),
    () => ({ paidAt: Date.now(), invoice: null }),
  );
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
  const meta = site.kind === 'off-soon' ? site.label.replace('отключается · до', 'работает до') : site.label;
  return { label: CARD[site.kind], meta: `${meta} · ${site.tariff}`, tone: site.tone === 'muted' ? 'warn' : site.tone };
}

export function formatRub(n) {
  return `${n.toLocaleString('ru-RU')} ₽`;
}
