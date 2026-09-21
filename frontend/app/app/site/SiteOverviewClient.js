'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon, ArrowRightIcon, CheckIcon, DocsIcon, MonitorIcon,
  ProjectsIcon, ShieldCheckIcon, SupportIcon,
} from '../../../components/app/AppIcons';
import { CURRENT_USER } from '../../../lib/appMock';
import { accountUser, loadAnketa } from '../start/_shared/anketaState';

const RING = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15';
const TRIAL_HOURS = 24;

function TearMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-brand">
      <path d="M12 2c4 4.6 7 8.4 7 12.2A7 7 0 1 1 5 14.2C5 10.4 8 6.6 12 2Z" fill="currentColor" />
      <path d="M9.4 14.6a2.9 2.9 0 0 0 2.9 2.6" stroke="#fff" strokeOpacity=".55" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// Разделы сайта, а не аккаунта: подписки здесь нет намеренно — карта и
// счета общие на все сайты, и три места для одной карты только путают. Внутри
// сайта о ней достаточно строки состояния.
const SITE_NAV = [
  { label: 'Обзор', Icon: ProjectsIcon, active: true, href: '/app/site' },
  { label: 'Документы', Icon: DocsIcon, href: '/app/start/documents' },
  { label: 'Виджет', Icon: MonitorIcon, href: '/app/start/code' },
];

function formatLeft(ms) {
  if (ms <= 0) return 'истёк';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h} ч ${m} мин`;
}

export default function SiteOverviewClient() {
  const router = useRouter();
  const [site, setSite] = useState(null);
  const [user, setUser] = useState(CURRENT_USER);
  const [left, setLeft] = useState(TRIAL_HOURS * 3600000);

  useEffect(() => {
    const a = loadAnketa();
    if (!a.domain) {
      router.replace('/app/sites');
      return;
    }
    setUser(accountUser(CURRENT_USER));
    setSite({
      domain: a.domain,
      company: a.companyName || '',
      inn: a.inn || '',
      installed: Boolean(a.installed),
      startedAt: a.trialStartedAt || Date.now(),
    });
  }, [router]);

  // Отсчёт идёт от активации, а не от установки кода: так и обещано на
  // шаге установки.
  useEffect(() => {
    if (!site) return;
    const tick = () => setLeft(site.startedAt + TRIAL_HOURS * 3600000 - Date.now());
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [site]);

  if (!site) return null;

  const docsReady = site.installed;

  return (
    <main className="min-h-screen bg-warm text-ink lg:flex">
      <aside className="flex w-full shrink-0 flex-col border-b border-line bg-white px-6 py-7 lg:sticky lg:top-0 lg:h-screen lg:w-[270px] lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-7 lg:pb-8 lg:pt-8">
        <div className="flex items-center gap-2.5">
          <TearMark />
          <span className="text-[17px] font-bold tracking-[-0.035em]">Слеза Белый Сайт</span>
        </div>

        <Link
          href="/app/sites"
          className={`mt-10 flex w-fit items-center gap-2 rounded text-sm font-semibold text-ink/55 transition hover:text-ink ${RING}`}
        >
          <ArrowLeftIcon size={16} /> Мои сайты
        </Link>

        <div className="mt-7 border-t border-line pt-6">
          <p className="mb-3 truncate px-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink/45">{site.domain}</p>
          <nav aria-label="Разделы сайта" className="space-y-1">
            {SITE_NAV.map(({ label, Icon, active, href }) => (
              <Link
                key={label}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${RING} ${
                  active ? 'bg-ink font-bold text-white' : 'font-semibold text-ink/55 hover:bg-warm hover:text-ink'
                }`}
              >
                <Icon size={17} />
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-auto hidden shrink-0 border-t border-line pt-5 lg:block">
          <Link href="#" className={`mb-5 flex items-center gap-3 px-2 text-sm font-semibold text-ink/55 transition hover:text-ink ${RING}`}>
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
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-brand">Обзор сайта</p>
            <h1 className="text-[28px] font-bold tracking-[-0.045em] sm:text-[36px]">{site.domain}</h1>
            <p className="mt-3 text-[15px] text-ink/55">
              {[site.company, site.inn && `ИНН ${site.inn}`].filter(Boolean).join(' · ')}
              {(site.company || site.inn) && ' · '}
              <Link href="/app/start/requisites" className="font-semibold text-brand hover:underline">
                Изменить
              </Link>
            </p>
          </header>

          {/* Пробный период включается установкой, а не оплатой: 24 часа
              документы и виджет работают до первого платежа. */}
          <section className="mt-8 flex flex-col gap-6 rounded-2xl border border-warn/30 bg-warn/[0.06] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-warn">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-warn/15">
                  <ShieldCheckIcon size={17} />
                </span>
                Пробный период — осталось {formatLeft(left)}
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/65">
                Когда он закончится, виджет снимется с сайта: cookie-баннер и подвал со ссылками перестанут
                показываться посетителям. Документы останутся в кабинете на просмотр.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/app/sites')}
              className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1a1acc] ${RING}`}
            >
              Оплатить <ArrowRightIcon size={16} />
            </button>
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink/45">Подписка</p>
                  <h2 className="mt-3 text-2xl font-bold tracking-[-0.04em]">Пробный период</h2>
                </div>
                <span className="shrink-0 rounded-full bg-warn/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-warn">
                  Не оплачен
                </span>
              </div>
              <p className="mt-6 text-sm text-ink/55">Счёт, тариф и акты — общие для всех сайтов аккаунта.</p>
              <div className="mt-5 border-t border-line pt-5">
                <Link href="/app/sites" className="text-sm font-semibold text-brand hover:underline">
                  Открыть подписку аккаунта →
                </Link>
              </div>
            </article>

            <article className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink/45">Документы</p>
                  <h2 className="mt-3 text-2xl font-bold tracking-[-0.04em]">{docsReady ? 'Действуют' : 'Не опубликованы'}</h2>
                </div>
                <span
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] ${
                    docsReady ? 'bg-ok/10 text-ok' : 'bg-warn/10 text-warn'
                  }`}
                >
                  {docsReady && <CheckIcon size={13} />}
                  {docsReady ? 'На сайте' : 'Ждут кода'}
                </span>
              </div>
              <p className="mt-6 text-sm text-ink/55">
                {docsReady
                  ? 'Пять документов открыты по постоянным адресам — ссылки не ломаются.'
                  : 'Документы собраны, но появятся на сайте после установки кода.'}
              </p>
              <div className="mt-5 border-t border-line pt-5">
                <Link
                  href="/app/start/documents"
                  className={`inline-block rounded-lg border border-line px-4 py-2 text-sm font-bold transition hover:border-brand hover:text-brand ${RING}`}
                >
                  Все документы →
                </Link>
              </div>
            </article>
          </div>

          <section className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7">
            <p className="text-sm font-semibold text-ink/45">Активность</p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em]">Последние события</h2>
            <div className="relative mt-7 space-y-6 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-line">
              {[
                ['Сегодня', site.installed ? 'Скрипт найден на сайте, пробный период запущен' : 'Сайт добавлен в рабочее пространство', 'bg-brand'],
                ['Сегодня', 'Документы собраны по ответам анкеты', 'bg-ok'],
              ].map(([when, what, dot], i) => (
                <div key={i} className="relative flex gap-4">
                  <span className={`z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-4 border-white ${dot}`} />
                  <div>
                    <p className="text-sm font-bold">{when}</p>
                    <p className="mt-1 text-sm text-ink/55">{what}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 border-t border-line pt-5 text-[13px] text-ink/50">
              Сами сверяем закон и переписываем документы, когда он меняется, — напишем письмом.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
