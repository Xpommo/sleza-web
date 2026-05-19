'use client';

const LAW_LINKS = {
  'law152': 'https://www.consultant.ru/document/cons_doc_LAW_61801/',
  'law149': 'https://www.consultant.ru/document/cons_doc_LAW_48524/',
  'erir':   'https://www.consultant.ru/document/cons_doc_LAW_126477/',
  'offer':  'https://www.consultant.ru/document/cons_doc_LAW_305/',
  'drugs':  'https://www.consultant.ru/document/cons_doc_LAW_10172/',
};

const STATUS_COLOR = {
  ok:        'border-green-200 bg-green-50',
  risk:      'border-amber-200 bg-amber-50',
  violation: 'border-red-200 bg-red-50',
  unknown:   'border-gray-200 bg-gray-50',
};

const STATUS_BADGE = {
  ok:        'bg-green-100 text-green-700',
  risk:      'bg-amber-100 text-amber-700',
  violation: 'bg-red-100 text-red-700',
  unknown:   'bg-gray-100 text-gray-500',
};

const STATUS_LABEL = {
  ok:        '✓ Соответствует',
  risk:      '⚠ Риск',
  violation: '✗ Нарушение',
  unknown:   '? Не определено',
};

function parseFine(str) {
  if (!str) return 0;
  const m = str.replace(/[\s ]/g, '').match(/(\d+)руб/);
  return m ? parseInt(m[1], 10) : 0;
}

// Web view shows only status + fine — full details are in PDF (lead gen gate)
function CheckCard({ check }) {
  const isIssue = check.status === 'violation' || check.status === 'risk';
  return (
    <div className={`rounded-xl border p-4 ${STATUS_COLOR[check.status] || STATUS_COLOR.unknown}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-gray-800">{check.law}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {LAW_LINKS[check.id]
              ? <a href={LAW_LINKS[check.id]} target="_blank" rel="noopener" className="hover:text-blue-500 transition-colors">{check.law_code}</a>
              : check.law_code
            }
            {' · штраф '}{check.fine}
          </div>
          {isIssue && (
            <p className="text-xs text-gray-400 mt-1.5 italic">Подробнее — в PDF-отчёте</p>
          )}
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${STATUS_BADGE[check.status] || STATUS_BADGE.unknown}`}>
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
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 flex items-center gap-2">
        <span>💧</span>
        <span>Иноагентов, экстремистов и нежелательных организаций не обнаружено</span>
      </div>
    );
  }
  const unmarked = allItems.filter(i => !i.hasMarking);
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
      <div className="text-sm font-semibold text-red-700">
        💧 Реестр Слезы: {allItems.length} упоминаний
        {unmarked.length > 0 && `, из них ${unmarked.length} без маркировки`}
      </div>
      {allItems.slice(0, 10).map((item, i) => (
        <div key={i} className="text-xs text-gray-600 flex gap-2">
          <span className={item.hasMarking ? 'text-green-500' : 'text-red-500'}>{item.hasMarking ? '✓' : '✗'}</span>
          <span>{item.name} <span className="text-gray-400">({item.category})</span></span>
        </div>
      ))}
    </div>
  );
}

export default function Results({ data, uuid, onShare, onNewScan }) {
  const hostname = data.hostname || data.url;
  const checks   = data.aiData?.checks || [];
  const issues   = checks.filter(c => c.status === 'violation' || c.status === 'risk');
  const violations = checks.filter(c => c.status === 'violation');
  const totalFine  = violations.reduce((sum, c) => sum + parseFine(c.fine), 0);
  const fineStr    = totalFine > 0 ? totalFine.toLocaleString('ru-RU') : null;
  const scannedAt  = data.scannedAt
    ? new Date(data.scannedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="mt-6 space-y-3" data-results>

      {/* Fallback warning */}
      {data.fallback && (
        <div className="border border-amber-200 bg-amber-50 rounded-xl px-4 py-3 text-amber-700 text-sm">
          ⚠ Страница загружена без JS-рендеринга — сайт ограничил доступ автоматическому браузеру. Часть данных может отсутствовать.
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
        <div>
          <div className="text-base font-bold text-gray-900">{data.aiData?.site_name || hostname}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {hostname} · {data.mode === 'full' ? 'Весь сайт' : 'Одна страница'}
            {scannedAt && ` · ${scannedAt}`}
          </div>
        </div>
        {data.stats && (
          <div className="text-xs text-gray-400 text-right flex-shrink-0">
            {data.stats.scanned} из {data.stats.total}
            {data.stats.discovered > data.stats.total && ` (${data.stats.discovered})`} стр.<br/>
            Упоминаний: {data.stats.found}
          </div>
        )}
      </div>

      {/* Sleza */}
      <SlezaSection pages={data.pages || []} />

      {/* Law cards */}
      {checks.length > 0 && (
        <div className="space-y-2">
          {checks.map(check => <CheckCard key={check.id} check={check} />)}
        </div>
      )}

      {/* EGRUL */}
      {data.egrul?.result?.parsed && (
        <div className={`rounded-xl border p-4 text-sm ${
          data.egrul.result.parsed.isActive ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
        }`}>
          <div className={`font-semibold mb-1 ${data.egrul.result.parsed.isActive ? 'text-green-700' : 'text-red-700'}`}>
            {data.egrul.result.parsed.isActive ? '✓' : '✗'} ЕГРЮЛ: {data.egrul.result.parsed.name}
          </div>
          <div className="text-xs text-gray-500 space-y-0.5">
            {data.egrul.ids.inn  && <div>ИНН: {data.egrul.ids.inn}</div>}
            {data.egrul.ids.ogrn && <div>ОГРН: {data.egrul.ids.ogrn}</div>}
            <div>Статус: {data.egrul.result.parsed.isActive ? 'ДЕЙСТВУЮЩАЯ' : `ПРЕКРАЩЕНА — ${data.egrul.result.parsed.reason || ''}`}</div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className={`rounded-xl border p-5 ${violations.length > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
        {violations.length > 0 ? (
          <>
            <div className="text-xs font-semibold text-red-500 uppercase tracking-widest mb-1">Потенциальные штрафы</div>
            {fineStr && <div className="text-3xl font-bold text-red-600 mb-1">до {fineStr} ₽</div>}
            <div className="text-xs text-gray-500 mb-4">
              {violations.length} {violations.length === 1 ? 'нарушение требует' : 'нарушений требуют'} устранения
            </div>
          </>
        ) : (
          <div className="text-sm font-medium text-green-700 mb-4">✓ Критических нарушений не обнаружено</div>
        )}
        {violations.length > 0 && (
          <p className="text-xs text-gray-500 mb-3">
            В PDF-отчёте: конкретные нарушения по каждому пункту, рекомендации по устранению, приоритеты.
          </p>
        )}
        <div className="flex gap-2">
          <button onClick={() => onShare?.('pdf')} disabled={!uuid}
            className="flex-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-wait text-white rounded-lg py-2.5 px-3 transition-colors font-semibold">
            {uuid ? '📄 Скачать полный отчёт' : '⏳ Подготовка…'}
          </button>
          <button onClick={() => onShare?.('share')} disabled={!uuid}
            className="text-sm bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-wait text-gray-600 border border-gray-200 rounded-lg py-2.5 px-3 transition-colors">
            {uuid ? '🔗' : '⏳'}
          </button>
        </div>
      </div>

      <button onClick={onNewScan}
        className="w-full text-sm text-gray-400 hover:text-gray-600 border border-gray-200 hover:border-gray-300 rounded-xl py-2.5 transition-colors">
        ← Проверить другой сайт
      </button>
    </div>
  );
}
