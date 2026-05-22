'use client';

import { useState, useEffect } from 'react';

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

const STATUS_LABEL = { ok: '✓ Соответствует', risk: '⚠ Риск', violation: '✗ Нарушение' };
const STATUS_COLOR = { ok: '#166534', risk: '#92400e', violation: '#991b1b' };
const STATUS_BG    = { ok: '#f0fdf4', risk: '#fffbeb', violation: '#fef2f2' };
const STATUS_BORDER = { ok: '#bbf7d0', risk: '#fde68a', violation: '#fecaca' };

function CheckRow({ check }) {
  const color  = STATUS_COLOR[check.status]  || '#374151';
  const bg     = STATUS_BG[check.status]     || '#f9fafb';
  const border = STATUS_BORDER[check.status] || '#e5e7eb';
  const isOk   = check.status === 'ok';
  return (
    <div style={{ border: `1px solid ${border}`, background: bg, borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isOk ? 0 : 8 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{check.law}</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{check.law_code} · штраф {check.fine}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color, background: 'white', border: `1px solid ${border}`, borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap', marginLeft: 12 }}>
          {STATUS_LABEL[check.status] || check.status}
        </span>
      </div>
      {!isOk && check.issue && (
        <div style={{ fontSize: 12, color: '#374151', marginBottom: 6 }}>{check.issue}</div>
      )}
      {!isOk && check.action && check.action !== '—' && (
        <div style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>→ {check.action}</div>
      )}
    </div>
  );
}

function parseFine(str) {
  if (!str) return 0;
  const m = str.replace(/[\s ]/g, '').match(/(\d+)руб/);
  return m ? parseInt(m[1], 10) : 0;
}

export default function PrintPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uuid = params.get('report');
    if (!uuid) { setError('UUID отчёта не указан'); return; }
    fetch(`${BASE}/api/results/${uuid}`)
      .then(r => {
        if (!r.ok) throw new Error(r.status === 410 ? 'Отчёт истёк (24 часа)' : 'Не найден');
        return r.json();
      })
      .then(d => setData(d.result))
      .catch(e => setError(e.message));
  }, []);

  if (error) return (
    <div style={{ fontFamily: 'sans-serif', padding: 40, color: '#991b1b' }}>⚠ {error}</div>
  );
  if (!data) return (
    <div style={{ fontFamily: 'sans-serif', padding: 40, color: '#6b7280' }}>Загрузка отчёта…</div>
  );

  const hostname = data.hostname || data.url;
  const checks   = data.aiData?.checks || [];
  const violations = checks.filter(c => c.status === 'violation');
  const risks      = checks.filter(c => c.status === 'risk');
  const totalFine  = violations.reduce((s, c) => s + parseFine(c.fine), 0);
  const scannedAt  = data.scannedAt
    ? new Date(data.scannedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const allSlezaItems = (data.pages || []).flatMap(p => p.items || []);
  const conf = data.confidence;
  const diff = data.diff;
  const prevDate = diff?.scannedAt
    ? new Date(diff.scannedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'long' })
    : null;

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', maxWidth: 720, margin: '0 auto', padding: '40px 32px', color: '#111827', fontSize: 14 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, paddingBottom: 24, borderBottom: '2px solid #e5e7eb' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
            💧 СЛЕЗА // ПРОВЕРКА
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>Аудит соответствия законодательству РФ</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11, color: '#9ca3af' }}>
          <div>{scannedAt}</div>
          <div style={{ marginTop: 2 }}>{hostname}</div>
          <div style={{ marginTop: 2 }}>{data.mode === 'full' ? 'Полный скан сайта' : 'Скан одной страницы'}</div>
        </div>
      </div>

      {/* Site name */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{data.aiData?.site_name || hostname}</div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>{hostname}</div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ border: '1px solid #fecaca', background: '#fef2f2', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#dc2626' }}>{violations.length}</div>
          <div style={{ fontSize: 11, color: '#991b1b' }}>нарушений</div>
        </div>
        <div style={{ border: '1px solid #fde68a', background: '#fffbeb', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#d97706' }}>{risks.length}</div>
          <div style={{ fontSize: 11, color: '#92400e' }}>рисков</div>
        </div>
        <div style={{ border: '1px solid #e5e7eb', background: '#f9fafb', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>
            {totalFine > 0 ? `до ${totalFine.toLocaleString('ru-RU')} ₽` : '—'}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>потенц. штрафы</div>
        </div>
      </div>

      {/* Confidence + Diff summary */}
      {(conf || (diff && (diff.resolved.length > 0 || diff.newViolations.length > 0))) && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {conf && (
            <div style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 600,
              background: conf.label === 'high' ? '#dcfce7' : conf.label === 'medium' ? '#fef9c3' : '#fee2e2',
              color: conf.label === 'high' ? '#166534' : conf.label === 'medium' ? '#713f12' : '#991b1b',
            }}>
              Достоверность: {conf.label === 'high' ? 'высокая' : conf.label === 'medium' ? 'средняя' : 'низкая'} ({conf.score}/100)
            </div>
          )}
          {diff && (diff.resolved.length > 0 || diff.newViolations.length > 0) && (
            <div style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: '#eff6ff', color: '#1d4ed8', fontWeight: 500 }}>
              С прошлой проверки{prevDate ? ` (${prevDate})` : ''}:
              {diff.resolved.length > 0 && ` ✅ исправлено ${diff.resolved.length}`}
              {diff.newViolations.length > 0 && ` ❌ появилось ${diff.newViolations.length}`}
            </div>
          )}
        </div>
      )}

      {/* Sleza registry */}
      {allSlezaItems.length > 0 ? (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Реестры иноагентов и экстремистов</div>
          <div style={{ border: '1px solid #fecaca', background: '#fef2f2', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: 8, fontSize: 13 }}>
              💧 Найдено: {allSlezaItems.length} упоминаний, без маркировки: {allSlezaItems.filter(i => !i.hasMarking).length}
            </div>
            {allSlezaItems.slice(0, 20).map((item, i) => (
              <div key={i} style={{ fontSize: 11, color: '#374151', marginBottom: 3, display: 'flex', gap: 6 }}>
                <span style={{ color: item.hasMarking ? '#16a34a' : '#dc2626' }}>{item.hasMarking ? '✓' : '✗'}</span>
                <span>{item.name} <span style={{ color: '#9ca3af' }}>({item.category})</span></span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 24, border: '1px solid #bbf7d0', background: '#f0fdf4', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#166534' }}>
          💧 Иноагентов, экстремистов и нежелательных организаций не обнаружено
        </div>
      )}

      {/* Law checks */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Проверки по законодательству</div>
        {checks.map(check => <CheckRow key={check.id} check={check} />)}
      </div>

      {/* EGRUL */}
      {data.egrul?.result?.parsed && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ЕГРЮЛ</div>
          <div style={{
            border: `1px solid ${data.egrul.result.parsed.isActive ? '#bbf7d0' : '#fecaca'}`,
            background: data.egrul.result.parsed.isActive ? '#f0fdf4' : '#fef2f2',
            borderRadius: 10, padding: '14px 16px', fontSize: 12
          }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: data.egrul.result.parsed.isActive ? '#166534' : '#991b1b' }}>
              {data.egrul.result.parsed.isActive ? '✓' : '✗'} {data.egrul.result.parsed.name}
            </div>
            <div style={{ color: '#6b7280' }}>
              {data.egrul.ids.inn && <span>ИНН: {data.egrul.ids.inn} · </span>}
              {data.egrul.ids.ogrn && <span>ОГРН: {data.egrul.ids.ogrn} · </span>}
              <span>Статус: {data.egrul.result.parsed.isActive ? 'ДЕЙСТВУЮЩАЯ' : 'ПРЕКРАЩЕНА'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Scan stats */}
      {data.stats && (
        <div style={{ marginBottom: 24, fontSize: 11, color: '#9ca3af', padding: '10px 0', borderTop: '1px solid #f3f4f6' }}>
          Просканировано страниц: {data.stats.scanned} из {data.stats.total}
          {data.stats.discovered > data.stats.total && ` (найдено ${data.stats.discovered})`}
          {' · '}Упоминаний иноагентов: {data.stats.found}
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 20, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9ca3af' }}>
        <span>💧 СЛЕЗА // ПРОВЕРКА — sleza-web.vercel.app</span>
        <span>Данные реестров: sleza.media · Не является юридической консультацией</span>
      </div>
    </div>
  );
}
