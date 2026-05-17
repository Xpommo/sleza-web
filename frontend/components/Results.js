'use client';

const STATUS_COLOR = {
  ok:        'border-green-600 bg-green-950',
  risk:      'border-yellow-600 bg-yellow-950',
  violation: 'border-red-600 bg-red-950',
  unknown:   'border-gray-700 bg-gray-900',
};

const STATUS_LABEL = {
  ok: '✓ Соответствует',
  risk: '⚠ Риск',
  violation: '✗ Нарушение',
  unknown: '? Не определено',
};

function CheckCard({ check }) {
  const cls = STATUS_COLOR[check.status] || STATUS_COLOR.unknown;
  return (
    <div className={`rounded-lg border p-4 ${cls}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="text-sm font-semibold text-gray-100">{check.law}</div>
          <div className="text-xs text-gray-400">{check.law_code} · штраф {check.fine}</div>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap ${
          check.status === 'ok' ? 'bg-green-700 text-green-100' :
          check.status === 'risk' ? 'bg-yellow-700 text-yellow-100' :
          check.status === 'violation' ? 'bg-red-700 text-red-100' :
          'bg-gray-700 text-gray-300'
        }`}>
          {STATUS_LABEL[check.status] || check.status}
        </span>
      </div>
      {check.issue && <p className="text-xs text-gray-300 mb-1">{check.issue}</p>}
      {check.action && check.action !== '—' && (
        <p className="text-xs text-gray-500 italic">{check.action}</p>
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

export default function Results({ data }) {
  const hostname = data.hostname || data.url;
  const checks = data.aiData?.checks || [];

  return (
    <div className="mt-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-bold text-gray-100">{data.aiData?.site_name || hostname}</div>
          <div className="text-xs text-gray-500">{hostname} · {data.mode === 'full' ? 'Весь сайт' : 'Одна страница'}</div>
        </div>
        {data.stats && (
          <div className="text-xs text-gray-500 text-right">
            Просканировано: {data.stats.scanned} / {data.stats.total} стр.<br/>
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
            {data.egrul.ids.inn && <div>ИНН: {data.egrul.ids.inn}</div>}
            {data.egrul.ids.ogrn && <div>ОГРН: {data.egrul.ids.ogrn}</div>}
            <div>Статус: {data.egrul.result.parsed.isActive ? 'ДЕЙСТВУЮЩАЯ' : `ПРЕКРАЩЕНА — ${data.egrul.result.parsed.reason || ''}`}</div>
          </div>
        </div>
      )}

      {/* Sleza API error notice */}
      {data.slezaError && data.slezaError !== 'no_key' && (
        <div className="text-xs text-yellow-600 bg-yellow-950 border border-yellow-800 rounded p-3">
          ⚠ Sleza API: {data.slezaError}
        </div>
      )}
    </div>
  );
}
