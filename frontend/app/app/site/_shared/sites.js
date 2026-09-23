// Сайты аккаунта — одно место, где считается состояние каждого сайта в
// подписке. Решение владельца 23.09: счёт общий, а тариф и отключение — у
// каждого сайта свои, и управляют ими в «Подписке». «Мои сайты», «Обзор» и
// «Подписка» берут состояние отсюда, чтобы не разойтись.
//
// Прототип держит один настоящий сайт — тот, что прошёл анкету. Остальные
// (extraSites) — демо-строки, их ставит пресет «Несколько сайтов» в панели
// «Макет»: чтобы было видно, как выглядит подписка агента или партнёра.

import { loadAnketa, saveAnketa } from '../../start/_shared/anketaState';
import { PRICE, TARIFFS, paidPeriod, subState, trialEnds } from './subscription';

export const MAIN = 'main';

function mainTariff(a) {
  return a.siteTariff || a.billing?.tariff || TARIFFS[0];
}

// Состояние сайта одной строкой: kind — для логики, label — для глаз.
// billable — входит ли в сумму счёта (отключённые и ещё не готовые — нет).
function describe(a, site, now) {
  const state = subState(a, now);
  const period = a.billing?.paidAt ? paidPeriod(a.billing.paidAt) : null;
  if (site.cancelled) {
    return state === 'paid'
      ? { kind: 'off-soon', label: `отключается · до ${period.to}`, tone: 'warn', billable: false }
      : { kind: 'off', label: 'отключён', tone: 'muted', billable: false };
  }
  if (site.key === MAIN && state === 'notstarted') {
    return (a.stepsDone || 0) >= 4
      ? { kind: 'not-ready', label: 'код не установлен', tone: 'warn', billable: false }
      : { kind: 'not-ready', label: 'анкета не закончена', tone: 'warn', billable: false };
  }
  if (state === 'paid') return { kind: 'paid', label: `оплачено до ${period.to}`, tone: 'ok', billable: true };
  if (state === 'pending') return { kind: 'pending', label: 'ждёт оплаты по счёту', tone: 'info', billable: true };
  if (state === 'expired') return { kind: 'expired', label: 'пробный период закончился', tone: 'warn', billable: true };
  return { kind: 'trial', label: `пробный до ${trialEnds(a)}`, tone: 'info', billable: true };
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
      demo: false,
    },
    ...(a.extraSites || []).map((s) => ({ ...s, demo: true })),
  ];
  return list.map((s) => ({ ...s, ...describe(a, s, now), price: PRICE }));
}

// Сумма счёта — только сайты, которые в подписке и готовы работать.
export function billableTotal(sites) {
  const n = sites.filter((s) => s.billable).length;
  return { count: n, amount: n * PRICE };
}

// Тариф оплаченной подписки меняется с даты продления — за текущий год уже
// заплачено по старому. До оплаты — сразу.
export function setSiteTariff(key, tariff, paid) {
  const a = loadAnketa();
  if (key === MAIN) {
    saveAnketa(paid ? { siteNextTariff: tariff === mainTariff(a) ? null : tariff } : { siteTariff: tariff, siteNextTariff: null });
    return;
  }
  saveAnketa({
    extraSites: (a.extraSites || []).map((s) =>
      s.key !== key ? s : paid ? { ...s, nextTariff: tariff === s.tariff ? null : tariff } : { ...s, tariff, nextTariff: null },
    ),
  });
}

export function setSiteCancelled(key, cancelled) {
  const a = loadAnketa();
  if (key === MAIN) {
    saveAnketa({ billing: { ...a.billing, cancelled, cancelledAt: cancelled ? Date.now() : null } });
    return;
  }
  saveAnketa({ extraSites: (a.extraSites || []).map((s) => (s.key === key ? { ...s, cancelled } : s)) });
}

// Состояние сайта словами карточки «Моих сайтов» — те же, что у основного
// сайта и в баннере «Обзора»: одно состояние — одно имя.
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
