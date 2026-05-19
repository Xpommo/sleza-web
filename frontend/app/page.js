'use client';

import { useState, useEffect, useRef } from 'react';
import ScanForm from '../components/ScanForm';
import Results from '../components/Results';
import ShareModal from '../components/ShareModal';

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function Home() {
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [progress,   setProgress]   = useState({ label: '', current: 0, total: 0 });
  const [uuid,       setUuid]       = useState(null);
  const [shareModal, setShareModal] = useState(null); // 'share' | 'pdf' | null
  const [showForm,   setShowForm]   = useState(true);
  const cancelRef = useRef(null);
  const formRef = useRef(null);

  const [keys, setKeys] = useState({ groqKey: '', slezaKey: '' });
  useEffect(() => {
    setKeys({
      groqKey:  localStorage.getItem('groqKey')  || '',
      slezaKey: localStorage.getItem('slezaKey') || '',
    });
  }, []);

  // On mount: load report from ?report=<uuid> if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reportId = params.get('report');
    if (!reportId) return;
    setShowForm(false);
    setLoading(true);
    fetch(`${BASE}/api/results/${reportId}`)
      .then(r => {
        if (!r.ok) throw new Error(
          r.status === 410 ? 'Срок хранения отчёта истёк (24 часа)' : 'Отчёт не найден'
        );
        return r.json();
      })
      .then(data => { setResult(data.result); setUuid(reportId); })
      .catch(e => { setError(e.message); setShowForm(true); })
      .finally(() => setLoading(false));
  }, []);

  const newScan = () => {
    setResult(null);
    setUuid(null);
    setError(null);
    setShowForm(true);
    window.history.replaceState(null, '', '/');
    setTimeout(() => formRef.current?.querySelector('input')?.focus(), 50);
  };

  const saveResult = async (data) => {
    try {
      const r = await fetch(`${BASE}/api/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: data }),
      });
      const { uuid: id } = await r.json();
      setUuid(id);
      window.history.replaceState(null, '', `?report=${id}`);
    } catch (_) {}
  };

  const saveKeys = (k) => {
    setKeys(k);
    localStorage.setItem('groqKey',  k.groqKey);
    localStorage.setItem('slezaKey', k.slezaKey);
  };

  const PHASE_LABELS = {
    sitemap: 'Ищу карту сайта…',
    crawl:   'Обхожу страницы…',
    render:  'Открываю главную страницу…',
    sleza:   'Проверяю по реестрам иноагентов…',
    policy:  'Ищу политику конфиденциальности…',
    ai:      'AI-анализ законов…',
  };

  const stopScan = () => {
    if (cancelRef.current) { cancelRef.current(); cancelRef.current = null; }
    setLoading(false);
    setProgress({ label: '', current: 0, total: 0 });
    setError('Сканирование остановлено.');
  };

  const scan = async (url, mode, siteType = 'auto') => {
    setLoading(true);
    setError(null);
    setResult(null);
    setUuid(null);
    setProgress({ label: 'Открываю страницу…', current: 0, total: 0 });
    cancelRef.current = null;
    window.history.replaceState(null, '', '/');

    const headers = {
      'Content-Type': 'application/json',
      'x-groq-key':  keys.groqKey,
      'x-sleza-key': keys.slezaKey,
    };
    const body = JSON.stringify({ url, useAI: !!keys.groqKey, siteType });

    try {
      if (mode === 'single') {
        const res = await fetch(`${BASE}/api/scan/single`, { method: 'POST', headers, body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
        setResult(data);
        saveResult(data);
      } else {
        const res = await fetch(`${BASE}/api/scan/full/stream`, { method: 'POST', headers, body });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Ошибка сервера');
        }

        const reader = res.body.getReader();
        cancelRef.current = () => reader.cancel();

        const decoder = new TextDecoder();
        let buffer = '';
        let finished = false;

        while (!finished) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';
          for (const part of parts) {
            if (!part.startsWith('data: ')) continue;
            const data = JSON.parse(part.slice(6));
            if (data.error) throw new Error(data.error);
            if (data.done) {
              setResult(data.result);
              saveResult(data.result);
              finished = true;
              break;
            }
            setProgress({
              label:   PHASE_LABELS[data.phase] || data.phase,
              current: data.current || 0,
              total:   data.total   || 0,
            });
          }
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError' && e.message !== 'Сканирование остановлено.') setError(e.message);
    } finally {
      cancelRef.current = null;
      setLoading(false);
      setProgress({ label: '', current: 0, total: 0 });
    }
  };

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <ShareModal
        open={!!shareModal}
        onClose={() => setShareModal(null)}
        uuid={uuid}
        mode={shareModal}
      />

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
              className="w-full bg-gray-800 text-gray-100 rounded px-3 py-2 text-sm font-mono border border-gray-700 focus:border-blue-500 outline-none"
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
      {showForm && (
        <div ref={formRef}>
          <ScanForm onScan={scan} loading={loading} />
        </div>
      )}

      {/* Progress block */}
      {loading && !result && (
        <div className="mt-6 bg-gray-900 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-blue-400 text-sm animate-pulse">
              ● {progress.label || 'Сканирование…'}
            </span>
            {progress.total > 0 && (
              <span className="text-xs text-gray-500">{progress.current} / {progress.total}</span>
            )}
          </div>
          {progress.total > 0 && (
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
          <button onClick={stopScan} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
            ✕ Остановить
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-6 bg-red-900/40 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <Results
          data={result}
          uuid={uuid}
          onShare={(mode) => setShareModal(mode)}
          onNewScan={newScan}
        />
      )}
    </main>
  );
}
