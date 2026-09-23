'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BuildingIcon, ChevronIcon, GridIcon, ListIcon, PlusIcon,
  ClockIcon, OkIcon, ProjectsIcon, SupportIcon, WarnIcon,
} from '../../../components/app/AppIcons';
import { CURRENT_USER } from '../../../lib/appMock';
import { accountUser, loadAnketa } from '../start/_shared/anketaState';
import { AccountSidebar } from '../site/_shared/SiteChrome';
import { paidPeriod, subState, trialEnds } from '../site/_shared/subscription';
import { MAIN, accountSites, addSite, cardStatus, openSite, siteView } from '../site/_shared/sites';

// Сколько шагов анкеты уже отвечено — по тому, что реально сохранено.
// Прогресс не выдумываем: пустой ответ не считается пройденным шагом.
const STEP_URLS = ['profile', 'site', 'clients', 'requisites', 'documents', 'code'].map((s) => `/app/start/${s}`);

// Прогресс — сколько шагов засчитано по «Далее»; шестой засчитывается
// установкой кода. Раньше счёт шёл по наличию ответов, и шестым пунктом
// была сама установка: без кода на сайте 6 из 6 было недостижимо.
function anketaProgress(a) {
  return Math.min(a.stepsDone || 0, 5) + (a.installed ? 1 : 0);
}

// Статус карточки — подписи из живого макета (s-status): короткий статус и
// строка-пояснение под ним. У макета пять состояний; у нас есть ещё три
// (код не поставлен, код не найден в пробный период, сайт отключается) —
// они сказаны в той же форме, а не своим отдельным языком.
// tone: ok — всё работает и оплачено; info — идёт, ничего не сломано;
// warn — нужно действие.
function siteStatus(a, now = Date.now()) {
  const sub = subState(a, now);
  const open = { action: 'Открыть сайт', href: '/app/site' };
  // Отключают сайт в «Подписке» — туда и ведёт карточка (решение 23.09).
  if (a.billing?.cancelled && sub !== 'paid') return { tone: 'warn', label: 'Сайт отключён', meta: 'не оплачивается', action: 'Вернуть в подписку', href: '/app/billing' };
  if (sub === 'expired') return { tone: 'warn', label: 'Пробный период закончился', meta: 'виджет отключён', action: 'Оплатить', href: '/app/billing' };
  if (sub === 'pending') return { tone: 'info', label: 'Счёт выставлен', meta: 'оплата обычно проходит за 1–3 рабочих дня', ...open };
  if (sub === 'paid') {
    const to = paidPeriod(a.billing.paidAt).to;
    if (a.billing.cancelled) return { tone: 'warn', label: 'Сайт отключается', meta: `работает до ${to}`, ...open };
    // Те же слова, что в баннере «Обзора»: оплачено, но документы ещё не на сайте.
    if (!a.installed) return { tone: 'warn', label: 'Оплачено, ждём код на сайте', meta: `оплачено до ${to}`, action: 'Поставить код на сайт', href: STEP_URLS[5] };
    return { tone: 'ok', label: 'Документы актуальны', meta: `оплачено до ${to}`, ...open };
  }
  if (sub === 'trial') {
    const left = `бесплатно до ${trialEnds(a)}`;
    // Пробный период уже запущен, а код ещё не нашли: проверка идёт до 15
    // минут, и кабинет сайта уже открыт — туда и ведём, а не обратно в анкету.
    return { tone: 'info', label: 'Пробный период', meta: a.installed ? left : `${left} · код на сайте пока не найден`, ...open };
  }
  const done = a.stepsDone || 0;
  // Пакет собран после «Реквизитов»: дальше не хватает только кода.
  // Анкета пройдена, код отложен: документы собраны — те же слова, что в
  // «Обзоре» (FIXLOG: одно состояние не должно называться по-разному).
  if (done >= 4) return { tone: 'warn', label: 'Документы собраны', meta: 'код не установлен', action: 'Поставить код на сайт', href: STEP_URLS[5] };
  return { tone: 'warn', label: 'Документы не готовы', meta: 'анкета не закончена', action: 'Продолжить анкету', href: STEP_URLS[done] };
}

const TONE = {
  ok: ['border-ok/25 bg-ok/10 text-ok', OkIcon],
  info: ['border-brand/20 bg-brand/[0.06] text-brand', ClockIcon],
  warn: ['border-warn/30 bg-warn/10 text-warn', WarnIcon],
};

const RING = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15';


// Сайдбар аккаунта: только разделы уровня аккаунта. Документы и виджет
// принадлежат конкретному сайту и появляются внутри него, а не здесь.
// «Поддержка» — постоянный пункт, а не запрятанный в меню аккаунта.

const PRIMARY_BTN = `mt-7 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1a1acc] ${RING}`;
const ROW_BTN = `rounded-lg border border-line px-3 py-2 text-xs font-bold transition hover:border-brand hover:text-brand ${RING}`;

function plural(n, one, few, many) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

// Каждый настоящий сайт — со своим состоянием и прогрессом анкеты, по своей
// анкете (siteView); демо-строки пресета — по своим полям, как раньше.
function listSites(a) {
  return accountSites(a).map((s) => {
    if (s.demo) {
      const st = cardStatus(s);
      return { ...s, status: { ...st, action: 'Открыть сайт', href: '/app/site' }, finished: true, demoMeta: st.meta };
    }
    const view = s.key === MAIN ? a : siteView(a, a.extraSites.find((x) => x.key === s.key));
    const skip = view.skipProfile ? 1 : 0;
    const progress = anketaProgress(view);
    return {
      ...s,
      inn: view.inn || '',
      status: siteStatus(view),
      steps: progress - skip,
      total: 6 - skip,
      finished: progress >= 6 || Boolean(view.trialStartedAt),
    };
  });
}

function SiteCard({ site, onOpen }) {
  const [cls, Icon] = TONE[site.status.tone];
  return (
    <article className="rounded-2xl border border-line bg-white p-6 shadow-[0_18px_50px_-32px_rgba(17,17,16,0.35)] transition hover:-translate-y-0.5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/[0.08] text-brand">
              <BuildingIcon size={18} />
            </span>
            <h2 className="truncate text-[20px] font-bold tracking-[-0.03em]">{site.domain}</h2>
          </div>
          {site.company && <p className="mt-4 text-sm font-medium text-ink/70">{site.company}</p>}
        </div>
        <ChevronIcon size={19} className="mt-2 shrink-0 text-ink/25" />
      </div>

      <div className={`mt-6 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold ${cls}`}>
        <Icon size={15} /> {site.status.label}
      </div>
      <p className="mt-2 px-1 text-[12px] text-ink/60">
        {site.demo ? site.demoMeta : site.status.meta}
        {!site.demo && site.finished && site.tariff && site.kind !== 'trial' && ` · ${site.tariff}`}
      </p>

      {!site.demo && (
        <>
          <dl className="mt-6 space-y-3 text-sm">
            {site.inn && (
              <div className="flex items-center justify-between">
                <dt className="text-ink/60">ИНН</dt>
                <dd className="font-mono font-semibold text-ink/75">{site.inn}</dd>
              </div>
            )}
            {/* Прогресс нужен, пока анкета не пройдена; у работающего
                сайта «6 из 6» ничего не сообщает. У второго сайта шагов
                пять — профиль уже пройден на первом. */}
            {!site.finished && (
              <div className="flex items-center justify-between">
                <dt className="text-ink/60">Прогресс анкеты</dt>
                <dd className="font-semibold text-ink/75">
                  {site.steps} из {site.total}
                </dd>
              </div>
            )}
          </dl>
          {!site.finished && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(site.steps / site.total) * 100}%` }} />
            </div>
          )}
        </>
      )}

      <button type="button" onClick={onOpen} className={PRIMARY_BTN}>
        {site.status.action} <ChevronIcon size={16} />
      </button>
    </article>
  );
}

export default function SitesClient() {
  const router = useRouter();
  const [sites, setSites] = useState([]);
  const [view, setView] = useState('cards');
  const [user, setUser] = useState(CURRENT_USER);

  // Карточка появляется, как только анкета начата: сайт уже назван, и
  // прятать его до конца анкеты значит терять начатую работу.
  useEffect(() => {
    setUser(accountUser(CURRENT_USER));
    setSites(listSites(loadAnketa()));
  }, []);

  // Настоящий сайт становится открытым (его анкета и кабинет), демо —
  // открывается поверх основного.
  function open(site) {
    openSite(site.key);
    router.push(site.status.href);
  }

  const any = sites.length > 0;
  const anyFinished = sites.some((x) => !x.demo && x.finished);

  return (
    <main className="min-h-screen bg-warm text-ink lg:flex">
      <AccountSidebar active="Мои сайты" user={user} />

      <section className="flex-1 px-5 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12 xl:px-20">
        <div className="mx-auto max-w-5xl">
          <header>
            <h1 className="text-[28px] font-bold tracking-[-0.045em] sm:text-[36px]">Мои сайты</h1>
            <p className="mt-3 text-[15px] leading-6 text-ink/60">
              У каждого сайта свои документы, виджет, тариф и год подписки.
            </p>
          </header>

          {any ? (
            <>
              <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink/70">
                    {sites.length} {plural(sites.length, 'сайт', 'сайта', 'сайтов')}
                  </p>
                  <p className="mt-1 text-xs text-ink/60">Документы и виджет — внутри карточки сайта</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => router.push(addSite())}
                    className={`inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-bold shadow-sm transition hover:border-line-2 ${RING}`}
                  >
                    <PlusIcon size={16} /> Добавить сайт
                  </button>
                  <div className="flex h-10 items-center rounded-lg border border-line bg-white p-1 shadow-sm">
                    {[['cards', 'Карточки', GridIcon], ['table', 'Таблица', ListIcon]].map(([id, label, Icon]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setView(id)}
                        aria-pressed={view === id}
                        className={`flex h-8 items-center gap-2 rounded-md px-3 text-xs transition ${RING} ${
                          view === id ? 'bg-ink font-bold text-white' : 'font-semibold text-ink/60 hover:text-ink'
                        }`}
                      >
                        <Icon size={14} /> {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {view === 'cards' ? (
                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  {sites.map((x) => (
                    <SiteCard key={x.key} site={x} onOpen={() => open(x)} />
                  ))}
                </div>
              ) : (
                <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-line text-xs text-ink/60">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Сайт</th>
                        <th className="px-5 py-3 font-semibold">Состояние</th>
                        <th className="px-5 py-3 font-semibold">Анкета</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {sites.map((x, i) => (
                        <tr key={x.key} className={i ? 'border-t border-line' : ''}>
                          <td className="px-5 py-4">
                            <p className="font-bold">{x.domain}</p>
                            {x.company && <p className="mt-0.5 text-xs text-ink/60">{x.company}</p>}
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-ink/80">{x.status.label}</p>
                            <p className="mt-0.5 text-xs text-ink/60">{x.demo ? x.demoMeta : x.status.meta}</p>
                          </td>
                          <td className="px-5 py-4 text-ink/70">{x.finished ? 'пройдена' : `${x.steps} из ${x.total}`}</td>
                          <td className="px-5 py-4 text-right">
                            <button type="button" onClick={() => open(x)} className={ROW_BTN}>
                              {x.status.action} →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
          <div className="mt-8 flex min-h-[340px] items-center justify-center rounded-2xl border border-line bg-white p-8 shadow-[0_18px_50px_-32px_rgba(17,17,16,0.3)] sm:p-12">
            <div className="flex max-w-md flex-col items-center text-center">
              <div className="relative mb-7 flex h-20 w-20 items-center justify-center rounded-3xl border border-brand/15 bg-brand/[0.06] text-brand">
                <ProjectsIcon size={30} />
                <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white shadow-sm">
                  <PlusIcon size={17} />
                </span>
              </div>
              <h2 className="text-[22px] font-bold tracking-[-0.035em] sm:text-[26px]">Пока нет ни одного сайта</h2>
              <p className="mt-4 max-w-sm text-[15px] leading-6 text-ink/60">
                Добавьте сайт — спросим о нём и о компании, по ответам подготовим документы.
              </p>
              {/* Одна форма главного действия на экране: раньше «Добавить
                  сайт» существовала в трёх видах и менялась от того, как
                  переключён список. */}
              <button
                type="button"
                onClick={() => router.push(addSite())}
                className={`mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1a1acc] ${RING}`}
              >
                <PlusIcon size={17} /> Добавить сайт
              </button>
            </div>
          </div>
          )}
          <p className="mt-6 text-center text-xs text-ink/60">
            {any ? (anyFinished ? 'Отключить можно любой сайт по отдельности, в «Подписке» — остальные продолжат работать.' : null) : 'Документы и виджет появятся здесь после того, как сайт будет добавлен.'}
          </p>
        </div>
      </section>
    </main>
  );
}
