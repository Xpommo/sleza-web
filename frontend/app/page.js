'use client';

import { useState, useEffect, useRef } from 'react';
import ScanForm from '../components/ScanForm';
import ScanProgress from '../components/ScanProgress';
import Results from '../components/Results';
import Landing from '../components/Landing';
import ShareModal from '../components/ShareModal';

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

function FlashlightIcon({ width = 24, height = 16, className = '' }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 16"
      fill="none"
      aria-hidden="true"
      className={`text-brand shrink-0 ${className}`}
    >
      <rect x="2" y="5" width="8" height="6" rx="1.4" fill="currentColor" />
      <rect x="10" y="4" width="3" height="8" rx="0.6" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <line className="beam beam-top"    x1="14" y1="7" x2="20.4" y2="3.4"  />
        <line className="beam beam-center" x1="14" y1="8" x2="22"   y2="8"    />
        <line className="beam beam-bottom" x1="14" y1="9" x2="20.4" y2="12.6" />
      </g>
    </svg>
  );
}

export default function Home() {
  const [result,        setResult]        = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [progress,      setProgress]      = useState({ phase: '', current: 0, total: 0 });
  const [uuid,          setUuid]          = useState(null);
  const [shareModal,    setShareModal]    = useState(null);
  const [showForm,      setShowForm]      = useState(true);
  const [capturedEmail, setCapturedEmail] = useState('');
  const cancelRef = useRef(null);
  const formRef = useRef(null);
  const resultsRef = useRef(null);

  // Open a shared report when ?report=<uuid> is present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reportId = params.get('report');
    if (!reportId) return;
    setShowForm(false);
    setLoading(true);
    fetch(`${BASE}/api/results/${reportId}`)
      .then(r => {
        if (!r.ok) throw new Error(r.status === 410 ? 'Срок хранения отчёта истёк (24 часа)' : 'Отчёт не найден');
        return r.json();
      })
      .then(data => { setResult(data.result); setUuid(reportId); })
      .catch(e => { setError(e.message); setShowForm(true); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (result) {
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [result]);

  const newScan = () => {
    setResult(null); setUuid(null); setError(null); setShowForm(true);
    window.history.replaceState(null, '', '/');
    setTimeout(() => formRef.current?.querySelector('input')?.focus(), 50);
  };

  const applyUuid = (id) => {
    if (!id) return;
    setUuid(id);
    window.history.replaceState(null, '', `?report=${id}`);
  };

  const stopScan = () => {
    if (cancelRef.current) { cancelRef.current(); cancelRef.current = null; }
    setLoading(false); setProgress({ phase: '', current: 0, total: 0 });
    setError('Сканирование остановлено.');
  };

  const scan = async (url, mode, siteType = 'auto') => {
    setLoading(true); setError(null); setResult(null); setUuid(null);
    setProgress({ phase: 'render', current: 0, total: 0 });
    cancelRef.current = null;
    window.history.replaceState(null, '', '/');

    const headers = { 'Content-Type': 'application/json' };
    const body = JSON.stringify({ url, useAI: true, siteType });

    try {
      if (mode === 'single') {
        const res = await fetch(`${BASE}/api/scan/single`, { method: 'POST', headers, body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
        setResult(data); applyUuid(data.uuid);
      } else {
        const res = await fetch(`${BASE}/api/scan/full/stream`, { method: 'POST', headers, body });
        if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || 'Ошибка сервера'); }
        const reader = res.body.getReader();
        cancelRef.current = () => reader.cancel();
        const decoder = new TextDecoder();
        let buffer = '', finished = false;
        while (!finished) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n'); buffer = parts.pop() ?? '';
          for (const part of parts) {
            if (!part.startsWith('data: ')) continue;
            const data = JSON.parse(part.slice(6));
            if (data.error) throw new Error(data.error);
            if (data.done) { setResult(data.result); applyUuid(data.result?.uuid); finished = true; break; }
            setProgress({ phase: data.phase || '', current: data.current || 0, total: data.total || 0 });
          }
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError' && e.message !== 'Сканирование остановлено.') setError(e.message);
    } finally {
      cancelRef.current = null; setLoading(false); setProgress({ phase: '', current: 0, total: 0 });
    }
  };

  const showLanding = showForm && !result && !loading;

  return (
    <>
      <ShareModal open={!!shareModal} onClose={() => setShareModal(null)} uuid={uuid} mode={shareModal} defaultEmail={capturedEmail} />

      {/* sticky top nav */}
      <nav className="sticky top-0 z-50 bg-warm/85 backdrop-blur-md border-b border-line">
        <div className="max-w-3xl mx-auto px-5 py-3.5 flex items-center gap-7">
          <a href="/" className="flex items-center gap-2.5">
            <FlashlightIcon width={26} height={17} />
            <span className="font-extrabold text-[19px] tracking-[-0.04em] leading-none">
              фонарик<span className="text-ink/35 font-medium ml-1.5">// сканер</span>
            </span>
          </a>
          <div className="ml-auto hidden sm:flex items-center gap-4 font-mono text-[11px] text-ink/60">
            <span className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-ok animate-pulseDot" />
              сервис активен
            </span>
            <span className="text-ink/30">бета · v 1.0</span>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-5 py-8 sm:py-10">

        {/* Doc header */}
        {showLanding && (
          <header className="mb-7 pb-7 border-b border-line">
            <div className="label-micro mb-5">бесплатно · без регистрации</div>
            <h1 className="text-[32px] sm:text-[48px] lg:text-[52px] font-extrabold tracking-[-0.045em] leading-[0.96] mb-5 text-balance break-words">
              Проверка сайта на <span className="text-brand">152-ФЗ, 149-ФЗ и ЕРИР</span> — узнайте про штраф раньше регулятора
            </h1>
            <p className="text-[15px] sm:text-[16px] text-ink/65 leading-relaxed max-w-[58ch]">
              Бесплатный аудит за 5 минут. Сверка с реестрами иноагентов, ЕГРЮЛ и государственными базами. PDF-отчёт со ссылками на статьи закона и понятными рекомендациями, что починить первым.
            </p>
          </header>
        )}

        {/* Scan form */}
        {showForm && (
          <div ref={formRef}>
            <ScanForm onScan={scan} loading={loading} />
          </div>
        )}

        {/* Progress */}
        {loading && !result && (
          <ScanProgress
            phase={progress.phase}
            current={progress.current}
            total={progress.total}
            onStop={stopScan}
          />
        )}

        {/* Error */}
        {error && (
          <div className="mt-5 border border-danger/30 bg-danger/[0.06] rounded-lg px-4 py-3 text-[13px] text-danger">
            ⚠ {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div ref={resultsRef}>
            <Results
              data={result}
              uuid={uuid}
              onShare={mode => setShareModal(mode)}
              onNewScan={newScan}
              onEmailCaptured={setCapturedEmail}
            />
          </div>
        )}

        {/* Landing */}
        {showLanding && <Landing />}
      </main>
    </>
  );
}
