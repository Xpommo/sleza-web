'use client';

// Обвязка экранов сайта: знак, боковое меню, блок аккаунта. Раньше жила
// внутри обзора — теперь разделов сайта больше одного, и меню должно быть
// в одном месте, иначе пункты в нём разойдутся.

import Link from 'next/link';
import { ArrowLeftIcon, BillingIcon, DocsIcon, MonitorIcon, ProjectsIcon, SupportIcon } from '../../../../components/app/AppIcons';
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

// Разделы сайта. Подписки среди них нет — решение владельца 18 сентября:
// счёт, тариф, реквизиты плательщика и акты общие на все сайты аккаунта,
// поэтому «Подписка» живёт в аккаунтном меню, рядом с «Мои сайты». Пункт в
// меню сайта обещал бы «подписку этого сайта».
export const SITE_NAV = [
  { label: 'Обзор', Icon: ProjectsIcon, href: '/app/site' },
  { label: 'Документы', Icon: DocsIcon, href: '/app/site/documents' },
  { label: 'Виджет', Icon: MonitorIcon, href: '/app/site/widget' },
];

export const ACCOUNT_NAV = [
  { label: 'Мои сайты', Icon: ProjectsIcon, href: '/app/sites' },
  { label: 'Подписка', Icon: BillingIcon, href: '/app/billing' },
];

export { accountUser, CURRENT_USER };

// Один вид пункта меню на весь кабинет: раньше активный пункт в «Моих
// сайтах» был синим, а в разделах сайта — чёрным.
function NavList({ items, active, label }) {
  return (
    <nav aria-label={label} className="space-y-1">
      {items.map(({ label: l, Icon, href }) => (
        <Link
          key={l}
          href={href}
          aria-current={l === active ? 'page' : undefined}
          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${RING} ${
            l === active ? 'bg-ink font-bold text-white' : 'font-semibold text-ink/55 hover:bg-warm hover:text-ink'
          }`}
        >
          <Icon size={17} />
          {l}
        </Link>
      ))}
    </nav>
  );
}

function SidebarShell({ user, children, supportActive }) {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-line bg-white px-6 py-7 lg:sticky lg:top-0 lg:h-[calc(100vh-var(--cookie-banner-h,0px))] lg:w-[270px] lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-7 lg:pb-8 lg:pt-8">
      <div className="flex items-center gap-2.5">
        <TearMark />
        <span className="text-[17px] font-bold tracking-[-0.035em]">Слеза Белый Сайт</span>
      </div>

      {children}

      <div className="mt-auto hidden shrink-0 border-t border-line pt-5 lg:block">
        <Link
          href="/app/support"
          aria-current={supportActive ? 'page' : undefined}
          className={`mb-5 flex items-center gap-3 px-2 text-sm font-semibold transition hover:text-ink ${RING} ${supportActive ? 'text-ink' : 'text-ink/55'}`}
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
  );
}

export function SiteSidebar({ domain, active, user = CURRENT_USER }) {
  return (
    <SidebarShell user={user}>
      <Link
        href="/app/sites"
        className={`mt-10 flex w-fit items-center gap-2 rounded text-sm font-semibold text-ink/55 transition hover:text-ink ${RING}`}
      >
        <ArrowLeftIcon size={16} /> Мои сайты
      </Link>
      <div className="mt-7 border-t border-line pt-6">
        <p className="mb-3 truncate px-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink/45">{domain}</p>
        <NavList items={SITE_NAV} active={active} label="Разделы сайта" />
      </div>
    </SidebarShell>
  );
}

// Меню аккаунта — без «← Мои сайты» и без разделов сайта.
export function AccountSidebar({ active, user = CURRENT_USER, supportActive }) {
  return (
    <SidebarShell user={user} supportActive={supportActive}>
      <div className="mt-10">
        <NavList items={ACCOUNT_NAV} active={active} label="Основная навигация" />
      </div>
    </SidebarShell>
  );
}

// Заголовок раздела сайта — одна схема на все разделы (как в макете): H1 —
// имя раздела, под ним строка контекста с доменом. Раньше у «Обзора» H1 был
// домен, а у остальных — имя раздела, и структура менялась от вкладки к вкладке.
export function SiteHeader({ title, domain, context, children }) {
  return (
    <header>
      <h1 className="text-[28px] font-bold tracking-[-0.045em] sm:text-[36px]">{title}</h1>
      <p className="mt-2 text-[15px] text-ink/55">
        <span className="font-semibold text-ink/80">{domain}</span>
        {context && <> · {context}</>}
      </p>
      {children}
    </header>
  );
}
