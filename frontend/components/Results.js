'use client';
import { useState } from 'react';

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

const LAW_LINKS = {
  'law152': 'https://www.consultant.ru/document/cons_doc_LAW_61801/',
  'law149': 'https://www.consultant.ru/document/cons_doc_LAW_48524/',
  'erir':   'https://www.consultant.ru/document/cons_doc_LAW_126477/',
  'offer':  'https://www.consultant.ru/document/cons_doc_LAW_305/',
  'drugs':  'https://www.consultant.ru/document/cons_doc_LAW_10172/',
};

const STATUS_BORDER = {
  ok:        'border-l-green-500',
  risk:      'border-l-amber-500',
  violation: 'border-l-red-500',
  unknown:   'border-l-neutral-700',
};

const STATUS_TEXT = {
  ok:        'text-green-400',
  risk:      'text-amber-400',
  violation: 'text-red-400',
  unknown:   'text-neutral-500',
};

const STATUS_LABEL = {
  ok:        '✓ Соответствует',
  risk:      '⚠ Риск',
  violation: '✗ Нарушение',
  unknown:   '? Не определено',
};

const CONFIDENCE_TEXT = {
  high:   'text-green-400',
  medium: 'text-amber-400',
  low:    'text-red-400',
};

const CONFIDENCE_LABEL = {
  high:   'высокая',
  medium: 'средняя',
  low:    'низкая',
};

function parseFine(str) {
  if (!str) return 0;
  const m = str.replace(/[\s ]/g, '').match(/(\d+)руб/);
  return m ? parseInt(m[1], 10) : 0;
}

function ConfidenceBadge({ confidence }) {
  if (!confidence) return null;
  return (
    <span className={`text-xs font-mono ${CONFIDENCE_TEXT[confidence.label] || CONFIDENCE_TEXT.medium}`}>
      достоверность {CONFIDENCE_LABEL[confidence.label] || '—'} ({confidence.score}/100)
    </span>
  );
}

function DiffSummary({ diff }) {
  if (!diff || (diff.resolved.length === 0 && diff.newViolations.length === 0)) return null;
  const prevDate = diff.scannedAt
    ? new Date(diff.scannedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'long' })
    : null;
  return (
    <div className="border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm flex flex-wrap gap-x-4 gap-y-1">
      <span className="text-neutral-500">с прошлой проверки{prevDate ? ` (${prevDate})` : ''}:</span>
      {diff.resolved.length > 0 && (
        <span className="text-green-400 font-mono">+{diff.resolved.length} исправлено</span>
      )}
      {diff.newViolations.length > 0 && (
        <span className="text-red-400 font-mono">+{diff.newViolations.length} появилось</span>
      )}
    </div>
  );
}

function DiffBadge({ diffEntry }) {
  if (!diffEntry || diffEntry.direction === 'unchanged') return null;
  if (diffEntry.direction === 'improved') {
    return (
      <span className="text-xs text-green-400 font-mono mt-1 block">
        ↑ было {STATUS_LABEL[diffEntry.prev] || diffEntry.prev}
      </span>
    );
  }
  return (
    <span className="text-xs text-red-400 font-mono mt-1 block">
      ↓ было {STATUS_LABEL[diffEntry.prev] || diffEntry.prev}
    </span>
  );
}

function FeedbackButton({ checkId, scanUuid }) {
  const [state, setState] = useState('idle');

  if (!scanUuid) return null;

  if (state === 'done') {
    return <span className="text-xs text-neutral-600 mt-2 block">Спасибо за отзыв</span>;
  }
  if (state === 'error') {
    return (
      <button onClick={() => setState('idle')} className="text-xs text-red-400 mt-2 block hover:underline">
        Не удалось отправить. Повторить?
      </button>
    );
  }
  if (state === 'picking') {
    const send = async (verdict) => {
      setState('sending');
      try {
        const r = await fetch(`${BASE}/api/feedback`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ scan_uuid: scanUuid, check_id: checkId, verdict }),
        });
        setState(r.ok ? 'done' : 'error');
      } catch {
        setState('error');
      }
    };
    return (
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => send('false_positive')}
          className="text-xs bg-neutral-800 border border-neutral-700 px-2 py-1 hover:bg-neutral-700 transition-colors text-neutral-300"
        >
          Нарушения нет
        </button>
        <button
          onClick={() => send('confirm')}
          className="text-xs bg-neutral-800 border border-neutral-700 px-2 py-1 hover:bg-neutral-700 transition-colors text-neutral-300"
        >
          Подтвердить
        </button>
        <button onClick={() => setState('idle')} className="text-xs text-neutral-600 hover:text-neutral-400 px-1">×</button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setState('picking')}
      className="text-xs text-neutral-700 hover:text-neutral-500 mt-2 block transition-colors"
    >
      Неверно?
    </button>
  );
}

function CheckCard({ check, diffEntry, scanUuid }) {
  const isIssue   = check.status === 'violation' || check.status === 'risk';
  const borderCls = STATUS_BORDER[check.status] || STATUS_BORDER.unknown;
  const textCls   = STATUS_TEXT[check.status] || STATUS_TEXT.unknown;

  return (
    <div className={`border border-l-2 border-neutral-800 bg-neutral-900 p-4 ${borderCls}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-xs text-neutral-600">
              {LAW_LINKS[check.id]
                ? <a href={LAW_LINKS[check.id]} target="_blank" rel="noopener" className="hover:text-neutral-400 transition-colors">{check.law_code}</a>
                : check.law_code
              }
            </span>
            <span className="text-sm font-semibold text-neutral-200">{check.law}</span>
          </div>
          <div className="text-xs text-neutral-600 font-mono">штраф {check.fine}</div>
          <DiffBadge diffEntry={diffEntry} />
          {isIssue && <FeedbackButton checkId={check.id} scanUuid={scanUuid} />}
        </div>
        <span className={`text-xs font-mono font-medium flex-shrink-0 pt-0.5 whitespace-nowrap ${textCls}`}>
          {STATUS_LABEL[check.status] || check.status}
        </span>
      </div>
    </div>
  );
}

function SlezaSection({ pages }) {
  const allItems = pages.flatMap(p => p.items || []);
  if (allItems.length === 0) {
    return (
      <div className="border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-500 flex items-center gap-3">
        <span className="text-neutral-700">💧</span>
        <span>Иноагентов, экстремистов и нежелательных организаций не обнаружено</span>
      </div>
    );
  }
  const unmarked = allItems.filter(i => !i.hasMarking);
  return (
    <div className="border border-red-900/40 bg-neutral-900 p-4 space-y-3">
      <div className="text-sm font-semibold text-red-400 font-mono">
        💧 Реестр Слезы: {allItems.length} упоминаний
        {unmarked.length > 0 && `, из них ${unmarked.length} без маркировки`}
      </div>
      {allItems.slice(0, 10).map((item, i) => (
        <div key={i} className="text-xs text-neutral-500 flex gap-2">
          <span className={`font-mono ${item.hasMarking ? 'text-green-400' : 'text-red-400'}`}>
            {item.hasMarking ? '✓' : '✗'}
          </span>
          <span>{item.name} <span className="text-neutral-700">({item.category})</span></span>
        </div>
      ))}
    </div>
  );
}

export default function Results({ data, uuid, onShare, onNewScan }) {
  const hostname   = data.hostname || data.url;
  const checks     = data.aiData?.checks || [];
  const violations = checks.filter(c => c.status === 'violation');
  const totalFine  = violations.reduce((sum, c) => sum + parseFine(c.fine), 0);
  const fineStr    = totalFine > 0 ? totalFine.toLocaleString('ru-RU') : null;
  const scannedAt  = data.scannedAt
    ? new Date(data.scannedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : null;

  const diffMap = new Map((data.diff?.checks || []).map(c => [c.id, c]));

  return (
    <div className="mt-8 space-y-2" data-results>

      {/* Fallback warning */}
      {data.fallback && (
        <div className="border border-amber-900/50 bg-neutral-900 px-4 py-3 text-amber-400/80 text-sm">
          Страница загружена без JS-рендеринга — сайт ограничил доступ. Часть данных может отсутствовать.
        </div>
      )}

      {/* Diff summary */}
      <DiffSummary diff={data.diff} />

      {/* Header */}
      <div className="border border-neutral-800 bg-neutral-900 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-base font-bold text-neutral-100">{data.aiData?.site_name || hostname}</div>
            <div className="text-xs font-mono text-neutral-600 mt-1">
              {hostname} · {data.mode === 'full' ? 'весь сайт' : 'одна страница'}
              {scannedAt && ` · ${scannedAt}`}
            </div>
            {data.confidence && (
              <div className="mt-2">
                <ConfidenceBadge confidence={data.confidence} />
              </div>
            )}
          </div>
          {data.stats && (
            <div className="text-xs font-mono text-neutral-600 text-right flex-shrink-0">
              {data.stats.scanned}/{data.stats.total} стр.<br />
              {data.stats.found} упом.
            </div>
          )}
        </div>
      </div>

      {/* Sleza registry */}
      <SlezaSection pages={data.pages || []} />

      {/* Law checks */}
      {checks.length > 0 && (
        <div className="space-y-px">
          {checks.map(check => (
            <CheckCard
              key={check.id}
              check={check}
              diffEntry={diffMap.get(check.id)}
              scanUuid={uuid}
            />
          ))}
        </div>
      )}

      {/* EGRUL */}
      {data.egrul?.result?.parsed && (
        <div className={`border bg-neutral-900 p-4 ${
          data.egrul.result.parsed.isActive ? 'border-neutral-800' : 'border-red-900/40'
        }`}>
          <div className={`font-mono text-xs font-semibold mb-2 ${
            data.egrul.result.parsed.isActive ? 'text-green-400' : 'text-red-400'
          }`}>
            {data.egrul.result.parsed.isActive ? '✓' : '✗'} ЕГРЮЛ: {data.egrul.result.parsed.name}
          </div>
          <div className="text-xs text-neutral-600 font-mono space-y-0.5">
            {data.egrul.ids.inn  && <div>ИНН: {data.egrul.ids.inn}</div>}
            {data.egrul.ids.ogrn && <div>ОГРН: {data.egrul.ids.ogrn}</div>}
            <div>
              Статус: {data.egrul.result.parsed.isActive
                ? 'действующая'
                : `прекращена — ${data.egrul.result.parsed.reason || ''}`}
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className={`border bg-neutral-900 p-5 ${
        violations.length > 0 ? 'border-red-900/40' : 'border-neutral-800'
      }`}>
        {violations.length > 0 ? (
          <>
            <div className="text-xs font-mono text-red-500 uppercase tracking-wider mb-2">
              потенциальные штрафы
            </div>
            {fineStr && (
              <div className="text-3xl font-black text-red-400 mb-1 tracking-tight">
                до {fineStr} ₽
              </div>
            )}
            <div className="text-xs text-neutral-600 font-mono mb-5">
              {violations.length} {violations.length === 1 ? 'нарушение' : 'нарушений'} требует устранения
            </div>
          </>
        ) : (
          <div className="text-sm font-semibold text-green-400 font-mono mb-5">
            ✓ Критических нарушений не обнаружено
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => onShare?.('pdf')}
            disabled={!uuid}
            className="flex-1 text-sm bg-neutral-100 hover:bg-white disabled:opacity-30 disabled:cursor-wait text-neutral-950 py-3 px-4 transition-colors font-bold uppercase tracking-wide"
          >
            {uuid ? 'Скачать отчёт' : 'Подготовка…'}
          </button>
          <button
            onClick={() => onShare?.('share')}
            disabled={!uuid}
            className="text-sm bg-transparent hover:bg-neutral-800 disabled:opacity-30 text-neutral-500 hover:text-neutral-300 border border-neutral-800 hover:border-neutral-600 py-3 px-4 transition-colors font-mono"
          >
            {uuid ? '↗' : '…'}
          </button>
        </div>
      </div>

      <button
        onClick={onNewScan}
        className="w-full text-xs text-neutral-600 hover:text-neutral-400 border border-neutral-800 hover:border-neutral-700 py-3 transition-colors uppercase tracking-wider font-mono"
      >
        ← Проверить другой сайт
      </button>
    </div>
  );
}