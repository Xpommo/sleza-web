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
import BillingClient from '../billing/BillingClient';

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
  // Отключают сайт в «Моих сайтах», вид «Таблица» (владелец 24.09).
  if (sub === 'expired') return { tone: 'warn', label: 'Пробный период закончился', meta: 'виджет отключён', action: 'Оплатить', href: '/app/sites?view=table&pay=current' };
  if (sub === 'pending') return { tone: 'info', label: 'Счёт выставлен', meta: 'оплата обычно проходит за 1–3 рабочих дня', ...open };
  if (sub === 'paid') {
    const to = paidPeriod(a.billing.paidAt, a.billing.paidYears).to;
    // Отключают сайт в «⋯» строки в виде «Таблица»; выключенное автопродление — не уход,
    // а продление вручную: карточка та же, что у оплаченного (владелец 24.09).
    if (a.billing.leaving) return { tone: 'warn', label: 'Сайт отключается', meta: `работает до ${to}`, ...open };
    // Те же слова, что в баннере «Обзора»: оплачено, но документы ещё не на сайте.
    if (!a.installed) return { tone: 'warn', label: 'Оплачено, ждём код на сайте', meta: `оплачено до ${to}`, action: 'Поставить код на сайт', href: STEP_URLS[5] };
    return { tone: 'ok', label: 'Документы актуальны', meta: `оплачено до ${to}`, ...open };
  }
  if (sub === 'trial') {
    if (a.billing?.leaving) return { tone: 'warn', label: 'Сайт отключается', meta: `работает до ${trialEnds(a)}`, ...open };
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
  warn: ['border-warn/30 bg-warn/10 text-warn-ink', WarnIcon],
};

const RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';


// Сайдбар аккаунта: только разделы уровня аккаунта. Документы и виджет
// принадлежат конкретному сайту и появляются внутри него, а не здесь.
// «Поддержка» — постоянный пункт, а не запрятанный в меню аккаунта.

const PRIMARY_BTN = `mt-7 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1a1acc] ${RING}`;

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
    // Оплата сайта с «Обзора» и из карточки ведёт сюда, в таблицу, где год
    // оплачивают в строке сайта (владелец 24.09).
    const q = new URLSearchParams(window.location.search);
    if (q.get('view') === 'table' || q.get('pay') || q.get('tariff')) setView('table');
  }, []);

  // Настоящий сайт становится открытым (его анкета и кабинет), демо —
  // открывается поверх основного.
  function open(site) {
    openSite(site.key);
    // «Оплатить» из карточки — та же страница, вид «Таблица» с оплатой этого
    // сайта: адрес меняем сразу, таблица читает его при появлении.
    if (site.status.href.startsWith('/app/sites?')) {
      window.history.replaceState(null, '', `${window.location.pathname}?${site.status.href.split('?')[1]}`);
      setView('table');
      return;
    }
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
            {/* Без поясняющих строк (владелец 24.09): страница начинается с дела. */}
            <h1 className="text-[28px] font-bold tracking-[-0.045em] sm:text-[36px] lg:sr-only">Мои сайты</h1>
          </header>

          {any ? (
            <>
              <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between lg:mt-0">
                <div>
                  <p className="text-sm font-semibold text-ink/70">
                    {sites.length} {plural(sites.length, 'сайт', 'сайта', 'сайтов')}
                  </p>
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
                // «Таблица» — сайты и их подписка: тариф, статус, автопродление,
                // «⋯», оплата года прямо в строке (владелец 24.09, по образцу
                // регистраторов: за что платим — у самого сайта).
                <div className="mt-6">
                  <BillingClient mode="sites" />
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
            {any ? (anyFinished && view === 'cards' ? 'Тариф, автопродление и оплата года каждого сайта — в виде «Таблица».' : null) : 'Документы и виджет появятся здесь после того, как сайт будет добавлен.'}
          </p>
        </div>
      </section>
    </main>
  );
}
