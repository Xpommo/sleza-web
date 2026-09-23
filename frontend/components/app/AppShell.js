'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import FlashlightIcon from '../FlashlightIcon';
import { ProjectsIcon, DocsIcon, MonitorIcon, BillingIcon, BurgerIcon, CloseIcon } from './AppIcons';
import AccountMenu from './AccountMenu';
import { MockProvider, useMock } from './MockControls';
import { terms } from '../../lib/appMock';

// Каркас кабинета. В макете два варианта — переключаются тумблером «каркас»:
//
//   header  — на списке проектов сайдбара нет: верхняя шапка + меню аккаунта справа.
//             Сайдбар с разделами появится, когда провалимся в проект.
//   sidebar — колонка слева на всех экранах: на списке в ней один пункт «Проекты»,
//             внутри проекта там же появятся его разделы.
//
// Проектные разделы (документы, мониторинг) сюда не выносим — они принадлежат
// конкретному сайту конкретного юрлица. Аккаунтные (настройки, подписка) живут
// в меню аккаунта.

const RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';

// Подпись зависит от режима: клиенту с одним сайтом «проект» — чужое слово.
const navItems = (isAgency) => [
  { href: '/app', label: terms(isAgency).many, Icon: ProjectsIcon },
];

// Разделы конкретного сайта. Появляются, только когда провалился внутрь: на списке
// им нечего показывать — документы и виджет всегда принадлежат одному сайту.
// Подписки здесь нет: карта и счета — на уровне аккаунта. У человека с тремя сайтами
// одна карта, и три места для неё создают путаницу; в проекте достаточно строки статуса.
const projectNav = (id) => [
  { href: `/app/project/${id}`, label: 'Обзор',     Icon: ProjectsIcon },
  { href: null,                 label: 'Документы', Icon: DocsIcon },
  { href: null,                 label: 'Виджет',    Icon: MonitorIcon },
];

function Logo({ size = 'md', onClick }) {
  const [w, h, text] = size === 'sm' ? [22, 15, 'text-[14px]'] : [24, 16, 'text-[14px]'];
  return (
    <Link href="/" onClick={onClick} className={`inline-flex items-center gap-2 rounded ${RING}`}>
      <FlashlightIcon width={w} height={h} />
      <span className={`${text} font-extrabold tracking-[-0.02em]`}>ШтрафКонтроль</span>
    </Link>
  );
}

function SidebarNav({ pathname, onNavigate, items }) {
  const { isAgency } = useMock();
  const list = items || navItems(isAgency);
  return (
    <nav aria-label="Основное меню" className="flex flex-col gap-1">
      {list.map(({ href, label, Icon }) => {
        // Раздел без адреса — заглушка: мёртвая ссылка хуже честной пометки «скоро».
        if (!href) {
          return (
            <span key={label} aria-disabled="true"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-semibold text-ink/35">
              <Icon />
              {label}
              <span className="ml-auto font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink/30">скоро</span>
            </span>
          );
        }
        const active = href === pathname;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-semibold transition-colors ${RING} ${
              active ? 'bg-ink text-white' : 'text-ink/70 hover:bg-white hover:text-ink'
            }`}
          >
            <Icon />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarChrome({ children, pathname, navOverride, backLink }) {
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (!drawer) return;
    const onKey = e => { if (e.key === 'Escape') setDrawer(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [drawer]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      {/* pb с запасом под глобальный CookieBanner — иначе он накрывает блок аккаунта */}
      <aside className="hidden border-r border-line bg-paper px-4 pb-40 pt-6 lg:sticky lg:top-0 lg:flex lg:h-[calc(100vh-var(--cookie-banner-h,0px))] lg:flex-col lg:overflow-y-auto">
        <div className="mb-7"><Logo /></div>
        {backLink && (
          <Link href={backLink.href}
            className={`mb-3 inline-flex items-center gap-1.5 rounded px-3 text-[12.5px] font-semibold text-ink/60 transition-colors hover:text-ink ${RING}`}>
            ← {backLink.label}
          </Link>
        )}
        <SidebarNav pathname={pathname} items={navOverride} />
        <div className="mt-auto border-t border-line pt-3">
          <AccountMenu align="up" />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-paper px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawer(true)}
          aria-label="Открыть меню"
          aria-expanded={drawer}
          className={`grid h-11 w-11 place-items-center rounded-lg text-ink/70 transition-colors hover:bg-white hover:text-ink ${RING}`}
        >
          <BurgerIcon size={20} />
        </button>
        <Logo size="sm" />
      </header>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/45" onClick={() => setDrawer(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Основное меню"
            className="absolute inset-y-0 left-0 flex w-[270px] flex-col overflow-y-auto bg-paper px-4 pb-40 pt-5 shadow-xl"
          >
            <button
              type="button"
              onClick={() => setDrawer(false)}
              aria-label="Закрыть меню"
              className={`mb-4 grid h-11 w-11 place-items-center self-end rounded-lg text-ink/60 transition-colors hover:bg-white hover:text-ink ${RING}`}
            >
              <CloseIcon size={20} />
            </button>
            <div className="mb-6"><Logo onClick={() => setDrawer(false)} /></div>
            {backLink && (
              <Link href={backLink.href} onClick={() => setDrawer(false)}
                className={`mb-3 inline-flex items-center gap-1.5 rounded px-3 text-[12.5px] font-semibold text-ink/60 ${RING}`}>
                ← {backLink.label}
              </Link>
            )}
            <SidebarNav pathname={pathname} items={navOverride} onNavigate={() => setDrawer(false)} />
            <div className="mt-auto border-t border-line pt-3">
              <AccountMenu align="up" />
            </div>
          </div>
        </div>
      )}

      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Chrome({ children }) {
  const { isAgency } = useMock();
  const pathname = usePathname();

  // Каркас всегда колонка слева — тумблер «шапка/сайдбар» убрали, продукт
  // держит один вариант навигации.
  const projectId = pathname.match(/^\/app\/project\/([^/]+)/)?.[1];
  if (projectId) {
    return (
      <SidebarChrome
        pathname={pathname}
        navOverride={projectNav(projectId)}
        backLink={{ href: '/app', label: terms(isAgency).many }}
      >
        {children}
      </SidebarChrome>
    );
  }

  return <SidebarChrome pathname={pathname}>{children}</SidebarChrome>;
}

export default function AppShell({ children }) {
  return (
    <MockProvider>
      <Chrome>{children}</Chrome>
    </MockProvider>
  );
}
