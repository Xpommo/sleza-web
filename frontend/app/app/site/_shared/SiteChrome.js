'use client';

// Обвязка экранов сайта: знак, боковое меню, блок аккаунта. Раньше жила
// внутри обзора — теперь разделов сайта больше одного, и меню должно быть
// в одном месте, иначе пункты в нём разойдутся.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeftIcon, BillingIcon, ChevronDownIcon, DocsIcon, LogoutIcon, MonitorIcon, ProjectsIcon, SettingsIcon, SupportIcon,
} from '../../../../components/app/AppIcons';
import { CURRENT_USER } from '../../../../lib/appMock';
import { accountUser, loadAnketa, rememberReturn, returnPath } from '../../start/_shared/anketaState';

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
            l === active ? 'bg-ink font-bold text-white' : 'font-semibold text-ink/60 hover:bg-warm hover:text-ink'
          }`}
        >
          <Icon size={17} />
          {l}
        </Link>
      ))}
    </nav>
  );
}

// Экран, с которого пришли в Настройки, — туда их «← Назад».
export function useRememberReturn() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname && !pathname.includes('/app/settings')) rememberReturn(pathname.replace(/\/$/, ''));
  }, [pathname]);
}

const MENU_ITEM = `flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-[14px] font-semibold text-ink/70 transition hover:bg-warm hover:text-ink ${RING}`;

// Пункты меню аккаунта. full — на телефоне, где сайдбара нет: там это
// единственный путь в «Мои сайты», «Подписку» и «Поддержку» (лист «Ещё»
// живого макета). На широком экране они уже стоят в сайдбаре, и в меню
// остаются только Настройки и Выход.
// «Выйти» ведёт туда, откуда входят, и ничего не сбрасывает: следующий вход
// показывает тот же кабинет (макет, FIXLOG d736f60 — «Выйти» не мёртвая).
function MenuItems({ full, onPick }) {
  const router = useRouter();
  const items = [
    ...(full ? [['Мои сайты', ProjectsIcon, '/app/sites'], ['Подписка', BillingIcon, '/app/billing'], ['Поддержка', SupportIcon, '/app/support']] : []),
    ['Настройки', SettingsIcon, '/app/settings'],
  ];
  return (
    <>
      {items.map(([label, Icon, href]) => (
        <Link key={href} href={href} role="menuitem" className={MENU_ITEM} onClick={onPick}>
          <Icon size={16} /> {label}
        </Link>
      ))}
      <div className="mx-1 my-1 h-px bg-line" />
      <button
        type="button"
        role="menuitem"
        className={MENU_ITEM}
        onClick={() => {
          onPick();
          router.push('/app/login');
        }}
      >
        <LogoutIcon size={16} /> Выйти
      </button>
    </>
  );
}

function useEscape(open, close) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);
}

// Меню аккаунта на аватаре (живой макет, .acct-menu). compact — одна
// аватарка в верхней строке телефона, меню вниз и полное; иначе — блок
// внизу сайдбара, меню вверх.
export function AccountMenu({ user, compact = false }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  useEscape(open, () => {
    setOpen(false);
    btnRef.current?.focus();
  });

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={compact ? `Меню аккаунта: ${user.name}` : undefined}
        className={`flex items-center gap-3 rounded-xl text-left transition ${RING} ${
          compact ? 'p-0.5' : `w-full px-1 py-1 hover:bg-warm ${open ? 'bg-warm' : ''}`
        }`}
      >
        <span className={`flex shrink-0 items-center justify-center rounded-full bg-ink font-bold text-white ${compact ? 'h-9 w-9 text-[13px]' : 'h-10 w-10 text-sm'}`}>
          {user.name.slice(0, 1)}
        </span>
        {!compact && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-ink">{user.name}</span>
              <span className="mt-0.5 block truncate text-xs text-ink/60">{user.email}</span>
            </span>
            <ChevronDownIcon size={15} className={`shrink-0 text-ink/35 transition-transform ${open ? '' : 'rotate-180'}`} />
          </>
        )}
      </button>

      {/* Прозрачный ловец: клик мимо меню только закрывает его и не
          нажимает то, что под курсором. */}
      {open && <div className="fixed inset-0 z-30" aria-hidden="true" onClick={() => setOpen(false)} />}

      {open && (
        <div
          role="menu"
          aria-label="Меню аккаунта"
          className={`absolute z-40 rounded-xl border border-line bg-white p-1.5 shadow-[0_18px_40px_-18px_rgba(17,17,16,0.35)] ${
            compact ? 'right-0 top-[calc(100%+6px)] w-[230px]' : 'bottom-[calc(100%+6px)] left-0 right-0'
          }`}
        >
          {compact && (
            <div className="border-b border-line px-2.5 pb-2 pt-1">
              <p className="truncate text-[13px] font-bold">{user.name}</p>
              <p className="truncate text-[12px] text-ink/60">{user.email}</p>
            </div>
          )}
          <div className={compact ? 'pt-1' : ''}>
            <MenuItems full={compact} onPick={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

// Нижняя панель на телефоне занимает низ экрана — отступ под неё задаёт
// body.has-bottombar (globals.css), чтобы последний блок не уезжал под неё.
export function useBottomBar() {
  useEffect(() => {
    document.body.classList.add('has-bottombar');
    return () => document.body.classList.remove('has-bottombar');
  }, []);
}

// Таббар сайта на телефоне (живой макет, #tabbar): разделы сайта всегда под
// пальцем, «Ещё» — лист с аккаунтом. Вместо сайдбара, который на узком
// экране вставал сверху стопкой и съедал пол-экрана до содержимого.
export function SiteTabbar({ active }) {
  const [more, setMore] = useState(false);
  useBottomBar();
  useEscape(more, () => setMore(false));
  const tab = (on) => `flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold transition ${RING} ${on ? 'text-ink' : 'text-ink/60'}`;
  return (
    <>
      {more && <div className="fixed inset-0 z-40 bg-ink/20 lg:hidden" aria-hidden="true" onClick={() => setMore(false)} />}
      {more && (
        <div role="menu" aria-label="Ещё" className="fixed inset-x-3 bottom-[calc(72px+env(safe-area-inset-bottom))] z-50 rounded-2xl border border-line bg-white p-2 shadow-xl lg:hidden">
          <MenuItems full onPick={() => setMore(false)} />
        </div>
      )}
      <nav
        aria-label="Разделы сайта"
        className="fixed inset-x-0 bottom-0 z-50 flex border-t border-line bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {/* Порядок — по частоте справа налево, под большой палец правши:
            «Обзор» ближе всего, «Документы» в центре (решение макета). */}
        {TAB_ORDER.map((i) => SITE_NAV[i]).map(({ label, Icon, href }) => (
          <Link key={href} href={href} aria-current={label === active ? 'page' : undefined} className={tab(label === active)}>
            <span className={`flex h-8 w-12 items-center justify-center rounded-full ${label === active ? 'bg-ink text-white' : ''}`}>
              <Icon size={18} />
            </span>
            {label}
          </Link>
        ))}
        <button type="button" onClick={() => setMore(!more)} aria-expanded={more} className={tab(more || !active)}>
          <span className={`flex h-8 w-12 items-center justify-center rounded-full ${more || !active ? 'bg-ink text-white' : ''}`}>
            <MoreIcon />
          </span>
          Ещё
        </button>
      </nav>
    </>
  );
}

const TAB_ORDER = [2, 1, 0];

function MoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

// Сайдбар — один на весь кабинет, включая анкету: знак, содержимое раздела,
// внизу «Поддержка» и аккаунт. На телефоне от него остаётся верхняя строка —
// знак и аватар с меню; навигацию несут нижние панели.
export function SidebarShell({ user, children, supportActive, bottomBar }) {
  useRememberReturn();
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-line bg-white px-5 py-4 lg:sticky lg:top-0 lg:h-[calc(100vh-var(--cookie-banner-h,0px))] lg:w-[270px] lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-7 lg:pb-8 lg:pt-8">
      <div className="flex items-center gap-2.5">
        <Link href="/app/sites" className={`flex items-center gap-2.5 rounded-lg ${RING}`} aria-label="Слеза Белый Сайт — мои сайты">
          <TearMark />
          <span className="text-[17px] font-bold tracking-[-0.035em]">Слеза Белый Сайт</span>
        </Link>
        <div className="ml-auto lg:hidden">
          <AccountMenu user={user} compact />
        </div>
      </div>

      <div className="hidden lg:block">{children}</div>

      <div className="mt-auto hidden shrink-0 border-t border-line pt-5 lg:block">
        <Link
          href="/app/support"
          aria-current={supportActive ? 'page' : undefined}
          className={`mb-5 flex items-center gap-3 px-2 text-sm font-semibold transition hover:text-ink ${RING} ${supportActive ? 'text-ink' : 'text-ink/60'}`}
        >
          <SupportIcon size={17} /> Поддержка
        </Link>
        <AccountMenu user={user} />
      </div>
      {bottomBar}
    </aside>
  );
}

export function SiteSidebar({ domain, active, user = CURRENT_USER }) {
  return (
    <SidebarShell user={user} bottomBar={<SiteTabbar active={active} />}>
      <Link
        href="/app/sites"
        className={`mt-10 flex w-fit items-center gap-2 rounded text-sm font-semibold text-ink/60 transition hover:text-ink ${RING}`}
      >
        <ArrowLeftIcon size={16} /> Мои сайты
      </Link>
      <div className="mt-7 border-t border-line pt-6">
        <p className="mb-3 truncate px-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink/60">{domain}</p>
        <NavList items={SITE_NAV} active={active} label="Разделы сайта" />
      </div>
    </SidebarShell>
  );
}

// Меню аккаунта — без «← Мои сайты» и без разделов сайта.
// Таббар сайта на аккаунтных экранах — только когда сайт есть (в макете
// «Подписка», «Поддержка» и «Настройки» подсвечивают в нём «Ещё»). В «Моих
// сайтах» его нет: там сайт ещё не выбран.
function useHasSite() {
  const [has, setHas] = useState(false);
  useEffect(() => setHas(Boolean(loadAnketa().domain)), []);
  return has;
}

export function AccountSidebar({ active, user = CURRENT_USER, supportActive }) {
  const hasSite = useHasSite();
  return (
    <SidebarShell user={user} supportActive={supportActive} bottomBar={hasSite && active !== 'Мои сайты' ? <SiteTabbar /> : null}>
      <div className="mt-10">
        <NavList items={ACCOUNT_NAV} active={active} label="Основная навигация" />
      </div>
    </SidebarShell>
  );
}

// Настройки — уровень аккаунта, общие для всех сайтов: в сайдбаре только
// сам раздел и «← Назад» туда, откуда пришли (живой макет, s-settings).
export function SettingsSidebar({ user = CURRENT_USER }) {
  const router = useRouter();
  const hasSite = useHasSite();
  return (
    <SidebarShell user={user} bottomBar={hasSite ? <SiteTabbar /> : null}>
      <button
        type="button"
        onClick={() => router.push(returnPath())}
        className={`mt-10 flex w-fit items-center gap-2 rounded text-sm font-semibold text-ink/60 transition hover:text-ink ${RING}`}
      >
        <ArrowLeftIcon size={16} /> Назад
      </button>
      <div className="mt-7 border-t border-line pt-6">
        <NavList items={[{ label: 'Настройки', Icon: SettingsIcon, href: '/app/settings' }]} active="Настройки" label="Аккаунт" />
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
      <p className="mt-2 text-[15px] text-ink/60">
        <span className="font-semibold text-ink/80">{domain}</span>
        {context && <> · {context}</>}
      </p>
      {children}
    </header>
  );
}
