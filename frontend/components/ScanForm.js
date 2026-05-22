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
    <div className="space-y-4">
      <input
        type="text"
        className="w-full bg-neutral-900 border border-neutral-800 px-4 py-4 text-sm font-mono text-neutral-100 placeholder-neutral-600 focus:border-neutral-500 focus:outline-none transition-colors"
        placeholder="example.ru или https://example.ru"
        value={url}
        onChange={e => setUrl(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit('single')}
        disabled={loading}
      />

      <div className="space-y-2">
        <div className="text-xs text-neutral-600 uppercase tracking-[0.15em]">Тип сайта</div>
        <div className="flex flex-wrap gap-1.5">
          {SITE_TYPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSiteType(value)}
              disabled={loading}
              className={`px-3 py-1 text-xs font-medium transition-colors border ${
                siteType === value
                  ? 'bg-neutral-100 text-neutral-950 border-neutral-100'
                  : 'bg-transparent text-neutral-500 border-neutral-800 hover:border-neutral-600 hover:text-neutral-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => submit('single')}
          disabled={loading || !url}
          className="flex-1 bg-neutral-100 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-neutral-950 py-3 text-sm font-bold transition-colors uppercase tracking-wider"
        >
          Одна страница
        </button>
        <button
          onClick={() => submit('full')}
          disabled={loading || !url}
          className="flex-1 bg-transparent hover:bg-neutral-900 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-500 hover:text-neutral-200 border border-neutral-800 hover:border-neutral-600 py-3 text-sm font-medium transition-colors uppercase tracking-wider"
        >
          Весь сайт
        </button>
      </div>
    </div>
  );
}