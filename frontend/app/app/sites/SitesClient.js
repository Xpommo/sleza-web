'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BillingIcon, BuildingIcon, ChevronIcon, GridIcon, ListIcon, PlusIcon,
  ProjectsIcon, SupportIcon, WarnIcon,
} from '../../../components/app/AppIcons';
import { CURRENT_USER } from '../../../lib/appMock';
import { accountUser, loadAnketa } from '../start/_shared/anketaState';

// Сколько шагов анкеты уже отвечено — по тому, что реально сохранено.
// Прогресс не выдумываем: пустой ответ не считается пройденным шагом.
function anketaProgress(a) {
  const done = [a.role, a.domain, a.purposes?.length, a.owner, a.installed || a.owner, a.installed];
  return done.filter(Boolean).length;
}

// Статус карточки — то же правило, что в кабинете: пока анкета не пройдена,
// документов ещё нет; пройдена, но кода на сайте нет — «скрипт не установлен».
function siteStatus(a, steps) {
  if (steps < 6 && !a.installed) {
    return steps < 4
      ? { tone: 'warn', label: 'Анкета не закончена', action: 'Продолжить анкету', href: '/app/start/profile' }
      : { tone: 'warn', label: 'Документы не готовы', action: 'Продолжить анкету', href: '/app/start/requisites' };
  }
  if (!a.installed) {
    return { tone: 'warn', label: 'Скрипт не установлен', action: 'Поставить код на сайт', href: '/app/start/code' };
  }
  return { tone: 'ok', label: 'Виджет работает', action: 'Открыть сайт', href: '/app/site' };
}

const RING = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15';

function TearMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-brand">
      <path d="M12 2c4 4.6 7 8.4 7 12.2A7 7 0 1 1 5 14.2C5 10.4 8 6.6 12 2Z" fill="currentColor" />
      <path d="M9.4 14.6a2.9 2.9 0 0 0 2.9 2.6" stroke="#fff" strokeOpacity=".55" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// Сайдбар аккаунта: только разделы уровня аккаунта. Документы и виджет
// принадлежат конкретному сайту и появляются внутри него, а не здесь.
// «Поддержка» — постоянный пункт, а не запрятанный в меню аккаунта.
const NAV = [
  { href: '/app/sites', label: 'Мои сайты', Icon: ProjectsIcon, active: true },
  { href: '#', label: 'Подписка', Icon: BillingIcon },
];

export default function SitesClient() {
  const router = useRouter();
  const [site, setSite] = useState(null);
  const [steps, setSteps] = useState(0);
  const [view, setView] = useState('cards');
  const [user, setUser] = useState(CURRENT_USER);

  // Карточка появляется, как только анкета начата: сайт уже назван, и
  // прятать его до конца анкеты значит терять начатую работу.
  useEffect(() => {
    const a = loadAnketa();
    setUser(accountUser(CURRENT_USER));
    if (!a.domain) return;
    setSite({ domain: a.domain, inn: a.inn || '', company: a.companyName || '' });
    setSteps(anketaProgress(a));
  }, []);

  const status = site ? siteStatus(loadAnketa(), steps) : null;

  return (
    <main className="min-h-screen bg-warm text-ink lg:flex">
      <aside className="flex w-full shrink-0 flex-col border-b border-line bg-white px-6 py-7 lg:sticky lg:top-0 lg:h-screen lg:w-[270px] lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-7 lg:pb-8 lg:pt-8">
        <div className="flex items-center gap-2.5">
          <TearMark />
          <span className="text-[17px] font-bold tracking-[-0.035em]">Слеза Белый Сайт</span>
        </div>

        <nav aria-label="Основная навигация" className="mt-10 space-y-1">
          {NAV.map(({ href, label, Icon, active }) => (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${RING} ${
                active ? 'bg-brand/[0.08] font-bold text-brand' : 'font-semibold text-ink/55 hover:bg-warm hover:text-ink'
              }`}
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto hidden shrink-0 border-t border-line pt-5 lg:block">
          <Link
            href="#"
            className={`mb-5 flex items-center gap-3 px-2 text-sm font-semibold text-ink/55 transition hover:text-ink ${RING}`}
          >
            <SupportIcon size={17} /> Поддержка
          </Link>
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">
              {user.name.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold">{user.name}</p>
              <p className="mt-0.5 truncate text-xs text-ink/45">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <section className="flex-1 px-5 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12 xl:px-20">
        <div className="mx-auto max-w-5xl">
          <header>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-brand">Рабочее пространство</p>
            <h1 className="text-[28px] font-bold tracking-[-0.045em] sm:text-[36px]">Мои сайты</h1>
            <p className="mt-3 text-[15px] leading-6 text-ink/55">
              У каждого сайта свои документы, свой виджет и своя подписка.
            </p>
          </header>

          {site ? (
            <>
              <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink/70">1 сайт в рабочем пространстве</p>
                  <p className="mt-1 text-xs text-ink/45">Документы и настройки доступны внутри карточки</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => router.push('/app/start/profile')}
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
                          view === id ? 'bg-ink font-bold text-white' : 'font-semibold text-ink/45 hover:text-ink'
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

                    <div
                      className={`mt-6 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold ${
                        status.tone === 'ok' ? 'border-ok/25 bg-ok/10 text-ok' : 'border-warn/30 bg-warn/10 text-warn'
                      }`}
                    >
                      <WarnIcon size={15} /> {status.label}
                    </div>

                    <dl className="mt-6 space-y-3 text-sm">
                      {site.inn && (
                        <div className="flex items-center justify-between border-b border-line pb-3">
                          <dt className="text-ink/45">ИНН</dt>
                          <dd className="font-mono font-semibold text-ink/75">{site.inn}</dd>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <dt className="text-ink/45">Прогресс анкеты</dt>
                        <dd className="font-semibold text-ink/75">{steps} из 6</dd>
                      </div>
                    </dl>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(steps / 6) * 100}%` }} />
                    </div>

                    <button
                      type="button"
                      onClick={() => router.push(status.href)}
                      className={`mt-7 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1a1acc] ${RING}`}
                    >
                      {status.action} <ChevronIcon size={16} />
                    </button>
                  </article>
                </div>
              ) : (
                <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-line text-xs text-ink/45">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Сайт</th>
                        <th className="px-5 py-3 font-semibold">Состояние</th>
                        <th className="px-5 py-3 font-semibold">Анкета</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-5 py-4">
                          <p className="font-bold">{site.domain}</p>
                          {site.company && <p className="mt-0.5 text-xs text-ink/50">{site.company}</p>}
                        </td>
                        <td className="px-5 py-4 text-ink/70">{status.label}</td>
                        <td className="px-5 py-4 text-ink/70">{steps} из 6</td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => router.push(status.href)}
                            className={`rounded-lg border border-line px-3 py-2 text-xs font-bold transition hover:border-brand hover:text-brand ${RING}`}
                          >
                            {status.action} →
                          </button>
                        </td>
                      </tr>
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
              <p className="mt-4 max-w-sm text-[15px] leading-6 text-ink/55">
                Добавьте сайт — спросим о нём и о компании, по ответам подготовим документы.
              </p>
              {/* Одна форма главного действия на экране: раньше «Добавить
                  сайт» существовала в трёх видах и менялась от того, как
                  переключён список. */}
              <button
                type="button"
                onClick={() => router.push('/app/start/profile')}
                className={`mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1a1acc] ${RING}`}
              >
                <PlusIcon size={17} /> Добавить сайт
              </button>
            </div>
          </div>
          )}
          <p className="mt-6 text-center text-xs text-ink/45">
            {site ? 'Каждый сайт держит свои документы, виджет и подписку отдельно.' : 'Документы и настройки появятся здесь после того, как сайт будет добавлен.'}
          </p>
        </div>
      </section>
    </main>
  );
}
