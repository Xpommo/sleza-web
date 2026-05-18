'use client';

import { useState } from 'react';

const SITE_TYPES = [
  { value: 'auto',      label: 'Авто' },
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
    <div className="bg-gray-900 rounded-xl p-5 space-y-4">
      <input
        type="text"
        className="w-full bg-gray-800 text-gray-100 rounded-lg px-4 py-3 text-sm font-mono border border-gray-700 focus:border-blue-500 outline-none"
        placeholder="example.ru или https://example.ru"
        value={url}
        onChange={e => setUrl(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit('single')}
        disabled={loading}
      />

      <div className="space-y-1.5">
        <div className="text-xs text-gray-500">Тип сайта</div>
        <div className="flex flex-wrap gap-1.5">
          {SITE_TYPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSiteType(value)}
              disabled={loading}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                siteType === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => submit('single')}
          disabled={loading || !url}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
        >
          Текущая страница (~30 сек)
        </button>
        <button
          onClick={() => submit('full')}
          disabled={loading || !url}
          className="flex-1 bg-blue-800 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
        >
          Весь сайт (~2–5 мин)
        </button>
      </div>
    </div>
  );
}
