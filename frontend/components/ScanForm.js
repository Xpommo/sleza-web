'use client';

import { useState } from 'react';

const SITE_TYPES = [
  { value: 'auto',      label: 'Авто' },
  { value: 'ip',        label: 'ИП' },
  { value: 'ecommerce', label: 'Магазин' },
  { value: 'media',     label: 'СМИ / Блог' },
  { value: 'services',  label: 'Услуги / B2B' },
  { value: 'saas',      label: 'SaaS' },
];

export default function ScanForm({ onScan, loading }) {
  const [url, setUrl] = useState('');
  const [siteType, setSiteType] = useState('auto');

  const normalise = (val) => {
    val = val.trim();
    if (val && !val.startsWith('http')) val = 'https://' + val;
    return val;
  };

  const submit = (mode) => {
    const u = normalise(url);
    if (!u) return;
    onScan(u, mode, siteType);
  };

  return (
    <div className="bg-paper border border-line-2 rounded-[10px] p-7">
      {/* header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="label-micro">сканировать сайт</span>
        <div className="flex-1 h-px bg-gradient-to-r from-line-2 to-transparent" />
      </div>

      {/* URL input */}
      <div className={`flex items-center gap-2.5 bg-white border-[1.5px] rounded-lg px-4 py-4 transition-colors ${
        loading ? 'border-line-2' : 'border-line-2 focus-within:border-brand focus-within:shadow-[0_0_0_4px_rgba(31,31,230,0.08)]'
      }`}>
        <span className="font-mono text-[15px] text-ink/40 font-medium shrink-0">https://</span>
        <input
          type="text"
          className="flex-1 min-w-0 border-0 outline-0 bg-transparent font-mono text-[16px] text-ink font-medium placeholder:text-ink/20"
          placeholder="example.ru"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && url && submit('single')}
          disabled={loading}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {/* site type chips */}
      <div className="mt-4">
        <div className="label-micro mb-2">тип сайта</div>
        <div className="flex flex-wrap gap-1.5">
          {SITE_TYPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSiteType(value)}
              disabled={loading}
              className={`px-3 py-1.5 rounded-[5px] text-[12px] font-medium font-mono uppercase tracking-wider transition-colors border ${
                siteType === value
                  ? 'bg-ink text-white border-ink'
                  : 'bg-white text-ink/60 border-line-2 hover:border-ink/30 hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* CTA buttons */}
      <div className="flex gap-2 mt-5">
        <button
          onClick={() => submit('single')}
          disabled={loading || !url}
          className="flex-1 bg-ink hover:bg-brand disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg py-4 text-[14px] font-bold transition-colors inline-flex items-center justify-center gap-2 group"
        >
          <span>Текущая страница</span>
          <span className="font-mono text-[11px] opacity-60">~30 сек</span>
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </button>
        <button
          onClick={() => submit('full')}
          disabled={loading || !url}
          className="flex-1 bg-white hover:bg-warm disabled:opacity-40 disabled:cursor-not-allowed text-ink border border-ink rounded-lg py-4 text-[14px] font-bold transition-colors inline-flex items-center justify-center gap-2"
        >
          <span>Весь сайт</span>
          <span className="font-mono text-[11px] opacity-60">2–5 мин</span>
        </button>
      </div>

      {/* trust meta */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-4 font-mono text-[11px] text-ink/40">
        <span className="inline-flex items-center gap-1.5"><span className="text-ok">✓</span> бесплатно</span>
        <span className="inline-flex items-center gap-1.5"><span className="text-ok">✓</span> 30 секунд</span>
        <span className="inline-flex items-center gap-1.5"><span className="text-ok">✓</span> 12 параметров</span>
        <span className="inline-flex items-center gap-1.5"><span className="text-ok">✓</span> без регистрации</span>
        <span className="inline-flex items-center gap-1.5"><span className="text-ok">✓</span> PDF в почту</span>
      </div>
    </div>
  );
}
