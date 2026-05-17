'use client';

import { useState, useEffect } from 'react';
import ScanForm from '../components/ScanForm';
import Results from '../components/Results';

export default function Home() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');

  // Keys stored in localStorage — never sent to or stored on server except per-request header
  const [keys, setKeys] = useState({ groqKey: '', slezaKey: '' });
  useEffect(() => {
    setKeys({
      groqKey:  localStorage.getItem('groqKey')  || '',
      slezaKey: localStorage.getItem('slezaKey') || '',
    });
  }, []);

  const saveKeys = (k) => {
    setKeys(k);
    localStorage.setItem('groqKey',  k.groqKey);
    localStorage.setItem('slezaKey', k.slezaKey);
  };

  const PHASE_LABELS = {
    sitemap: 'Ищу карту сайта…',
    crawl:   'Обхожу страницы…',
    render:  'Открываю главную страницу…',
    sleza:   'Проверяю по реестрам…',
    ai:      'AI-анализ законов…',
  };

  const scan = async (url, mode) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress('Открываю страницу…');
    const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    const headers = {
      'Content-Type': 'application/json',
      'x-groq-key':  keys.groqKey,
      'x-sleza-key': keys.slezaKey,
    };
    const body = JSON.stringify({ url, useAI: !!keys.groqKey });

    try {
      if (mode === 'single') {
        // Single page — plain fetch, fast enough
        const res = await fetch(`${base}/api/scan/single`, { method: 'POST', headers, body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
        setResult(data);
      } else {
        // Full site — SSE stream for real-time progress
        const res = await fetch(`${base}/api/scan/full/stream`, { method: 'POST', headers, body });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Ошибка сервера');
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';
          for (const part of parts) {
            if (!part.startsWith('data: ')) continue;
            const data = JSON.parse(part.slice(6));
            if (data.error) throw new Error(data.error);
            if (data.done) { setResult(data.result); break; }
            // Update progress label
            const label = PHASE_LABELS[data.phase] || data.phase;
            const pageInfo = data.total ? ` (${data.current}/${data.total})` : '';
            setProgress(label + pageInfo);
          }
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-widest text-blue-400 uppercase mb-1">
          СЛЕЗА // ПРОВЕРКА
        </h1>
        <p className="text-gray-500 text-sm">
          Аудит сайта на соответствие 152-ФЗ, 149-ФЗ, ЕРИР, реестрам иноагентов
        </p>
      </div>

      {/* API Keys */}
      <details className="mb-6 bg-gray-900 rounded-lg p-4">
        <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-200">⚙ API ключи</summary>
        <div className="mt-3 space-y-2">
          <div>
            <label className="text-xs text-gray-500 block mb-1">GROQ KEY (для AI-анализа)</label>
            <input
              type="password"
              className="w-full bg-gray-800 text-gray-100 rounded px-3 py-1.5 text-sm font-mono border border-gray-700 focus:border-blue-500 outline-none"
              value={keys.groqKey}
              onChange={e => saveKeys({ ...keys, groqKey: e.target.value })}
              placeholder="gsk_..."
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">SLEZA KEY (для реестров иноагентов)</label>
            <input
              type="password"
              className="w-full bg-gray-800 text-gray-100 rounded px-3 py-1.5 text-sm font-mono border border-gray-700 focus:border-blue-500 outline-none"
              value={keys.slezaKey}
              onChange={e => saveKeys({ ...keys, slezaKey: e.target.value })}
              placeholder="sleza_..."
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Ключи хранятся только в вашем браузере и передаются только при запросе проверки.
          </p>
        </div>
      </details>

      {/* Scan form */}
      <ScanForm onScan={scan} loading={loading} />

      {/* Progress */}
      {loading && (
        <div className="mt-6 text-center text-blue-400 text-sm animate-pulse">
          ● {progress || 'Сканирование…'}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-6 bg-red-900/40 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* Results */}
      {result && <Results data={result} />}
    </main>
  );
}
