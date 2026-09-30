'use client';

// Пакет документов окном просмотра (ревью Ивана 28.09): слева список, справа
// открытый документ (на телефоне список — над текстом). Раньше все пять строк были свёрнуты, и пик пути —
// «документы собраны под вас» — прятался за «Посмотреть» (первая критика).
// Открыт один документ за раз, как в прежнем аккордеоне: полотна из пяти
// текстов не получается. Адреса cdn… в шапке окна нет — владелец убрал его с
// шага 5 23.09: до установки кода ссылка не открывается.

import { useRef } from 'react';
import { RING } from '../_shared/AnketaChrome';
import { DOCUMENTS, MARK, docOrigin, docPreview } from '../../../../lib/docPackage';
import { QUESTION_TITLES } from './AnswerModal';

// Превью с выделенными ответами: свои данные внутри юридического текста —
// то, что показывает «документ собран под вас», а не шаблон (владелец 23.09:
// голое начало документа ничего не давало).
function MarkedText({ text }) {
  const parts = String(text).split(MARK);
  return parts.map((part, i) =>
    i % 2 ? (
      <mark key={i} className="rounded bg-brand/10 px-0.5 font-semibold text-ink">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export default function DocViewer({ domain, answers, current, onPick, onEdit }) {
  const tabs = useRef([]);
  const pane = useRef(null);
  const doc = DOCUMENTS.find((d) => d.id === current) || DOCUMENTS[0];

  // На телефоне текст — под списком: выбранный документ прокручиваем к глазам.
  function pick(id) {
    onPick(id);
    if (window.matchMedia('(min-width: 768px)').matches) return;
    setTimeout(() => {
      const top = pane.current?.getBoundingClientRect().top;
      if (top > window.innerHeight - 200) pane.current.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }, 30);
  }

  // Список — вкладки: в него заходят одним Tab, стрелки листают документы.
  function onKeyDown(e) {
    const i = DOCUMENTS.findIndex((d) => d.id === doc.id);
    const to = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: DOCUMENTS.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    const next = (to + DOCUMENTS.length) % DOCUMENTS.length;
    onPick(DOCUMENTS[next].id);
    tabs.current[next]?.focus();
  }

  return (
    <section className="mb-7 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-line bg-warm/70 px-4 py-2.5">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
        </span>
        <span className="truncate text-[12px] font-semibold text-ink/60">Документы {domain}</span>
      </div>

      <div className="md:grid md:grid-cols-[280px_minmax(0,1fr)]">
        {/* Под названием — что взято из ответов («Названы счётчики: …»), у всех
            пяти сразу, как было в строках (живой макет, очередь 3, 18.09). */}
        <div
          role="tablist"
          aria-label="Документы пакета"
          aria-orientation="vertical"
          onKeyDown={onKeyDown}
          className="flex flex-col gap-1 border-b border-line p-2.5 md:border-b-0 md:border-r md:p-3"
        >
          {DOCUMENTS.map((d, i) => {
            const on = d.id === doc.id;
            return (
              <button
                key={d.id}
                ref={(el) => (tabs.current[i] = el)}
                id={`doc-tab-${d.id}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls="doc-pane"
                aria-labelledby={`doc-t-${d.id}`}
                aria-describedby={`doc-l-${d.id}`}
                tabIndex={on ? 0 : -1}
                onClick={() => pick(d.id)}
                className={`rounded-lg px-3 py-2.5 text-left transition ${RING} ${on ? 'bg-brand/[0.08]' : 'hover:bg-warm'}`}
              >
                {/* Закон — мелко рядом с названием, как было в строках (23.09). */}
                <span id={`doc-t-${d.id}`} className={`block text-[13px] font-bold leading-5 ${on ? 'text-brand' : 'text-ink'}`}>
                  {d.title}
                  <span className="ml-1.5 whitespace-nowrap font-mono text-[11px] font-normal text-ink/60">{d.law}</span>
                </span>
                <span id={`doc-l-${d.id}`} className="mt-0.5 block text-[12px] leading-4 text-ink/60">
                  {docOrigin(d, answers).line}
                </span>
              </button>
            );
          })}
        </div>

        <div ref={pane} id="doc-pane" role="tabpanel" aria-labelledby={`doc-tab-${doc.id}`} className="min-w-0 scroll-mt-4 p-5 sm:p-7">
          <h2 className="text-lg font-bold leading-6 tracking-[-0.01em]">
            {doc.title}
            <span className="ml-2 whitespace-nowrap font-mono text-[11px] font-normal text-ink/60">{doc.law}</span>
          </h2>
          <p className="mt-4 text-[14px] leading-7 text-ink/80">
            <MarkedText text={docPreview(doc, { ...answers, domain })} />
          </p>
          {/* Вторая половина петли: ответ виден в документе, и прямо отсюда
              правится ровно тот ответ, из которого взяты данные, — окном, без
              возврата в анкету (владелец 24.09). */}
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4 text-[12px] text-ink/60">
            <span>Изменить ответ:</span>
            {docOrigin(doc, answers).sources.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => onEdit(k)}
                className={`tap rounded-lg border border-line bg-white px-2.5 py-1 font-semibold text-ink/80 transition hover:border-brand hover:text-brand ${RING}`}
              >
                {QUESTION_TITLES[k]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
