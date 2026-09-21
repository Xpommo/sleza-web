'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BillingIcon, PlusIcon, ProjectsIcon, SupportIcon } from '../../../components/app/AppIcons';
import { CURRENT_USER } from '../../../lib/appMock';

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
              {CURRENT_USER.name.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold">{CURRENT_USER.name}</p>
              <p className="mt-0.5 truncate text-xs text-ink/45">{CURRENT_USER.email}</p>
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

          <p className="mt-6 text-center text-xs text-ink/45">
            Документы и настройки появятся здесь после того, как сайт будет добавлен.
          </p>
        </div>
      </section>
    </main>
  );
}
