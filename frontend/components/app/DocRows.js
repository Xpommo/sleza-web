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

export function DocRowList({ children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div
        aria-hidden="true"
        className={`hidden gap-4 border-b border-line bg-warm/70 px-6 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/60 sm:grid ${COLS}`}
      >
        <span>Документ</span>
        <span>Статус</span>
        <span className="text-right">Действие</span>
      </div>
      {children}
    </div>
  );
}

export function DocRow({ doc, note, status, action = 'Посмотреть', open, onToggle, children }) {
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
            <h3 className="text-sm font-bold leading-5">{doc.title}</h3>
            <p className="mt-1 text-[12px] leading-4 text-ink/60">{note}</p>
          </div>
        </div>
        {/* На узком экране статус и кнопка встают в одну строку под текстом;
            с sm обёртка исчезает (contents), и оба снова колонки сетки. */}
        <div className="flex items-center justify-between gap-3 pl-[52px] sm:contents">
          <span
            className={`w-fit rounded-full px-3 py-1.5 text-[11px] font-bold ${
              status.tone === 'warn' ? 'bg-warn/10 text-warn' : 'bg-ok/10 text-ok'
            }`}
          >
            {status.label}
          </span>
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
        </div>
      </div>
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
    </div>
  );
}
