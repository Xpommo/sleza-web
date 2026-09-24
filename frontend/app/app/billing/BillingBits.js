'use client';

// Общие куски «Баланса и платежей» (вкладки «Платежи» и «Документы») (владелец 24.09 — акты, история и почта
// для документов вынесены из «Оплаты» в свой раздел): карточка-панель и строка
// «подпись — значение — Изменить», как в «Настройках».

import Link from 'next/link';
import { RING } from '../site/_shared/SiteChrome';

export const BTN_OUTLINE = `rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-ink transition hover:border-line-2 hover:bg-warm ${RING}`;
export const LINK = `rounded text-[13px] font-semibold text-brand hover:text-ink ${RING}`;

export function Panel({ title, aside, children }) {
  return (
    <section className="mt-5 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold tracking-[-0.02em]">{title}</h2>
        {aside && <span className="text-[13px] text-ink/60">{aside}</span>}
      </div>
      <div>{children}</div>
    </section>
  );
}

// action — текстовая кнопка («Изменить»), раскрывает правку под строкой;
// actions — иконки (открыть / скопировать), как в «Документах».
export function Row({ label, value, note, action, onAction, open, actions, children }) {
  return (
    <div className="border-t border-line py-4 first:border-t-0">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1 sm:flex sm:gap-4">
          <span className="block text-[12px] text-ink/60 sm:w-36 sm:shrink-0 sm:pt-0.5 sm:text-[13px]">{label}</span>
          <div className="mt-0.5 min-w-0 sm:mt-0">
            <p className="text-sm font-bold">{value}</p>
            {note && <p className="mt-0.5 break-words text-[12px] leading-4 text-ink/60">{note}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        {action && (
          <button
            type="button"
            onClick={onAction}
            aria-expanded={children ? open : undefined}
            className={`shrink-0 rounded-lg px-2 py-1 text-[13px] font-semibold text-ink/60 transition hover:bg-warm hover:text-ink ${RING}`}
          >
            {open ? 'Свернуть' : action}
          </button>
        )}
      </div>
      {open && children && <div className="mt-4 sm:pl-40">{children}</div>}
    </div>
  );
}

// «Баланс и платежи» — один раздел про деньги аккаунта, две вкладки
// (владелец 24.09, по образцу хостингов: у Timeweb Cloud — «Баланс и
// платежи» с вкладкой «Документы»). За что платим — сайты, их тариф,
// автопродление и оплата года — в «Моих сайтах», вид «Таблица».
export const MONEY_TITLE = 'Баланс и платежи';
const MONEY_TABS = [
  ['Платежи', '/app/billing'],
  ['Документы', '/app/accounting'],
];

export function MoneyHeader({ tab, children }) {
  return (
    <header>
      <h1 className="text-[28px] font-bold tracking-[-0.045em] sm:text-[36px] lg:sr-only">{MONEY_TITLE}</h1>
      <nav aria-label={MONEY_TITLE} className="mt-6 flex gap-7 border-b border-line lg:mt-0">
        {MONEY_TABS.map(([label, href]) => (
          <Link
            key={label}
            href={href}
            aria-current={tab === label ? 'page' : undefined}
            className={`-mb-px rounded-t border-b-2 pb-3 text-sm font-bold transition ${RING} ${
              tab === label ? 'border-ink text-ink' : 'border-transparent text-ink/60 hover:text-ink'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </header>
  );
}
