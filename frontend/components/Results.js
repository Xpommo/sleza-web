'use client';
import { useState } from 'react';
import MonitoringSignup from './MonitoringSignup';
import DocOfferCard from './DocOfferCard';
import IntakeModal from './IntakeModal';

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

const LAW_LINKS = {
  'law152': 'https://www.consultant.ru/document/cons_doc_LAW_61801/',
  'law149': 'https://www.consultant.ru/document/cons_doc_LAW_48524/',
  'erir':   'https://www.consultant.ru/document/cons_doc_LAW_126477/',
  'offer':  'https://www.consultant.ru/document/cons_doc_LAW_305/',
  'drugs':  'https://www.consultant.ru/document/cons_doc_LAW_10172/',
};

const STATUS_BADGE_CLASS = {
  ok:        'bg-[rgba(26,122,82,0.1)] text-ok',
  risk:      'bg-[rgba(184,121,0,0.12)] text-warn',
  violation: 'bg-[rgba(214,56,22,0.1)] text-danger',
  unknown:   'bg-line text-ink/50',
};

const STATUS_LABEL = {
  ok:        'в норме',
  risk:      'риск',
  violation: 'нарушено',
  unknown:   '?',
};

const STATUS_DOT_BG = {
  ok:        'bg-ok',
  risk:      'bg-warn',
  violation: 'bg-danger',
  unknown:   'bg-ink/30',
};

const CONFIDENCE_STYLE = {
  high:   'bg-[rgba(26,122,82,0.1)] text-ok',
  medium: 'bg-[rgba(184,121,0,0.12)] text-warn',
  low:    'bg-[rgba(214,56,22,0.1)] text-danger',
};

const CONFIDENCE_LABEL = {
  high:   'достоверность высокая',
  medium: 'достоверность средняя',
  low:    'достоверность низкая',
};

function parseFine(str) {
  if (!str) return 0;
  const m = str.replace(/[\s ]/g, '').match(/(\d+)руб/);
  return m ? parseInt(m[1], 10) : 0;
}

function fmtMoney(n) {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ');
}

function ConfidenceBadge({ confidence }) {
  if (!confidence) return null;
  const style = CONFIDENCE_STYLE[confidence.label] || CONFIDENCE_STYLE.medium;
  return (
    <span className={`font-mono text-[10.5px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-[4px] ${style}`}>
      {CONFIDENCE_LABEL[confidence.label] || 'достоверность'} · {confidence.score}/100
    </span>
  );
}

function DiffSummary({ diff }) {
  if (!diff || (diff.resolved.length === 0 && diff.newViolations.length === 0)) return null;
  const prevDate = diff.scannedAt
    ? new Date(diff.scannedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'long' })
    : null;
  return (
    <div className="rounded-lg border border-brand/30 bg-brand/5 px-4 py-3 text-[13px] flex flex-wrap gap-x-4 gap-y-1 text-ink-2">
      <span className="font-semibold">С прошлой проверки{prevDate ? ` (${prevDate})` : ''}:</span>
      {diff.resolved.length > 0 && (
        <span className="text-ok">✓ исправлено {diff.resolved.length}</span>
      )}
      {diff.newViolations.length > 0 && (
        <span className="text-danger">✗ появилось {diff.newViolations.length}</span>
      )}
    </div>
  );
}

function DiffBadge({ diffEntry }) {
  if (!diffEntry || diffEntry.direction === 'unchanged') return null;
  if (diffEntry.direction === 'improved') {
    return (
      <span className="text-[11px] text-ok font-medium mt-1 block">
        было «{STATUS_LABEL[diffEntry.prev] || diffEntry.prev}» → стало лучше
      </span>
    );
  }
  return (
    <span className="text-[11px] text-danger font-medium mt-1 block">
      было «{STATUS_LABEL[diffEntry.prev] || diffEntry.prev}» → стало хуже
    </span>
  );
}

function FeedbackButton({ checkId, scanUuid }) {
  const [state, setState] = useState('idle');
  if (!scanUuid) return null;

  if (state === 'done') {
    return <span className="text-[11px] text-ink/40 mt-1.5 block">спасибо за отзыв</span>;
  }
  if (state === 'error') {
    return (
      <button onClick={() => setState('idle')} className="text-[11px] text-danger/70 mt-1.5 block hover:underline">
        не удалось отправить · повторить
      </button>
    );
  }
  if (state === 'picking') {
    const send = async (verdict) => {
      setState('sending');
      try {
        const r = await fetch(`${BASE}/api/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scan_uuid: scanUuid, check_id: checkId, verdict }),
        });
        setState(r.ok ? 'done' : 'error');
      } catch {
        setState('error');
      }
    };
    return (
      <div className="flex gap-1.5 mt-2">
        <button onClick={() => send('false_positive')} className="text-[11px] bg-white border border-line-2 rounded px-2 py-1 hover:border-ink/30 transition-colors">нет нарушения</button>
        <button onClick={() => send('confirm')} className="text-[11px] bg-white border border-line-2 rounded px-2 py-1 hover:border-ink/30 transition-colors">подтвердить</button>
        <button onClick={() => setState('idle')} className="text-[11px] text-ink/30 hover:text-ink/60 px-1">✕</button>
      </div>
    );
  }
  return (
    <button onClick={() => setState('picking')} className="text-[11px] text-ink/40 hover:text-ink/70 mt-1.5 block underline-offset-2 hover:underline transition-colors">
      неверно?
    </button>
  );
}

// Returns the first sentence / first list item + count of hidden items for the teaser view.
function teaserIssue(issue) {
  if (!issue) return { text: '', hidden: 0 };
  if (issue.length <= 95) return { text: issue, hidden: 0 };

  // "Отсутствует: A; B; C" → show "Отсутствует: A" + count
  const listMatch = issue.match(/^([^;]{10,}?)((?:;\s*[^;]+){1,})$/);
  if (listMatch) {
    const hidden = (listMatch[2].match(/;/g) || []).length;
    return { text: listMatch[1].trim(), hidden };
  }

  // Multi-sentence: show first sentence
  const dotIdx = issue.search(/\.\s+[А-ЯЁA-Z«"]/);
  if (dotIdx > 20) return { text: issue.slice(0, dotIdx + 1), hidden: -1 };

  return { text: issue.slice(0, 90).trimEnd() + '…', hidden: -1 };
}

function FindingRow({ check, idx, diffEntry, scanUuid }) {
  const isIssue = check.status === 'violation' || check.status === 'risk';
  return (
    <div className="px-5 sm:px-6 py-4 border-b border-line last:border-b-0 hover:bg-warm/40 transition-colors grid sm:grid-cols-[32px_minmax(0,1.3fr)_minmax(0,1.8fr)_140px_90px] gap-3 sm:gap-5 items-start">
      <div className="font-mono text-[11px] text-ink/25 tracking-wider hidden sm:block pt-1">{String(idx + 1).padStart(2, '0')}</div>

      <div className="flex sm:block items-baseline gap-3">
        <span className="font-mono text-[11px] text-ink/25 tracking-wider sm:hidden">{String(idx + 1).padStart(2, '0')}</span>
        <div className="min-w-0">
          <h4 className="font-bold text-[15px] tracking-tight leading-snug">{check.law}</h4>
          <div className="font-mono text-[11px] text-ink/40 mt-0.5">
            {LAW_LINKS[check.id]
              ? <a href={LAW_LINKS[check.id]} target="_blank" rel="noopener" className="text-brand hover:underline">{check.law_code}</a>
              : <span className="text-brand">{check.law_code}</span>
            }
          </div>
        </div>
      </div>

      <div className="text-[13px] text-ink/60 leading-snug pt-0.5">
        {isIssue ? (
          <>
            {check.issue ? (() => {
              const { text, hidden } = teaserIssue(check.issue);
              return (
                <span className="text-ink/80">
                  {text}
                  {hidden > 0 && (
                    <span className="text-ink/35 font-mono text-[11px]"> + ещё {hidden} пункта — в PDF</span>
                  )}
                </span>
              );
            })() : <span>требует устранения.</span>}
            <span className="block mt-1 text-[12px] text-ink/40">
              {check.status === 'violation'
                ? <>рекомендации, цитаты со страниц — в <span className="text-danger/50 font-medium">PDF-отчёте</span></>
                : <>рекомендации по устранению — в PDF-отчёте</>
              }
            </span>
            {check._override && (
              <span className="ml-2 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-[3px]"
                title={check._override.reason || 'Скорректировано на основе фидбэка пользователей'}>
                оспорено {check._override.count} раз
              </span>
            )}
            <DiffBadge diffEntry={diffEntry} />
            <FeedbackButton checkId={check.id} scanUuid={scanUuid} />
          </>
        ) : (
          <>
            <span>параметр соответствует требованию.</span>
            {check._override && (
              <span className="ml-2 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-[3px]"
                title={check._override.reason || 'Скорректировано на основе фидбэка пользователей'}>
                оспорено {check._override.count} раз
              </span>
            )}
            <DiffBadge diffEntry={diffEntry} />
          </>
        )}
      </div>

      <div className="flex sm:block items-center justify-between sm:text-right whitespace-nowrap pt-0.5">
        <div className="font-mono text-[9px] uppercase tracking-wider text-ink/25 sm:mb-0.5">штраф</div>
        <div className={`font-bold text-[15px] tracking-tight ${isIssue ? 'text-danger' : 'text-ink/40 line-through'}`}>
          {check.fine}
        </div>
      </div>

      <div className="hidden sm:flex justify-end pt-1">
        <span className={`inline-flex items-center justify-center font-mono text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded-[3px] whitespace-nowrap ${STATUS_BADGE_CLASS[check.status] || STATUS_BADGE_CLASS.unknown}`}>
          {STATUS_LABEL[check.status] || '?'}
        </span>
      </div>

      {/* status badge on mobile */}
      <div className="sm:hidden">
        <span className={`inline-flex items-center justify-center font-mono text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded-[3px] ${STATUS_BADGE_CLASS[check.status] || STATUS_BADGE_CLASS.unknown}`}>
          {STATUS_LABEL[check.status] || '?'}
        </span>
      </div>
    </div>
  );
}

function SlezaBlock({ pages }) {
  const allItems = pages.flatMap(p => p.items || []);
  if (allItems.length === 0) {
    return (
      <div className="rounded-lg border border-ok/30 bg-ok/[0.04] px-5 py-4 flex items-center gap-3">
        <span className="w-7 h-7 rounded-full bg-ok text-white flex items-center justify-center text-[14px] font-bold shrink-0">✓</span>
        <div className="text-[14px] text-ink">
          <b className="font-semibold">реестр слезы:</b>{' '}
          <span className="text-ink/70">иноагентов, экстремистов и нежелательных организаций не обнаружено.</span>
        </div>
      </div>
    );
  }
  const unmarked = allItems.filter(i => !i.hasMarking);
  return (
    <div className="rounded-lg border border-danger/30 bg-danger/[0.04] px-5 py-4">
      <div className="text-[14px] font-semibold text-danger mb-2 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-danger text-white flex items-center justify-center text-[14px] font-bold">!</span>
        <span>
          реестр слезы: {allItems.length} упоминаний
          {unmarked.length > 0 && <span className="text-ink/70 font-normal">, из них <b className="text-danger">{unmarked.length} без маркировки</b></span>}
        </span>
      </div>
      <div className="space-y-1.5 pl-9">
        {allItems.slice(0, 10).map((item, i) => (
          <div key={i} className="text-[12px] text-ink/70 flex gap-2 items-baseline">
            <span className={item.hasMarking ? 'text-ok' : 'text-danger'}>{item.hasMarking ? '✓' : '✗'}</span>
            <span>{item.name}</span>
            <span className="font-mono text-[10px] text-ink/35 uppercase tracking-wider">{item.category}</span>
          </div>
        ))}
        {allItems.length > 10 && (
          <div className="text-[11px] text-ink/40 italic">… и ещё {allItems.length - 10}</div>
        )}
      </div>
    </div>
  );
}

export default function Results({ data, uuid, onShare, onNewScan, onEmailCaptured }) {
  const [intakeOpen, setIntakeOpen] = useState(false);
  const hostname = data.hostname || data.url;
  const checks   = data.aiData?.checks || [];
  const violations = checks.filter(c => c.status === 'violation');
  const risks      = checks.filter(c => c.status === 'risk');
  const oks        = checks.filter(c => c.status === 'ok');
  const totalFine  = violations.reduce((sum, c) => sum + parseFine(c.fine), 0);
  const fineStr    = totalFine > 0 ? fmtMoney(totalFine) : null;
  const scannedAt  = data.scannedAt
    ? new Date(data.scannedAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  const diffMap = new Map((data.diff?.checks || []).map(c => [c.id, c]));

  // Risk score 0–10: violations weigh 2x, risks 1x, normalized to # checks.
  const totalWeight = checks.length * 2 || 1;
  const score = Math.min(10, ((violations.length * 2 + risks.length) / totalWeight) * 10);
  const scoreLevel = score >= 6 ? { label: 'высокий', color: 'text-danger' }
                    : score >= 3 ? { label: 'средний', color: 'text-warn' }
                    : score > 0  ? { label: 'низкий',  color: 'text-ok' }
                    : { label: 'минимальный', color: 'text-ok' };
  const scorePct = (score / 10) * 100;
  const stampIntent = violations.length > 0 ? 'требует действий' : risks.length > 0 ? 'есть риски' : 'в норме';
  const stampClass = violations.length > 0 ? 'border-danger text-danger bg-danger/[0.04]'
                   : risks.length > 0      ? 'border-warn text-warn bg-warn/[0.04]'
                   : 'border-ok text-ok bg-ok/[0.04]';

  return (
    <div className="mt-7 space-y-3" data-results>

      {/* Fallback warning */}
      {data.fallback && (
        <div className="border border-warn/40 bg-warn/[0.06] rounded-lg px-4 py-3 text-warn text-[13px]">
          ⚠ страница загружена без JS-рендеринга — сайт ограничил доступ автоматическому браузеру. часть данных может отсутствовать.
        </div>
      )}

      {/* Diff summary */}
      <DiffSummary diff={data.diff} />

      {/* REPORT FRAME */}
      <div className="bg-white border border-line-2 rounded-[10px] overflow-hidden">

        {/* meta header */}
        <div className="bg-paper border-b border-line px-5 sm:px-7 py-4 flex flex-wrap gap-x-7 gap-y-3 items-center font-mono text-[11px] text-ink/60 tracking-wide">
          <MetaCell k="домен" v={hostname} />
          <MetaCell k="режим"  v={data.mode === 'full' ? 'весь сайт' : 'одна страница'} />
          {scannedAt && <MetaCell k="отчёт от" v={scannedAt} />}
          <MetaCell k="параметров" v={`${checks.length} / ${checks.length}`} />
          <span className={`ml-auto font-mono text-[9.5px] uppercase tracking-[0.16em] font-bold border rounded-[4px] px-2.5 py-1 ${stampClass}`}>
            {stampIntent}
          </span>
        </div>

        {/* site name + confidence */}
        <div className="px-5 sm:px-7 pt-6 pb-4 border-b border-line flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="label-micro mb-1.5">сайт</div>
            <div className="font-bold text-[20px] tracking-tight">{data.aiData?.site_name || hostname}</div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {data.confidence && <ConfidenceBadge confidence={data.confidence} />}
            {data.stats && (
              <span className="font-mono text-[11px] text-ink/40">
                {data.stats.scanned} из {data.stats.total} стр
                {data.stats.found > 0 && ` · ${data.stats.found} упомин.`}
              </span>
            )}
          </div>
        </div>

        {/* VERDICT */}
        <div className="px-5 sm:px-7 py-7 sm:py-8 border-b border-line grid md:grid-cols-[1fr_auto] gap-7 md:gap-8 items-start md:items-center">
          <div>
            <div className="label-micro mb-2">потенциальные штрафы · КоАП РФ</div>
            <div className={`font-extrabold tracking-[-0.05em] leading-[0.92] tabular-nums ${
              totalFine > 0 ? 'text-danger' : 'text-ok'
            }`} style={{ fontSize: 'clamp(48px, 6vw, 84px)' }}>
              {totalFine > 0 ? `${fineStr} ₽` : '0 ₽'}
            </div>
            <div className="mt-3 text-[13px] text-ink/60 leading-snug max-w-[52ch]">
              {totalFine > 0 ? (
                <>суммарно по найденным нарушениям. <b className="text-ink">считаем по верхней границе санкции</b> для юр. лиц. реальная сумма зависит от региона и количества эпизодов.</>
              ) : (
                <>критических нарушений не обнаружено. <b className="text-ink">это не значит, что их нет</b> — рекомендуем перепроверить через квартал и при изменениях на сайте.</>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 items-start md:items-end w-full md:min-w-[240px] md:w-auto">
            <div className="label-micro">риск-скор</div>
            <div className="w-full md:w-[240px] h-2 bg-warm border border-line rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-[1300ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                style={{
                  width: `${scorePct}%`,
                  background: 'linear-gradient(90deg, #b87900 0%, #d63816 100%)',
                }}
              />
            </div>
            <div className="w-full md:w-[240px] flex justify-between font-mono text-[10px] text-ink/25">
              <span>0</span><span>5</span><span>10</span>
            </div>
            <div className={`font-bold text-[14px] tracking-tight ${scoreLevel.color}`}>
              {score.toFixed(1)} / 10 · {scoreLevel.label}
            </div>
          </div>
        </div>

        {/* SUMMARY DOTS */}
        <div className="px-5 sm:px-7 py-4 border-b border-line flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-wider text-ink/60">
          <SummaryDot color="bg-danger" n={violations.length} label="нарушений" />
          <SummaryDot color="bg-warn"   n={risks.length}      label="рисков" />
          <SummaryDot color="bg-ok"     n={oks.length}        label="в норме" />
        </div>

        {/* FINDINGS */}
        {checks.length > 0 && (
          <div className="bg-white">
            {checks.map((check, i) => (
              <FindingRow
                key={check.id || i}
                check={check}
                idx={i}
                diffEntry={diffMap.get(check.id)}
                scanUuid={uuid}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sleza */}
      <SlezaBlock pages={data.pages || []} />

      {/* EGRUL */}
      {data.egrul?.result?.parsed && (
        <div className={`rounded-lg border px-5 py-4 ${
          data.egrul.result.parsed.isActive ? 'border-ok/30 bg-ok/[0.04]' : 'border-danger/30 bg-danger/[0.04]'
        }`}>
          <div className={`font-semibold text-[14px] mb-1.5 ${data.egrul.result.parsed.isActive ? 'text-ok' : 'text-danger'}`}>
            {data.egrul.result.parsed.isActive ? '✓' : '✗'} ЕГРЮЛ · {data.egrul.result.parsed.name}
          </div>
          <div className="text-[12px] text-ink/60 space-y-0.5 font-mono">
            {data.egrul.ids.inn  && <div>ИНН: {data.egrul.ids.inn}</div>}
            {data.egrul.ids.ogrn && <div>ОГРН: {data.egrul.ids.ogrn}</div>}
            <div>статус: {data.egrul.result.parsed.isActive ? 'действующая' : `прекращена — ${data.egrul.result.parsed.reason || ''}`}</div>
          </div>
        </div>
      )}

      {/* Document package offer — primary action when there's something to fix */}
      {(violations.length > 0 || risks.length > 0) && (
        <DocOfferCard data={data} hostname={hostname} uuid={uuid} onOpenIntake={() => setIntakeOpen(true)} />
      )}

      {/* CTA */}
      <div className="rounded-[10px] border border-line-2 bg-paper px-5 sm:px-6 py-6 sm:py-7">
        {violations.length > 0 ? (
          <>
            <div className="label-micro mb-1.5">что делать дальше</div>
            <div className="text-[18px] font-bold tracking-tight mb-1 leading-snug">
              Скачайте PDF — там <span className="text-danger">инструкции как исправить каждое нарушение</span>
            </div>
            <div className="text-[13px] text-ink/55 leading-snug mb-4">
              Готовые шаблоны документов и пошаговый план — в отчёте. Срок хранения — 7 дней.
              <span className="block mt-1 text-[11px] text-ink/35">результат носит информационный характер и не является юридической консультацией.</span>
            </div>
            <div className="flex gap-2 w-full">
              <button
                onClick={() => onShare?.('pdf')}
                disabled={!uuid}
                className="flex-1 bg-ink hover:bg-brand disabled:opacity-40 disabled:cursor-wait text-white rounded-lg px-5 py-3 text-[14px] font-bold transition-colors inline-flex items-center justify-center gap-2"
              >
                {uuid ? '📄 Скачать PDF' : '⏳ Подготовка…'}
              </button>
              <button
                onClick={() => onShare?.('share')}
                disabled={!uuid}
                className="bg-white hover:bg-warm disabled:opacity-40 disabled:cursor-wait text-ink border border-line-2 rounded-lg px-4 py-3 text-[14px] font-medium transition-colors"
                title="поделиться ссылкой"
              >
                🔗
              </button>
            </div>
            <MonitoringSignup
              hostname={hostname}
              uuid={uuid}
              hasViolations={true}
              onEmailCaptured={onEmailCaptured}
            />
          </>
        ) : (
          <>
            <div className="label-micro mb-1.5">всё в порядке</div>
            <div className="text-[18px] font-bold tracking-tight mb-1 leading-snug">
              Сохраните результат и проверьтесь снова через квартал
            </div>
            <div className="text-[13px] text-ink/55 leading-snug mb-4">
              Законы меняются. Мы напомним.
            </div>
            <MonitoringSignup
              hostname={hostname}
              uuid={uuid}
              hasViolations={false}
              onEmailCaptured={onEmailCaptured}
            />
            <div className="flex gap-2 mt-4 pt-4 border-t border-line w-full">
              <button
                onClick={() => onShare?.('pdf')}
                disabled={!uuid}
                className="flex-1 bg-white hover:bg-warm disabled:opacity-40 disabled:cursor-wait text-ink border border-line-2 rounded-lg px-5 py-3 text-[14px] font-medium transition-colors inline-flex items-center justify-center gap-2"
              >
                {uuid ? '📄 Скачать PDF' : '⏳ Подготовка…'}
              </button>
              <button
                onClick={() => onShare?.('share')}
                disabled={!uuid}
                className="bg-white hover:bg-warm disabled:opacity-40 disabled:cursor-wait text-ink border border-line-2 rounded-lg px-4 py-3 text-[14px] font-medium transition-colors"
                title="поделиться ссылкой"
              >
                🔗
              </button>
            </div>
          </>
        )}
      </div>

      {/* Tertiary CTA: разобрать отчёт с автором */}
      <div className="text-center py-1">
        <a
          href={`mailto:kirillmash99@gmail.com?subject=${encodeURIComponent(`Разбор отчёта по ${hostname}`)}&body=${encodeURIComponent('Привет! Хочу разобрать отчёт по своему сайту.')}`}
          className="text-[12px] text-ink/40 hover:text-ink/70 transition-colors font-mono"
        >
          разобрать отчёт вместе с автором →
        </a>
      </div>

      <button
        onClick={onNewScan}
        className="w-full text-[13px] text-ink/50 hover:text-ink border border-line-2 hover:border-ink/30 bg-paper rounded-lg py-3 transition-colors font-mono uppercase tracking-wider"
      >
        ← проверить другой сайт
      </button>

      <IntakeModal
        open={intakeOpen}
        onClose={() => setIntakeOpen(false)}
        data={data}
        hostname={hostname}
        uuid={uuid}
        onSubmit={submitIntake}
      />
    </div>
  );
}

// Sends the document-package заявка. Throws on failure so IntakeModal can surface it.
async function submitIntake(payload) {
  const res = await fetch(`${BASE}/api/doc-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Не удалось отправить заявку. Попробуйте ещё раз.');
  }
}

function MetaCell({ k, v }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9.5px] uppercase tracking-[0.1em] text-ink/25">{k}</span>
      <span className="text-ink font-medium font-mono">{v}</span>
    </div>
  );
}

function SummaryDot({ color, n, label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span><b className="text-ink font-semibold">{n}</b> {label}</span>
    </span>
  );
}
