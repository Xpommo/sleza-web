'use client';

const LAW_LINKS = {
  'law152': 'https://www.consultant.ru/document/cons_doc_LAW_61801/',
  'law149': 'https://www.consultant.ru/document/cons_doc_LAW_48524/',
  'erir':   'https://www.consultant.ru/document/cons_doc_LAW_126477/',
  'offer':  'https://www.consultant.ru/document/cons_doc_LAW_305/',
  'drugs':  'https://www.consultant.ru/document/cons_doc_LAW_10172/',
};

const STATUS_COLOR = {
  ok:        'border-green-600 bg-green-950',
  risk:      'border-yellow-600 bg-yellow-950',
  violation: 'border-red-600 bg-red-950',
  unknown:   'border-gray-700 bg-gray-900',
};

const STATUS_LABEL = {
  ok:        '✓ Соответствует',
  risk:      '⚠ Риск',
  violation: '✗ Нарушение',
  unknown:   '? Не определено',
};

function parseFine(str) {
  if (!str) return 0;
  const m = str.replace(/[\s ]/g, '').match(/(\d+)руб/);
  return m ? parseInt(m[1], 10) : 0;
}

function CheckCard({ check }) {
  const cls = STATUS_COLOR[check.status] || STATUS_COLOR.unknown;
  return (
    <div className={`rounded-lg border p-4 ${cls}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="text-sm font-semibold text-gray-100">{check.law}</div>
          <div className="text-xs text-gray-400">
            {LAW_LINKS[check.id]
              ? <a href={LAW_LINKS[check.id]} target="_blank" rel="noopener" className="hover:text-blue-400 transition-colors">{check.law_code}</a>
              : check.law_code
            }
            {' · штраф '}{check.fine}
          </div>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap ${
          check.status === 'ok'        ? 'bg-green-700 text-green-100' :
          check.status === 'risk'      ? 'bg-yellow-700 text-yellow-100' :
          check.status === 'violation' ? 'bg-red-700 text-red-100' :
          'bg-gray-700 text-gray-300'
        }`}>
          {STATUS_LABEL[check.status] || check.status}
        </span>
      </div>
      {check.issue && <p className="text-xs text-gray-300 mb-1">{check.issue}</p>}
      {check.action && check.action !== '—' && (
        <p className="text-xs text-gray-500 italic">→ {check.action}</p>
      )}
    </div>
  );
}

function SlezaSection({ pages }) {
  const allItems = pages.flatMap(p => p.items || []);
  if (allItems.length === 0) {
    return (
      <div className="rounded-lg border border-green-700 bg-green-950 p-4 text-sm text-green-300">
        ✓ Иноагентов, экстремистов и нежелательных организаций не обнаружено
      </div>
    );
  }
  const unmarked = allItems.filter(i => !i.hasMarking);
  return (
    <div className="rounded-lg border border-red-700 bg-red-950 p-4 space-y-2">
      <div className="text-sm font-semibold text-red-300">
        Реестр Слезы: {allItems.length} упоминаний
        {unmarked.length > 0 && `, из них ${unmarked.length} без маркировки`}
      </div>
      {allItems.slice(0, 10).map((item, i) => (
        <div key={i} className="text-xs text-gray-300 flex gap-2">
          <span className={item.hasMarking ? 'text-green-400' : 'text-red-400'}>
            {item.hasMarking ? '✓' : '✗'}
          </span>
          <span>{item.name} <span className="text-gray-500">({item.category})</span></span>
        </div>
      ))}
    </div>
  );
}

export default function Results({ data, uuid, onShare, onNewScan }) {
  const hostname = data.hostname || data.url;
  const checks   = data.aiData?.checks || [];

  const issues     = checks.filter(c => c.status === 'violation' || c.status === 'risk');
  const totalFine  = issues.reduce((sum, c) => sum + parseFine(c.fine), 0);
  const fineStr    = totalFine > 0 ? totalFine.toLocaleString('ru-RU') : null;

  const scannedAt = data.scannedAt ? new Date(data.scannedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <div className="mt-8 space-y-4" data-results>
      {/* Fallback warning */}
      {data.fallback && (
        <div className="bg-yellow-900/40 border border-yellow-700 rounded-lg px-4 py-3 text-yellow-300 text-sm">
          ⚠ Страница загружена без JS-рендеринга (сайт заблокировал автоматический браузер). Часть данных может отсутствовать — проверьте вручную или используйте Tampermonkey-расширение.
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-bold text-gray-100">{data.aiData?.site_name || hostname}</div>
          <div className="text-xs text-gray-500">
            {hostname} · {data.mode === 'full' ? 'Весь сайт' : 'Одна страница'}
            {scannedAt && <span> · Проверено {scannedAt}</span>}
          </div>
        </div>
        {data.stats && (
          <div className="text-xs text-gray-500 text-right">
            Просканировано: {data.stats.scanned} из {data.stats.total}
            {data.stats.discovered > data.stats.total && ` (найдено ${data.stats.discovered})`} стр.<br/>
            Упоминаний: {data.stats.found}
          </div>
        )}
      </div>

      {/* Sleza registry check */}
      <SlezaSection pages={data.pages || []} />

      {/* Law compliance cards */}
      {checks.length > 0 && (
        <div className="space-y-3">
          {checks.map(check => <CheckCard key={check.id} check={check} />)}
        </div>
      )}

      {/* EGRUL */}
      {data.egrul?.result?.parsed && (
        <div className={`rounded-lg border p-4 text-sm ${
          data.egrul.result.parsed.isActive ? 'border-green-700 bg-green-950' : 'border-red-700 bg-red-950'
        }`}>
          <div className="font-semibold mb-1">
            {data.egrul.result.parsed.isActive ? '✓' : '✗'} ЕГРЮЛ: {data.egrul.result.parsed.name}
          </div>
          <div className="text-xs text-gray-400 space-y-0.5">
            {data.egrul.ids.inn  && <div>ИНН: {data.egrul.ids.inn}</div>}
            {data.egrul.ids.ogrn && <div>ОГРН: {data.egrul.ids.ogrn}</div>}
            <div>Статус: {data.egrul.result.parsed.isActive
              ? 'ДЕЙСТВУЮЩАЯ'
              : `ПРЕКРАЩЕНА — ${data.egrul.result.parsed.reason || ''}`}
            </div>
          </div>
        </div>
      )}

      {/* Sleza API error notice */}
      {data.slezaError && data.slezaError !== 'no_key' && (
        <div className="text-xs text-yellow-600 bg-yellow-950 border border-yellow-800 rounded p-3">
          ⚠ Sleza API: {data.slezaError}
        </div>
      )}

      {/* CTA — fines summary + share/download */}
      <div className={`rounded-xl border p-5 ${
        issues.length > 0 ? 'border-red-700 bg-red-950/40' : 'border-gray-700 bg-gray-900'
      }`}>
        {issues.length > 0 ? (
          <>
            <div className="text-xs text-red-400 uppercase tracking-widest mb-1">Потенциальные штрафы</div>
            {fineStr && (
              <div className="text-3xl font-bold text-red-300 mb-1">до {fineStr} ₽</div>
            )}
            <div className="text-xs text-gray-500 mb-4">
              {issues.length} {issues.length === 1 ? 'нарушение требует' : 'нарушений требуют'} устранения
            </div>
          </>
        ) : (
          <div className="text-sm text-green-400 mb-4">✓ Нарушений не обнаружено</div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => onShare?.('share')}
            disabled={!uuid}
            className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-wait text-white rounded py-2 px-3 transition-colors"
          >
            {uuid ? '🔗 Поделиться' : '⏳ Подготовка…'}
          </button>
          <button
            onClick={() => onShare?.('pdf')}
            disabled={!uuid}
            className="flex-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-wait text-white rounded py-2 px-3 transition-colors"
          >
            {uuid ? '📄 Скачать PDF' : '⏳ Подготовка…'}
          </button>
        </div>
      </div>

      {/* New scan button */}
      <button
        onClick={onNewScan}
        className="w-full text-xs text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-600 rounded-lg py-2.5 transition-colors"
      >
        ← Проверить другой сайт
      </button>
    </div>
  );
}
