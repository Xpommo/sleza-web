'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RefreshIcon, ChevronIcon, DocsIcon, BillingIcon } from '../../../../../components/app/AppIcons';
import { StatusBadge, StatusLine, TONE_TEXT, TONE_BG, OwnerBadge, OWNER_WORDING } from '../../../../../components/app/StatusBits';
import { projectSummary, fineLabel, scanLabel, paymentState, terms, DISCLAIMER } from '../../../../../lib/appMock';
import { useMock } from '../../../../../components/app/MockControls';
import {
  getProject, projectChecks, sortedDocuments, projectTimeline, splitByOwner,
  STATUS_TONE, STATUS_WORD, DOC_STATE, CLOSED_BY, PRICE, TIMING,
} from '../../../../../lib/projectMock';

// Обзор проекта. Экран строится от худшего состояния, а не от структуры данных:
// сверху вердикт и одно действие, ниже — что именно нашли, потом документы и история.
//
// Два цвета не спорят: цвет означает только тяжесть находки. Бейджи «кто делает» —
// нейтральные и различаются формой, иначе «нужны вы» читалось бы как замечание.

const RING =
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 focus-visible:border-brand';

// Единый словарь: одно и то же не должно называться двумя способами на одном экране.
const WORDING = OWNER_WORDING;

const SCAN_STEPS = [
  'Открываем страницы сайта',
  'Ищем политику и согласия',
  'Сверяем реквизиты с ЕГРЮЛ',
  'Проверяем трекинг и рекламу',
];

function ScanRunning({ domain }) {
  return (
    <div className="rounded-lg border border-line-2 bg-white p-6">
      <div className="flex items-center gap-3">
        <span className="h-2.5 w-2.5 animate-pulseDot rounded-full bg-brand" />
        <h2 className="text-[17px] font-bold tracking-[-0.02em]">Проверяем {domain}</h2>
      </div>
      <p className="mt-2 text-[14px] text-ink/65">
        Обычно занимает 2–5 минут. Можно закрыть страницу — пришлём результат на почту.
      </p>
      <ul className="mt-5 space-y-2.5">
        {SCAN_STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-3 text-[13.5px]">
            <span className={`h-1.5 w-1.5 rounded-full ${i < 2 ? 'bg-ok' : 'bg-line-2'}`} />
            <span className={i < 2 ? 'text-ink/70' : 'text-ink/40'}>{s}</span>
            {i === 2 && <span className="font-mono text-[10.5px] text-ink/40">идёт…</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProblemRow({ check, open, onToggle, onAction, locked }) {
  const tone = STATUS_TONE[check.status];
  const byUs = check.closedBy === CLOSED_BY.US;

  return (
    <div className="border-b border-line last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-warm/60 ${RING}`}
      >
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TONE_BG[tone]}`} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold tracking-[-0.02em]">{check.title}</span>
          <span className={`text-[12.5px] font-semibold ${TONE_TEXT[tone]}`}>{STATUS_WORD[check.status]}</span>
        </span>
        <OwnerBadge byUs={byUs} />
        <span className={`shrink-0 text-ink/35 transition-transform ${open ? 'rotate-90' : ''}`}>
          <ChevronIcon size={15} />
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-line bg-paper px-4 py-4">
          <div>
            <div className="label-micro mb-1">что нашли</div>
            <p className="text-[13.5px] leading-snug text-ink/80">{check.finding}</p>
          </div>
          <div>
            <div className="label-micro mb-1">чем грозит</div>
            <p className={`text-[13.5px] font-semibold ${TONE_TEXT[tone]}`}>{check.law}</p>
          </div>
          <div>
            <div className="label-micro mb-1">{byUs ? 'что сделаем' : 'что нужно от вас'}</div>
            <p className="text-[13.5px] leading-snug text-ink/80">{byUs ? check.weDo : check.youDo}</p>
          </div>
          {!byUs && !locked && (
            <button
              type="button"
              onClick={() => onAction(`Инструкция «${check.title}» — отдельный экран макета.`)}
              className={`rounded-lg border border-line-2 bg-white px-3.5 py-2 text-[12.5px] font-semibold transition-colors hover:border-ink/40 ${RING}`}
            >
              Как это сделать
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Зелёные проверки не должны весить столько же, сколько горящие: сворачиваем в строку.
function OkRows({ checks }) {
  const [open, setOpen] = useState(false);
  if (!checks.length) return null;
  return (
    <div className="border-t border-line">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className={`flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] text-ink/60 transition-colors hover:bg-warm/60 ${RING}`}
      >
        <span className="h-2 w-2 shrink-0 rounded-full bg-ok" />
        {checks.length} {checks.length === 1 ? 'проверка' : checks.length < 5 ? 'проверки' : 'проверок'} в норме
        <span className={`ml-auto text-ink/35 transition-transform ${open ? 'rotate-90' : ''}`}>
          <ChevronIcon size={14} />
        </span>
      </button>
      {open && (
        <ul className="border-t border-line bg-paper px-4 py-3">
          {checks.map(c => (
            <li key={c.name} className="flex items-center gap-2.5 py-1 text-[13px] text-ink/70">
              <span className="h-1.5 w-1.5 rounded-full bg-ok" />
              {c.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ProjectClient({ id }) {
  const project = getProject(id);
  const { isAgency } = useMock();
  const [openRows, setOpenRows] = useState(() => new Set());
  const [scanning, setScanning] = useState(false);
  // Главное конверсионное состояние кабинета: человек пришёл со сканера, подписки нет.
  const [subscribed, setSubscribed] = useState(false);
  const [notice, setNotice] = useState('');

  if (!project) {
    return (
      <main className="mx-auto max-w-[900px] px-5 py-16 sm:px-8">
        <h1 className="text-[22px] font-bold">Проект не найден</h1>
        <Link href="/app" className="mt-3 inline-block text-[14px] font-semibold text-brand hover:underline">
          ← {terms(isAgency).many}
        </Link>
      </main>
    );
  }

  const summary = projectSummary(project);
  const checks = projectChecks(project);
  const { problems, weClose, youClose } = splitByOwner(checks);
  const okChecks = checks.filter(c => c.status === 'ok');
  const docs = sortedDocuments(project);
  const timeline = projectTimeline(project);
  const scan = scanLabel(project);
  const pay = paymentState(project);

  const toggle = (name) => setOpenRows(prev => {
    const next = new Set(prev);
    next.has(name) ? next.delete(name) : next.add(name);
    return next;
  });

  return (
    <main className="mx-auto max-w-[900px] px-5 pb-40 pt-6 sm:px-8 sm:pt-8">

      {/* демо-контролы состояния экрана */}
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink/45">
        <span className="rounded-full border border-line-2 px-2 py-0.5">макет</span>
        <span className="inline-flex items-center gap-1.5">
          подписка:
          {[[false, 'нет'], [true, 'активна']].map(([val, label]) => (
            <button key={label} type="button" aria-pressed={subscribed === val}
              onClick={() => setSubscribed(val)}
              className={`rounded px-1.5 py-0.5 transition-colors ${RING} ${subscribed === val ? 'bg-ink text-white' : 'hover:text-ink'}`}>
              {label}
            </button>
          ))}
        </span>
        <span className="inline-flex items-center gap-1.5">
          состояние:
          {[[false, 'проверен'], [true, 'скан идёт']].map(([val, label]) => (
            <button key={label} type="button" aria-pressed={scanning === val}
              onClick={() => setScanning(val)}
              className={`rounded px-1.5 py-0.5 transition-colors ${RING} ${scanning === val ? 'bg-ink text-white' : 'hover:text-ink'}`}>
              {label}
            </button>
          ))}
        </span>
      </div>

      {/* шапка */}
      <div className="mb-6">
        <Link href="/app" className={`mb-3 inline-flex items-center gap-1 rounded text-[12.5px] font-semibold text-ink/55 transition-colors hover:text-ink ${RING}`}>
          ← {terms(isAgency).many}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate font-mono text-[24px] font-bold tracking-[-0.02em] sm:text-[28px]">{project.domain}</h1>
            <p className="mt-1 text-[13.5px] text-ink/65">{project.org.name} · ИНН {project.org.inn}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <StatusLine tone={scan.stale ? 'warn' : 'muted'} text={scan.text} />
              {/* Подписка живёт в аккаунте — здесь только строка статуса */}
              {subscribed
                ? <StatusLine tone={pay.tone} text={pay.text} />
                : <StatusLine tone="warn" text="подписка не подключена" />}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setScanning(true)}
            className={`inline-flex items-center gap-2 rounded-lg border border-line-2 bg-white px-4 py-2.5 text-[13px] font-semibold transition-colors hover:border-ink/40 ${RING}`}
          >
            <RefreshIcon size={16} />
            Проверить сейчас
          </button>
        </div>
      </div>

      <div aria-live="polite">
        {notice && (
          <p role="status" className="mb-5 rounded-lg border border-brand/20 bg-[var(--brand-tint)] px-3.5 py-3 text-[13px] text-ink/75">
            {notice}
          </p>
        )}
      </div>

      {scanning ? (
        <ScanRunning domain={project.domain} />
      ) : (
        <>
          {/* вердикт и единственное главное действие */}
          <section className={`mb-6 rounded-lg border bg-white p-5 ${
            summary.tone === 'danger' ? 'border-danger/30' : summary.tone === 'warn' ? 'border-warn/30' : 'border-line-2'
          }`}>
            <StatusBadge tone={summary.tone} label={summary.label} secondary={summary.secondary} size="lg" extra={fineLabel(project)} />

            {problems.length > 0 ? (
              <>
                <p className="mt-2 text-[14px] leading-snug text-ink/70">
                  К работе {problems.length} {problems.length === 1 ? 'пункт' : problems.length < 5 ? 'пункта' : 'пунктов'}
                  {weClose.length > 0 && youClose.length > 0 && <>: {weClose.length} {WORDING.us}, для {youClose.length} {WORDING.you}.</>}
                  {weClose.length > 0 && youClose.length === 0 && <> — {WORDING.us}, от вас нужны только данные для анкеты.</>}
                  {weClose.length === 0 && youClose.length > 0 && <> — документами это не лечится, {WORDING.you}.</>}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                  {subscribed ? (
                    <>
                      {weClose.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setNotice('Анкета → сборка документов → установка виджета — визард из трёх шагов, следующий экран макета.')}
                          className={`inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-brand ${RING}`}
                        >
                          <DocsIcon size={17} />
                          Собрать документы
                        </button>
                      )}
                      {/* Честный срок: анкета — минуты, документы — дни. Обещать пять минут
                          на пакет значит обмануть там, где продаётся доверие. */}
                      <span className="font-mono text-[11px] leading-snug text-ink/50">
                        {TIMING.form} · {TIMING.docs}
                      </span>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/app/start/prepare"
                        className={`inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-brand ${RING}`}
                      >
                        <BillingIcon size={17} />
                        Подключить за {PRICE}
                      </Link>
                      <span className="font-mono text-[11px] leading-snug text-ink/50">
                        {weClose.length > 0 && <>{weClose.length} из {problems.length} закроем сразу · </>}
                        {TIMING.docs}
                      </span>
                    </>
                  )}
                </div>
              </>
            ) : (
              <p className="mt-2 text-[14px] leading-snug text-ink/70">
                Всё закрыто. Следим за сайтом — если что-то изменится, сообщим и обновим документы.
              </p>
            )}
          </section>

          {/* что нашли: сначала проблемы, зелёные свёрнуты внизу */}
          <section className="mb-6">
            <h2 className="mb-3 text-[15px] font-bold tracking-[-0.02em]">Что нашли</h2>
            <div className="overflow-hidden rounded-lg border border-line-2 bg-white">
              {problems.map(c => (
                <ProblemRow
                  key={c.name}
                  check={c}
                  open={openRows.has(c.name)}
                  onToggle={() => toggle(c.name)}
                  onAction={setNotice}
                  locked={!subscribed}
                />
              ))}
              <OkRows checks={okChecks} />
            </div>
          </section>

          {/* документы */}
          <section className="mb-6">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-bold tracking-[-0.02em]">Документы</h2>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink/45">версии и причина изменений</span>
            </div>

            {subscribed ? (
              <div className="overflow-hidden rounded-lg border border-line-2 bg-white">
                {docs.map(d => {
                  const st = DOC_STATE[d.state];
                  return (
                    <div key={d.name} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-4 py-3 last:border-0">
                      <div className="min-w-[220px] flex-1">
                        <div className="text-[14px] font-semibold">{d.name}</div>
                        {d.version
                          ? <div className="font-mono text-[11px] text-ink/50">v{d.version} · {d.date} · {d.reason}</div>
                          : <div className="font-mono text-[11px] text-ink/50">войдёт в ближайшую сборку пакета</div>}
                      </div>
                      <StatusLine tone={st.tone} text={st.text} />
                      {/* У отсутствующего документа тоже есть действие: иначе самое
                          продающее состояние оказывается тупиком */}
                      <button
                        type="button"
                        onClick={() => setNotice(d.version
                          ? `Просмотр документа «${d.name}» — отдельный экран макета.`
                          : `Сборка «${d.name}» — визард анкеты, следующий экран макета.`)}
                        className={`rounded-lg border border-line-2 px-3 py-1.5 text-[12px] font-semibold transition-colors hover:border-ink/40 ${RING}`}
                      >
                        {d.version ? 'Открыть' : 'Собрать'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-line-2 bg-paper p-5">
                <p className="text-[14px] leading-snug text-ink/70">
                  Входят в подписку: политика конфиденциальности, согласие на обработку данных,
                  политика cookie и оферта. Собираем по вашим данным и обновляем, когда меняется закон.
                </p>
                <button
                  type="button"
                  onClick={() => setNotice('Оплата подписки — отдельный экран макета.')}
                  className={`mt-4 rounded-lg border border-line-2 bg-white px-4 py-2.5 text-[13px] font-semibold transition-colors hover:border-ink/40 ${RING}`}
                >
                  Что входит в подписку
                </button>
              </div>
            )}
          </section>

          {/* история */}
          {subscribed && (
            <section>
              <h2 className="mb-3 text-[15px] font-bold tracking-[-0.02em]">История</h2>
              <ol className="space-y-3 border-l border-line pl-4">
                {timeline.map(e => (
                  <li key={e.date + e.text} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-1.5 w-1.5 rounded-full bg-line-2" />
                    <div className="font-mono text-[11px] text-ink/45">{e.date}</div>
                    <div className="text-[13.5px] text-ink/80">{e.text}</div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <p className="mt-8 text-[11.5px] leading-relaxed text-ink/55">{DISCLAIMER}</p>
        </>
      )}
    </main>
  );
}
