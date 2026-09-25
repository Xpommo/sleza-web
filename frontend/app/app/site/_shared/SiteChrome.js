'use client';

// Обвязка экранов сайта: знак, боковое меню, блок аккаунта. Раньше жила
// внутри обзора — теперь разделов сайта больше одного, и меню должно быть
// в одном месте, иначе пункты в нём разойдутся.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeftIcon, ChevronDownIcon, DocsIcon, LogoutIcon, MonitorIcon, ProjectsIcon, SettingsIcon, SupportIcon,
  WalletIcon,
} from '../../../../components/app/AppIcons';
import { CURRENT_USER } from '../../../../lib/appMock';
import { accountUser, loadAnketa, rememberReturn, returnPath, userLabel } from '../../start/_shared/anketaState';

export const RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';

export function TearMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-brand">
      <path d="M12 2c4 4.6 7 8.4 7 12.2A7 7 0 1 1 5 14.2C5 10.4 8 6.6 12 2Z" fill="currentColor" />
      <path d="M9.4 14.6a2.9 2.9 0 0 0 2.9 2.6" stroke="#fff" strokeOpacity=".55" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// Разделы сайта. Оплаты среди них нет — решение владельца 18 сентября: она
// на уровне аккаунта. С 23.09 тариф и год подписки у каждого сайта свои; с
// 24.09 оплачивают, меняют тариф и отключают сайты в «Моих сайтах» (вид
// «Таблица»), а баланс, способ оплаты, история и документы — в «Балансе и
// платежах» (было «Подписка» → «Оплата» + «Бухгалтерия»).
export const SITE_NAV = [
  { label: 'Обзор', Icon: ProjectsIcon, href: '/app/site' },
  { label: 'Документы', Icon: DocsIcon, href: '/app/site/documents' },
  { label: 'Виджет', Icon: MonitorIcon, href: '/app/site/widget' },
];

// Два раздела аккаунта (владелец 24.09, по образцу регистраторов и хостингов):
// «Мои сайты» — за что платим (в виде «Таблица» — тариф, автопродление, оплата
// года); «Баланс и платежи» — чем и сколько, с вкладками «Платежи» и
// «Документы» (бывшие «Оплата» и «Бухгалтерия»).
export const ACCOUNT_NAV = [
  { label: 'Мои сайты', Icon: ProjectsIcon, href: '/app/sites' },
  { label: 'Баланс и платежи', Icon: WalletIcon, href: '/app/billing' },
];

const rub = (n) => `${n.toLocaleString('ru-RU')} ₽`;

// Сумма баланса в меню телефона — после первого пополнения (способ пополнения
// выбран или есть операции): до него «0 ₽» ничего не сообщает и читается как
// долг. Перечитываем на каждое сохранение анкеты — пополнили, и меню сразу
// показывает новую.
export function useMoney() {
  const [money, setMoney] = useState(null);
  useEffect(() => {
    const read = () => {
      const b = loadAnketa().billing || {};
      setMoney(b.method || (b.ops || []).length ? { balance: b.balance || 0 } : null);
    };
    read();
    window.addEventListener('anketa:saved', read);
    return () => window.removeEventListener('anketa:saved', read);
  }, []);
  return money;
}

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

// Настройки и Поддержка открываются из любого раздела, и их «← Назад» ведёт
// на последний открытый экран кабинета. Сами они в «куда вернуться» не
// попадают: иначе Поддержка → Настройки → «Назад» → «Назад» ходило бы по кругу.
const SIDE_SCREENS = ['/app/settings', '/app/support'];

// Окно ведёт себя как окно: фокус переходит в него, Tab не уходит на
// страницу под затемнением, Escape закрывает, а после закрытия фокус
// возвращается на кнопку, которая окно открыла. step — у окон с шагами:
// нажатая кнопка шага исчезает, и фокус снова ставится на окно.
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
// fallback — куда вернуть фокус, если кнопки, открывшей окно, уже нет
// (пункт меню «⋯» закрывается вместе с меню — фокус падал на body).
export function useDialog(ref, onClose, step, fallback) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    // Окно, открытое из пункта меню, застаёт фокус на body: пункт уже
    // исчез вместе с меню. Тогда при закрытии — запасная цель (кнопка меню).
    const back = document.activeElement === document.body ? null : document.activeElement;
    const items = () => [...el.querySelectorAll(FOCUSABLE)].filter((x) => x.offsetParent !== null);
    el.focus();
    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = items();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      const at = document.activeElement;
      if (e.shiftKey && (at === first || at === el)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (at === last || at === el)) {
        e.preventDefault();
        first.focus();
      }
    }
    el.addEventListener('keydown', onKey);
    return () => {
      el.removeEventListener('keydown', onKey);
      const target = back && back.isConnected ? back : fallback?.();
      target?.focus?.();
    };
  }, [ref, step]);
}

export function useRememberReturn() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname && !SIDE_SCREENS.some((p) => pathname.includes(p))) rememberReturn(pathname.replace(/\/$/, ''));
  }, [pathname]);
}

function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(returnPath())}
      className={`mt-10 flex w-fit items-center gap-2 rounded text-sm font-semibold text-ink/60 transition hover:text-ink ${RING}`}
    >
      <ArrowLeftIcon size={16} /> Назад
    </button>
  );
}

const MENU_ITEM = `flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-[14px] font-semibold text-ink/70 transition hover:bg-warm hover:text-ink ${RING}`;

// Пункты меню аккаунта. full — на телефоне, где сайдбара нет: там это
// единственный путь в «Мои сайты», «Баланс и платежи» и «Поддержку» (лист «Ещё»
// живого макета). На широком экране они уже стоят в сайдбаре, и в меню
// остаются только Настройки и Выход.
// «Выйти» ведёт туда, откуда входят, и ничего не сбрасывает: следующий вход
// показывает тот же кабинет (макет, FIXLOG d736f60 — «Выйти» не мёртвая).
// На телефоне сумма баланса — справа у «Баланса и платежей»: у «Оплаты» она
// читалась как долг «к оплате», у баланса — как баланс (владелец 24.09).
function MenuItems({ full, onPick }) {
  const router = useRouter();
  const money = useMoney();
  const items = [
    ...(full
      ? [
          ['Мои сайты', ProjectsIcon, '/app/sites'],
          ['Баланс и платежи', WalletIcon, '/app/billing', money && rub(money.balance)],
          ['Поддержка', SupportIcon, '/app/support'],
        ]
      : []),
    ['Настройки', SettingsIcon, '/app/settings'],
  ];
  return (
    <>
      {items.map(([label, Icon, href, aside]) => (
        <Link key={href} href={href} role="menuitem" tabIndex={-1} className={MENU_ITEM} onClick={onPick}>
          <Icon size={16} /> {label}
          {aside && <span className="ml-auto text-[13px] font-bold text-ink">{aside}</span>}
        </Link>
      ))}
      <div className="mx-1 my-1 h-px bg-line" />
      <button
        type="button"
        role="menuitem"
        tabIndex={-1}
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

// Меню и нижние листы (аудит 24.09: role="menu" без стрелок, меню оставалось
// открытым после Tab; листы «Ещё» и «Шаги» были недоступны с клавиатуры, «Шаги»
// не закрывались по Escape). Одно поведение на четыре места: при открытии фокус
// на первый пункт; Escape закрывает и возвращает фокус на кнопку; уход фокуса
// закрывает. menu: стрелки, Home/End и закрытие по Tab (образец APG «Menu
// Button»); лист: Tab ходит внутри.
export function usePopup(open, setOpen, btnRef, panelRef, { menu = true } = {}) {
  useEffect(() => {
    if (!open) return undefined;
    const panel = panelRef.current;
    if (!panel) return undefined;
    const items = () => [...panel.querySelectorAll(menu ? '[role="menuitem"]:not([disabled])' : 'a[href], button:not([disabled])')];
    items()[0]?.focus();
    function onKey(e) {
      const list = items();
      const i = list.indexOf(document.activeElement);
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        btnRef.current?.focus();
      } else if (!menu) {
        return;
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        list[(i + 1) % list.length]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        list[(i - 1 + list.length) % list.length]?.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        list[0]?.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        list[list.length - 1]?.focus();
      } else if (e.key === 'Tab') {
        setOpen(false);
      }
    }
    function onFocusOut(e) {
      const to = e.relatedTarget;
      if (to && !panel.contains(to) && to !== btnRef.current) setOpen(false);
    }
    panel.addEventListener('keydown', onKey);
    panel.addEventListener('focusout', onFocusOut);
    return () => {
      panel.removeEventListener('keydown', onKey);
      panel.removeEventListener('focusout', onFocusOut);
    };
  }, [open, setOpen, btnRef, panelRef, menu]);
}

// Меню аккаунта на аватаре (живой макет, .acct-menu). compact — одна
// аватарка в верхней строке телефона, меню вниз и полное; иначе — блок
// внизу сайдбара, меню вверх.
export function AccountMenu({ user, compact = false }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const who = userLabel(user);
  usePopup(open, setOpen, btnRef, menuRef);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={compact ? `Меню аккаунта: ${who.title}` : undefined}
        className={`flex items-center gap-3 rounded-xl text-left transition ${RING} ${
          compact ? 'p-0.5' : `w-full px-1 py-1 hover:bg-warm ${open ? 'bg-warm' : ''}`
        }`}
      >
        <span className={`flex shrink-0 items-center justify-center rounded-full bg-ink font-bold text-white ${compact ? 'h-9 w-9 text-[13px]' : 'h-10 w-10 text-sm'}`}>
          {who.initial}
        </span>
        {!compact && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-ink">{who.title}</span>
              {who.sub && <span className="mt-0.5 block truncate text-[11px] text-ink/60">{who.sub}</span>}
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
          ref={menuRef}
          role="menu"
          aria-label="Меню аккаунта"
          className={`absolute z-40 rounded-xl border border-line bg-white p-1.5 shadow-[0_18px_40px_-18px_rgba(17,17,16,0.35)] ${
            compact ? 'right-0 top-[calc(100%+6px)] w-[230px]' : 'bottom-[calc(100%+6px)] left-0 right-0'
          }`}
        >
          {compact && (
            <div className="border-b border-line px-2.5 pb-2 pt-1">
              <p className="truncate text-[13px] font-bold">{who.title}</p>
              {who.sub && <p className="truncate text-[12px] text-ink/60">{who.sub}</p>}
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
  const moreBtn = useRef(null);
  const moreRef = useRef(null);
  useBottomBar();
  usePopup(more, setMore, moreBtn, moreRef);
  const tab = (on) => `flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold transition ${RING} ${on ? 'text-ink' : 'text-ink/60'}`;
  return (
    <>
      {more && <div className="fixed inset-0 z-40 bg-ink/20 lg:hidden" aria-hidden="true" onClick={() => setMore(false)} />}
      {more && (
        <div ref={moreRef} role="menu" aria-label="Ещё" className="fixed inset-x-3 bottom-[calc(72px+env(safe-area-inset-bottom))] z-50 rounded-2xl border border-line bg-white p-2 shadow-xl lg:hidden">
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
        <button ref={moreBtn} type="button" onClick={() => setMore(!more)} aria-haspopup="menu" aria-expanded={more} className={tab(more || !active)}>
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
      {/* Первая остановка Tab — сразу к содержимому, мимо меню (аудит 24.09:
          до контента было 7 нажатий). Видна только в фокусе. */}
      <a
        href="#content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('content')?.focus();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white"
      >
        К содержимому
      </a>
      <div className="flex items-center gap-2.5">
        <Link href="/app/sites" className={`flex items-center gap-2.5 rounded-lg ${RING}`} aria-label="Слеза Белый Сайт: мои сайты">
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
        {/* Строка «Баланс · N ₽» над аккаунтом была и убрана (владелец 24.09:
            «смотрится лишним») — баланс виден в «Балансе и платежах». */}
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
// «Баланс и платежи», «Поддержка» и «Настройки» подсвечивают в нём «Ещё»). В «Моих
// сайтах» его нет: там сайт ещё не выбран.
function useHasSite() {
  const [has, setHas] = useState(false);
  useEffect(() => setHas(Boolean(loadAnketa().domain)), []);
  return has;
}

// Поддержка — с «← Назад», как Настройки (живой макет, support-back), но с
// навигацией аккаунта: из неё переходят сразу в нужный раздел (макет, 25.08).
export function AccountSidebar({ active, user = CURRENT_USER, supportActive }) {
  const hasSite = useHasSite();
  return (
    <SidebarShell user={user} supportActive={supportActive} bottomBar={hasSite && active !== 'Мои сайты' ? <SiteTabbar /> : null}>
      {supportActive && <BackButton />}
      <div className={supportActive ? 'mt-7 border-t border-line pt-6' : 'mt-10'}>
        <NavList items={ACCOUNT_NAV} active={active} label="Основная навигация" />
      </div>
    </SidebarShell>
  );
}

// Настройки — уровень аккаунта, общие для всех сайтов: в сайдбаре только
// сам раздел и «← Назад» туда, откуда пришли (живой макет, s-settings).
export function SettingsSidebar({ user = CURRENT_USER }) {
  const hasSite = useHasSite();
  return (
    <SidebarShell user={user} bottomBar={hasSite ? <SiteTabbar /> : null}>
      <BackButton />
      <div className="mt-7 border-t border-line pt-6">
        <NavList items={[{ label: 'Настройки', Icon: SettingsIcon, href: '/app/settings' }]} active="Настройки" label="Аккаунт" />
      </div>
    </SidebarShell>
  );
}

// Заголовок раздела сайта — одна схема на все разделы (как в макете): H1 —
// имя раздела, под ним строка контекста с доменом. Раньше у «Обзора» H1 был
// домен, а у остальных — имя раздела, и структура менялась от вкладки к вкладке.
// Заголовок раздела — только на телефоне (владелец 24.09): на компьютере где
// вы находитесь, показывает сайдбар, и крупное «Документы» повторяло пункт
// меню. На телефоне сайдбара нет, а «Баланс и платежи», «Настройки» и «Поддержка»
// в нижнем меню все под «Ещё» — без заголовка не понять, где ты. Скринридеру
// заголовок остаётся всегда (lg:sr-only). Домен — тоже только на телефоне:
// на компьютере он стоит в сайдбаре над меню.
export function SiteHeader({ title, domain, children }) {
  return (
    <header>
      <h1 className="text-[28px] font-bold tracking-[-0.045em] sm:text-[36px] lg:sr-only">{title}</h1>
      <p className="mt-2 text-[15px] font-semibold text-ink/80 lg:hidden">{domain}</p>
      {children}
    </header>
  );
}
