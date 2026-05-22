'use client';

import { useEffect, useRef, useState } from 'react';

// Maps backend phase keys to terminal-log style line entries.
const PHASE_TO_LOG = {
  sitemap:  { tag: 'sitemap', cls: 'info', text: 'поиск sitemap.xml…' },
  crawl:    { tag: 'crawl',   cls: 'info', text: 'обход страниц' },
  render:   { tag: 'render',  cls: 'info', text: 'открываем главную в headless Chromium' },
  sleza:    { tag: 'sleza',   cls: 'warn', text: 'проверка по реестрам иноагентов (sleza.media)' },
  policy:   { tag: 'policy',  cls: 'info', text: 'парсим политику конфиденциальности' },
  ai:       { tag: 'ai',      cls: 'info', text: 'AI-арбитр по статьям закона (Groq llama-3.3-70b)' },
};

function nowStamp() {
  const d = new Date();
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const cs = String(Math.floor(d.getMilliseconds() / 10)).padStart(2, '0');
  return `[${m}.${s}.${cs}]`;
}

/**
 * Live scan log + progress.
 * Props:
 *   - phase: string (current backend phase key)
 *   - current, total: numbers (only used for crawl phase to render N/M)
 *   - onStop: () => void
 */
export default function ScanProgress({ phase, current = 0, total = 0, onStop }) {
  const logRef = useRef(null);
  const seenRef = useRef(new Set());
  const [lines, setLines] = useState([]);

  // When phase changes, append a log line. Dedupe non-crawl phases so we don't spam.
  useEffect(() => {
    if (!phase) return;
    const meta = PHASE_TO_LOG[phase] || { tag: phase, cls: 'info', text: phase };
    if (phase !== 'crawl' && seenRef.current.has(phase)) return;
    seenRef.current.add(phase);
    const tagged = `[${meta.tag}] ${meta.text}${phase === 'crawl' && total ? ` ${current}/${total}` : ''}`;
    setLines(prev => [...prev, { t: nowStamp(), tagged, cls: meta.cls }]);
  }, [phase, current, total]);

  // Keep log scrolled to bottom on update.
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [lines]);

  const pct = total > 0 ? Math.round((current / total) * 100) : null;

  return (
    <div className="mt-5 bg-paper border border-line-2 rounded-[10px] p-6">
      {/* status row */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="inline-flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
          <span className="label-micro text-ink/60">сканирование</span>
        </span>
        {pct !== null && (
          <span className="font-mono text-[11px] text-ink/40">{current} / {total} · {pct}%</span>
        )}
        <button
          onClick={onStop}
          className="ml-auto font-mono text-[11px] uppercase tracking-wider text-ink/40 hover:text-danger transition-colors"
        >
          ✕ остановить
        </button>
      </div>

      {/* progress bar */}
      {pct !== null && (
        <div className="h-[3px] bg-line rounded-full overflow-hidden mb-4">
          <div className="h-full bg-brand rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      )}

      {/* dark log */}
      <div
        ref={logRef}
        className="bg-ink text-white rounded-lg px-4 py-3 font-mono text-[12px] leading-[1.8] max-h-[200px] overflow-hidden"
      >
        {lines.length === 0 && (
          <div className="text-white/40">[init] подключение…</div>
        )}
        {lines.map((l, i) => (
          <div key={i} className="animate-fadeUp">
            <span className="text-white/30 mr-2.5">{l.t}</span>
            <span className={
              l.cls === 'bad'  ? 'text-[#ff8c66]' :
              l.cls === 'warn' ? 'text-[#f5c87a]' :
              l.cls === 'ok'   ? 'text-[#5cdb95]' :
                                 'text-[#8a8aff]'
            }>{l.tagged}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
