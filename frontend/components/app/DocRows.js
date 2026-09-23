'use client';

// Список документов строками. Один компонент на два экрана — шаг 5 анкеты и
// «Документы» внутри сайта; различается только то, что показывает раскрытие,
// поэтому панель приходит children.
//
// Плитками было хуже: названия длинные, глаз читает их колонкой сверху вниз,
// а не прыжками по сетке.

import { ChevronDownIcon, DocsIcon } from './AppIcons';

const RING = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15';
const COLS = 'sm:grid-cols-[minmax(0,1fr)_150px_140px]';

export function DocRowList({ children, actionsLabel = 'Действие' }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div
        aria-hidden="true"
        className={`hidden gap-4 border-b border-line bg-warm/70 px-6 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/60 sm:grid ${COLS}`}
      >
        <span>Документ</span>
        <span>Статус</span>
        <span className="text-right">{actionsLabel}</span>
      </div>
      {children}
    </div>
  );
}

// actions — кнопки прямо в строке вместо раскрытия («Документы» кабинета:
// зашёл за ссылкой — взял её одним нажатием). Без actions — прежний
// аккордеон с превью (шаг 5 анкеты: там раскрытие показывает начало текста).
export function DocRow({ doc, note, status, meta, action = 'Посмотреть', open, onToggle, actions, children }) {
  const panelId = `doc-panel-${doc.id}`;
  return (
    <div className="border-b border-line last:border-0">
      <div className={`grid gap-3 px-5 py-4 transition-colors hover:bg-warm/60 sm:items-center sm:gap-4 sm:px-6 ${COLS}`}>
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/[0.08] text-brand">
            <DocsIcon size={19} />
          </span>
          <div className="min-w-0">
            {/* Без обрезки: в названии стоит закон, который документ
                закрывает, — срезать его многоточием нельзя. */}
            <h3 className="text-sm font-bold leading-5">
              {doc.title}
              <span className="ml-2 whitespace-nowrap font-mono text-[11px] font-normal text-ink/60">{doc.law}</span>
            </h3>
            <p className="mt-1 text-[12px] leading-4 text-ink/60">{note}</p>
          </div>
        </div>
        {/* На узком экране статус и кнопка встают в одну строку под текстом;
            с sm обёртка исчезает (contents), и оба снова колонки сетки. */}
        <div className="flex items-center justify-between gap-3 pl-[52px] sm:contents">
          <span className="flex flex-col gap-1">
            <span
              className={`w-fit rounded-full px-3 py-1.5 text-[11px] font-bold ${
                status.tone === 'warn' ? 'bg-warn/10 text-warn' : 'bg-ok/10 text-ok'
              }`}
            >
              {status.label}
            </span>
            {meta && <span className="pl-1 text-[11px] text-ink/60">{meta}</span>}
          </span>
          {actions ? (
            <div className="flex items-center gap-1 sm:justify-self-end">{actions}</div>
          ) : (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={panelId}
            className={`inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-semibold text-ink/60 transition-colors hover:text-brand sm:justify-self-end ${RING}`}
          >
            {action}
            <ChevronDownIcon size={15} className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
          </button>
          )}
        </div>
      </div>
      {!actions && (
      <>
      {/* Раскрытие через grid-template-rows: высота текста заранее
          неизвестна, а анимировать нужно именно её. */}
      <div
        id={panelId}
        aria-hidden={!open}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="mx-5 mb-5 rounded-xl border border-line bg-warm px-4 py-3.5 sm:mx-6">{children}</div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

// Кнопка-иконка в строке документа. Подпись — всплывающей подсказкой и для
// скринридера (aria-label): иконка без слова читается только вместе с ней.
// Неактивная объясняет почему (why) — «нельзя» без причины хуже, чем ничего.
export function IconAction({ label, why, icon: Icon, onClick, href, disabled, done }) {
  const cls = `group/ia relative flex h-9 w-9 items-center justify-center rounded-lg text-ink/60 transition hover:bg-warm hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink/60 ${RING}`;
  const tip = (
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-[calc(100%+6px)] right-0 z-20 hidden whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-semibold text-white group-hover/ia:block group-focus-visible/ia:block"
    >
      {disabled && why ? why : done || label}
    </span>
  );
  if (href && !disabled) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={cls}>
        <Icon size={17} />
        {tip}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={disabled && why ? `${label} — ${why}` : label} className={cls}>
      <Icon size={17} className={done ? 'text-ok' : ''} />
      {tip}
    </button>
  );
}
