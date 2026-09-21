'use client';

// Обвязка экранов сайта: знак, боковое меню, блок аккаунта. Раньше жила
// внутри обзора — теперь разделов сайта больше одного, и меню должно быть
// в одном месте, иначе пункты в нём разойдутся.

import Link from 'next/link';
import { ArrowLeftIcon, DocsIcon, MonitorIcon, ProjectsIcon, SupportIcon } from '../../../../components/app/AppIcons';
import { CURRENT_USER } from '../../../../lib/appMock';
import { accountUser } from '../../start/_shared/anketaState';

export const RING = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15';

export function TearMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-brand">
      <path d="M12 2c4 4.6 7 8.4 7 12.2A7 7 0 1 1 5 14.2C5 10.4 8 6.6 12 2Z" fill="currentColor" />
      <path d="M9.4 14.6a2.9 2.9 0 0 0 2.9 2.6" stroke="#fff" strokeOpacity=".55" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// Разделы сайта, а не аккаунта: подписки здесь нет намеренно — карта и
// счета общие на все сайты, и три места для одной карты только путают.
// Внутри сайта о ней достаточно строки состояния.
export const SITE_NAV = [
  { label: 'Обзор', Icon: ProjectsIcon, href: '/app/site' },
  { label: 'Документы', Icon: DocsIcon, href: '/app/site/documents' },
  { label: 'Виджет', Icon: MonitorIcon, href: '/app/start/code' },
];

export { accountUser, CURRENT_USER };

export function SiteSidebar({ domain, active, user = CURRENT_USER }) {
  return (
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
        <p className="mb-3 truncate px-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink/45">{domain}</p>
        <nav aria-label="Разделы сайта" className="space-y-1">
          {SITE_NAV.map(({ label, Icon, href }) => (
            <Link
              key={label}
              href={href}
              aria-current={label === active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${RING} ${
                label === active ? 'bg-ink font-bold text-white' : 'font-semibold text-ink/55 hover:bg-warm hover:text-ink'
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
  );
}
