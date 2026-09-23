'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SettingsIcon, BillingIcon, TeamIcon, LogoutIcon, ChevronIcon } from './AppIcons';
import { CURRENT_USER } from '../../lib/appMock';

// Меню аккаунта. Здесь живёт то, что относится к аккаунту, а не к проекту: настройки,
// подписка, команда. Проектные разделы (документы, мониторинг) — внутри проекта,
// иначе клиенту с пятью сайтами пришлось бы каждый раз уточнять, о каком речь.

const RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';

const ITEMS = [
  { label: 'Настройки',         Icon: SettingsIcon },
  { label: 'Подписка и оплата', Icon: BillingIcon },
  { label: 'Команда',           Icon: TeamIcon },
];

// align: 'right' — меню под кнопкой в шапке; 'up' — над блоком аккаунта в сайдбаре.
export default function AccountMenu({ align = 'right', compact = false }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const position = align === 'up'
    ? 'bottom-full left-0 mb-2'
    : 'right-0 top-full mt-2';

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-left transition-colors hover:bg-white ${RING} ${
          open ? 'bg-white' : ''
        }`}
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[13px] font-bold text-white">
          {CURRENT_USER.name.slice(0, 1)}
        </span>
        <span className={`min-w-0 ${compact ? '' : 'flex-1'}`}>
          <span className="block truncate text-[13px] font-semibold text-ink">{CURRENT_USER.name}</span>
          {!compact && <span className="block truncate font-mono text-[10.5px] text-ink/60">{CURRENT_USER.email}</span>}
        </span>
        <span className={`text-ink/40 transition-transform ${open ? 'rotate-90' : ''}`}>
          <ChevronIcon size={14} />
        </span>
      </button>

      {/* Прозрачный слой-ловец: первый клик вне меню должен только закрыть его.
          Без него клик «мимо» одновременно закрывал меню и нажимал кнопку под курсором —
          например переключал режим или мог запустить действие, которого не просили. */}
      {open && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {open && (
        <div
          role="menu"
          aria-label="Меню аккаунта"
          className={`absolute z-40 w-[232px] overflow-hidden rounded-lg border border-line-2 bg-white py-1.5 shadow-lg ${position}`}
        >
          <div className="border-b border-line px-3 pb-2 pt-1">
            <div className="truncate text-[13px] font-semibold">{CURRENT_USER.name}</div>
            <div className="truncate font-mono text-[10.5px] text-ink/60">{CURRENT_USER.email}</div>
          </div>

          {/* Разделы аккаунта — заглушки, пока их нечем наполнить */}
          {ITEMS.map(({ label, Icon }) => (
            <span
              key={label}
              role="menuitem"
              aria-disabled="true"
              className="flex cursor-not-allowed items-center gap-2.5 px-3 py-2.5 text-[13px] text-ink/35"
            >
              <Icon size={16} />
              {label}
              <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.1em] text-ink/25">скоро</span>
            </span>
          ))}

          <div className="mt-1 border-t border-line pt-1">
            <Link
              href="/app/login"
              role="menuitem"
              className={`flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-semibold text-ink/70 transition-colors hover:bg-warm hover:text-ink ${RING}`}
            >
              <LogoutIcon size={16} />
              Выйти
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
