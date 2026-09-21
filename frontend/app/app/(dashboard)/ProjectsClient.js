'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  SearchIcon, PlusIcon, GridIcon, ListIcon, CloseIcon, ChevronIcon,
} from '../../../components/app/AppIcons';
import { StatusBadge, StatusLine, ChecksStrip, TONE_TEXT, TONE_BG } from '../../../components/app/StatusBits';
import { MockBar, useMock } from '../../../components/app/MockControls';
import {
  PROJECTS, DOCS_LABEL, DISCLAIMER, SEGMENT_LEGEND,
  severityScore, projectSummary, fineLabel, scanLabel, paymentState, terms, plural,
} from '../../../lib/appMock';

// Стартовая страница кабинета. Макет: данные из lib/appMock, действия ничего не отправляют.
// Проект = домен + оператор (ООО/ИП с ИНН); в клиентском режиме называется «сайт».

const RING =
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 focus-visible:border-brand';

const SORTS = [
  { id: 'severity', label: 'сначала проблемные' },
  { id: 'scan',     label: 'по дате проверки' },
  { id: 'name',     label: 'по названию' },
];

// Главное действие меняется вместе со статусом: интерфейс не должен одинаково
// спокойно относиться к «всё хорошо» и «у тебя три нарушения».
// Вес кнопки идёт за статусом карточки, а не за вёрсткой: залитая — только у нарушений,
// у замечаний обводка, у чистого текстовая ссылка. Иначе на экране четыре одинаково
// тяжёлые кнопки и красная карточка ничем не выигрывает у жёлтой.
// short — для таблицы: полная подпись там ломается на две строки и рвёт ритм.
function primaryAction(summary) {
  if (summary.tone === 'danger') return { label: 'Устранить',          short: 'Устранить', weight: 'solid' };
  if (summary.tone === 'warn')   return { label: 'Обновить документы', short: 'Обновить',  weight: 'outline' };
  return { label: 'Открыть', short: 'Открыть', weight: 'text' };
}

const ACTION_CLASS = {
  solid:   'bg-ink text-white hover:bg-brand',
  outline: 'border border-line-2 bg-white text-ink hover:border-ink/40',
  text:    'text-ink/70 hover:text-ink',
};

function ClientBadge({ owner }) {
  if (owner.type !== 'client') return null;
  return (
    <span className="rounded-full border border-line-2 bg-warm px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink/55">
      {owner.clientName}
    </span>
  );
}

function ProjectCard({ p, showOwner, onAction }) {
  const summary = projectSummary(p);
  const docs = DOCS_LABEL[p.docs];
  const scan = scanLabel(p);
  const action = primaryAction(summary);

  return (
    // relative + растягивающаяся область у главной кнопки: кликается вся карточка,
    // но в дереве остаётся один интерактивный элемент — вложенные ссылки ломают
    // клавиатуру и скринридер.
    <div className="relative flex flex-col rounded-lg border border-line-2 bg-white p-4 transition-colors hover:border-ink/25">

      {/* крупно: домен, статус, сумма риска */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-mono text-[14px] font-medium text-ink">{p.domain}</div>
          <div className="truncate text-[15px] font-bold tracking-[-0.02em]">{p.name}</div>
        </div>
        {showOwner && <ClientBadge owner={p.owner} />}
      </div>

      <div className="mb-3">
        <StatusBadge tone={summary.tone} label={summary.label} secondary={summary.secondary} size="lg" extra={fineLabel(p)} />
      </div>

      {/* средне: полоска шести проверок и документы. Легенда — одна на список,
          повторять её на каждой карточке значит превращать подсказку в шум. */}
      <ChecksStrip project={p} withLegend={false} />

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <StatusLine tone={docs.tone} text={docs.text} />
        {/* бейдж только когда мониторинг выключен: норма не требует подписи */}
        {!p.monitoring && <StatusLine tone="warn" text="мониторинг выключен" />}
      </div>

      {/* мелко и серо: оператор, ИНН, дата проверки */}
      <div className="mb-4 mt-3 space-y-0.5">
        <div className="truncate text-[12px] text-ink/60">{p.org.name} · ИНН {p.org.inn}</div>
        <StatusLine tone={scan.stale ? 'warn' : 'muted'} text={scan.text} />
      </div>

      {/* Кнопка перепроверки убрана: она повторялась на каждой карточке, стояла вплотную
          к главному действию и запускала процесс на 2–5 минут — промах пальцем стоил
          дорого. Её место в проекте, рядом с датой проверки, где она читается как
          «проверить сейчас», а не как загадочный кружок. */}
      <div className="mt-auto border-t border-line pt-3">
        <Link
          href={`/app/project/${p.id}`}
          className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13px] font-bold transition-colors ${RING} ${ACTION_CLASS[action.weight]} after:absolute after:inset-0 after:rounded-lg after:content-['']`}
        >
          {action.label} <ChevronIcon size={14} />
        </Link>
      </div>
    </div>
  );
}

function ProjectsTable({ list, showOwner, onAction }) {
  return (
    // Таблица шире телефона — скроллится внутри своего контейнера, страница не едет.
    <div className="overflow-x-auto rounded-lg border border-line-2 bg-white">
      <table className="w-full min-w-[820px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-ink/50">
            <th className="px-4 py-3 font-medium">Проект</th>
            <th className="px-4 py-3 font-medium">Статус</th>
            <th className="px-4 py-3 font-medium">Оплата</th>
            <th className="px-4 py-3 font-medium">Документы</th>
            <th className="px-4 py-3 font-medium">Проверен</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {list.map(p => {
            const summary = projectSummary(p);
            const docs = DOCS_LABEL[p.docs];
            const scan = scanLabel(p);
            const pay = paymentState(p);
            const action = primaryAction(summary);
            return (
              <tr key={p.id} className="group border-b border-line last:border-0 hover:bg-warm/60">
                {/* тонкая полоса слева у проблемных строк — заливка целиком рябит */}
                <td className={`relative px-4 py-3 ${summary.tone === 'danger' ? 'before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-danger before:content-[""]' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[13px] font-medium text-ink">{p.domain}</span>
                    {showOwner && <ClientBadge owner={p.owner} />}
                  </div>
                  <div className="truncate text-[11.5px] text-ink/55">{p.org.name} · ИНН {p.org.inn}</div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge tone={summary.tone} label={summary.label} secondary={summary.secondary} extra={fineLabel(p)} />
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <StatusLine tone={pay.tone} text={pay.text} />
                </td>
                <td className="px-4 py-3"><StatusLine tone={docs.tone} text={docs.text} /></td>
                <td className="whitespace-nowrap px-4 py-3"><StatusLine tone={scan.stale ? 'warn' : 'muted'} text={scan.text} /></td>
                <td className="px-4 py-3 text-right">
                  {/* В таблице строки равнозначны, поэтому даже у нарушений максимум
                      обводка: десяток залитых кнопок подряд — это частокол, а не акцент.
                      Приоритет несут красная полоса слева и сам статус. */}
                  <Link
                    href={`/app/project/${p.id}`}
                    className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-[12.5px] font-semibold transition-colors ${RING} ${
                      action.weight === 'text' ? 'text-ink/70 hover:text-ink' : 'border border-line-2 text-ink hover:border-ink/40'
                    }`}
                  >
                    {action.short} <ChevronIcon size={13} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Партнёр открывает кабинет ради двух вопросов: у кого горит и что с оплатой.
function AgencySummary({ list }) {
  const clients = new Set(list.filter(p => p.owner.type === 'client').map(p => p.owner.clientName));
  const burning = list.filter(p => projectSummary(p).tone === 'danger').length;
  const overdue = list.filter(p => paymentState(p).tone === 'danger').length;
  const soon    = list.filter(p => paymentState(p).tone === 'warn').length;

  const cells = [
    { label: 'клиентов',    value: clients.size, tone: 'muted' },
    { label: 'проектов',    value: list.length,  tone: 'muted' },
    { label: 'где горит',   value: burning,      tone: burning ? 'danger' : 'ok' },
    { label: 'просрочено',  value: overdue,      tone: overdue ? 'danger' : 'ok' },
    { label: 'оплата скоро', value: soon,        tone: soon ? 'warn' : 'ok' },
  ];

  return (
    <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line-2 bg-line sm:grid-cols-5">
      {cells.map(c => (
        <div key={c.label} className="bg-white px-4 py-3">
          <div className={`text-[22px] font-extrabold tracking-[-0.03em] ${TONE_TEXT[c.tone]}`}>{c.value}</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink/45">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function ProjectsClient() {
  const { isAgency, hasData } = useMock();
  const t = terms(isAgency);

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const [sort,  setSort]  = useState('severity');   // «сначала проблемные» — значение по умолчанию
  const [view,  setView]  = useState('cards');
  const [notice, setNotice] = useState('');

  // Обычный клиент видит только свои сайты — агентской механики для него не существует.
  const pool = useMemo(() => {
    if (!hasData) return [];
    return isAgency ? PROJECTS : PROJECTS.filter(p => p.owner.type === 'mine');
  }, [hasData, isAgency]);

  const scoped = useMemo(
    () => (isAgency && scope !== 'all' ? pool.filter(p => p.owner.type === scope) : pool),
    [pool, isAgency, scope]);

  const filtered = useMemo(() => {
    let list = scoped;

    // Одно поле ищет сразу по названию, домену, оператору, ИНН и имени клиента —
    // тип запроса определять не нужно: ИНН это цифры, домен латиница, они не пересекаются.
    const q = query.trim().toLowerCase();
    if (q) {
      const digits = q.replace(/\D/g, '');
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.domain.toLowerCase().includes(q) ||
        p.org.name.toLowerCase().includes(q) ||
        (digits && p.org.inn.includes(digits)) ||
        (p.owner.clientName || '').toLowerCase().includes(q)
      );
    }

    const sorted = [...list];
    if (sort === 'severity') sorted.sort((a, b) => severityScore(b) - severityScore(a));
    if (sort === 'scan')     sorted.sort((a, b) => a.lastScanDays - b.lastScanDays);
    if (sort === 'name')     sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    return sorted;
  }, [scoped, query, sort]);

  // Считаем по всему портфелю, а не по отфильтрованному: подзаголовок описывает
  // все проекты, иначе при поиске «7 проектов · 1 требует внимания» противоречит себе.
  const needAttention = pool.filter(p => projectSummary(p).tone === 'danger').length;
  const searching = query.trim().length > 0;

  const scopes = [
    { id: 'all',    label: 'Все',        n: pool.length },
    { id: 'mine',   label: 'Мои',        n: pool.filter(p => p.owner.type === 'mine').length },
    { id: 'client', label: 'Клиентские', n: pool.filter(p => p.owner.type === 'client').length },
  ];

  return (
    <main className="mx-auto max-w-[1200px] px-5 pb-40 pt-6 sm:px-8 sm:pt-8">

      <div className="mb-6"><MockBar /></div>

      {/* заголовок + добавить */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 [&>button]:w-full [&>button]:sm:w-auto">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-[-0.035em] sm:text-[30px]">{t.many}</h1>
          <p className="mt-1 text-[14px] text-ink/65">
            {pool.length === 0
              ? `Пока ни одного ${t.one}а`
              : <>
                  {pool.length} {plural(pool.length, ...t.countWords)}
                  {needAttention > 0 && <> · <span className="font-semibold text-danger">{needAttention} требует внимания</span></>}
                </>}
          </p>
        </div>
        {/* Обводка, а не заливка: добавление сайта — действие для новых, а не для тех,
            у кого горит. Тяжёлая кнопка на экране должна быть одна — у нарушений. */}
        <button
          type="button"
          onClick={() => setNotice(`Форма добавления — следующий экран макета.`)}
          className={`inline-flex items-center gap-2 rounded-lg border border-line-2 bg-white px-5 py-3 text-[14px] font-bold text-ink transition-colors hover:border-ink/40 ${RING}`}
        >
          <PlusIcon size={17} />
          {t.add}
        </button>
      </div>

      <div aria-live="polite">
        {notice && (
          <p role="status" className="mb-5 rounded-lg border border-brand/20 bg-[var(--brand-tint)] px-3.5 py-3 text-[13px] text-ink/75">
            {notice}
          </p>
        )}
      </div>

      {pool.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line-2 bg-paper px-6 py-14 text-center">
          <h2 className="text-[19px] font-bold tracking-[-0.02em]">{t.emptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-[44ch] text-[14px] leading-snug text-ink/65">
            Проверим по шести требованиям, соберём документы и будем следить за изменениями.
          </p>
          <button
            type="button"
            onClick={() => setNotice('Форма добавления — следующий экран макета.')}
            className={`mt-6 inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-brand ${RING}`}
          >
            <PlusIcon size={17} />
            {t.add}
          </button>
        </div>
      ) : (
        <>
          {isAgency && <AgencySummary list={pool} />}

          <div className="mb-5 flex flex-col gap-3">
            {isAgency && (
              <div role="group" aria-label="Чьи проекты" className="inline-flex w-fit gap-1 rounded-lg border border-line-2 bg-white p-1">
                {scopes.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={scope === s.id}
                    onClick={() => setScope(s.id)}
                    className={`rounded-[6px] px-3.5 py-2 text-[13px] font-semibold transition-colors ${RING} ${
                      scope === s.id ? 'bg-ink text-white' : 'text-ink/60 hover:text-ink'
                    }`}
                  >
                    {s.label} <span className={scope === s.id ? 'text-white/60' : 'text-ink/40'}>{s.n}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[240px] flex-1">
                <label htmlFor="project-search" className="sr-only">Поиск по названию, домену или ИНН</label>
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40">
                  <SearchIcon size={17} />
                </span>
                <input
                  id="project-search"
                  type="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full rounded-lg border-[1.5px] border-line-2 bg-white py-3 pl-11 pr-11 text-[15px] text-ink placeholder:text-ink/30 transition-colors focus:border-brand focus:shadow-[0_0_0_4px_rgba(31,31,230,0.08)] focus:outline-none"
                />
                {searching && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Сбросить поиск"
                    className={`absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-lg text-ink/45 transition-colors hover:text-ink ${RING}`}
                  >
                    <CloseIcon size={16} />
                  </button>
                )}
              </div>

              <div>
                <label htmlFor="project-sort" className="sr-only">Сортировка</label>
                <select
                  id="project-sort"
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                  className={`rounded-lg border-[1.5px] border-line-2 bg-white px-3 py-3 text-[13.5px] font-medium text-ink transition-colors focus:border-brand focus:outline-none ${RING}`}
                >
                  {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>

              <div role="group" aria-label="Вид списка" className="flex gap-1 rounded-lg border border-line-2 bg-white p-1">
                {[
                  { id: 'cards', label: 'Карточки', Icon: GridIcon },
                  { id: 'table', label: 'Таблица',  Icon: ListIcon },
                ].map(v => (
                  <button
                    key={v.id}
                    type="button"
                    aria-pressed={view === v.id}
                    aria-label={v.label}
                    onClick={() => setView(v.id)}
                    className={`grid h-10 w-10 place-items-center rounded-[6px] transition-colors ${RING} ${
                      view === v.id ? 'bg-ink text-white' : 'text-ink/50 hover:text-ink'
                    }`}
                  >
                    <v.Icon size={17} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-lg border border-line-2 bg-paper px-6 py-12 text-center">
              <p className="text-[15px] font-semibold">Ничего не нашлось</p>
              <p className="mx-auto mt-1.5 max-w-[42ch] text-[13.5px] leading-snug text-ink/60">
                По запросу «{query.trim()}» ничего нет. Проверьте написание домена или ИНН.
              </p>
              <button
                type="button"
                onClick={() => { setQuery(''); setScope('all'); }}
                className={`mt-5 rounded-lg border border-line-2 bg-white px-4 py-2.5 text-[13px] font-semibold transition-colors hover:border-ink/30 ${RING}`}
              >
                Сбросить фильтры
              </button>
            </div>
          ) : (
            <>
              {searching && (
                <p className="mb-3 font-mono text-[11px] text-ink/50">
                  найдено: {filtered.length} {plural(filtered.length, ...t.countWords)}
                </p>
              )}
              {view === 'cards' && (
                <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9.5px] uppercase tracking-[0.06em] text-ink/45">
                  <span>полоска шести проверок:</span>
                  {SEGMENT_LEGEND.map(l => (
                    <span key={l.text} className="inline-flex items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${TONE_BG[l.tone]}`} />
                      {l.text}
                    </span>
                  ))}
                </div>
              )}
              {view === 'cards' ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.map(p => (
                    <ProjectCard key={p.id} p={p} showOwner={isAgency} onAction={setNotice} />
                  ))}
                </div>
              ) : (
                <ProjectsTable list={filtered} showOwner={isAgency} onAction={setNotice} />
              )}
            </>
          )}

          <p className="mt-8 text-[11.5px] leading-relaxed text-ink/55">{DISCLAIMER}</p>
        </>
      )}
    </main>
  );
}
