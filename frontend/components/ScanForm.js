'use client';

import { useState } from 'react';

export default function ScanForm({ onScan, loading }) {
  const [url, setUrl] = useState('');

  const normalise = (val) => {
    val = val.trim();
    if (val && !val.startsWith('http')) val = 'https://' + val;
    return val;
  };

  const submit = (mode) => {
    const u = normalise(url);
    if (!u) return;
    onScan(u, mode);
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
