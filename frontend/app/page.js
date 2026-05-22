'use client';

import { useState, useEffect, useRef } from 'react';
import ScanForm from '../components/ScanForm';
import Results from '../components/Results';
import ShareModal from '../components/ShareModal';

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

const LAWS = [
  { icon: '🔒', code: '152-ФЗ', name: 'Персональные данные', desc: 'Политика конфиденциальности, согласие на обработку, cookie-баннер', fine: 'до 300 000 ₽' },
  { icon: '🏢', code: '149-ФЗ', name: 'Информация о владельце', desc: 'ИНН, ОГРН, юридический адрес, email, телефон на сайте', fine: 'до 100 000 ₽' },
  { icon: '📢', code: 'ЕРИР', name: 'Маркировка рекламы', desc: 'ERID-токен, пометка «реклама», данные рекламодателя', fine: 'до 500 000 ₽' },
  { icon: '⚖️', code: 'ЗоЗПП', name: 'Публичная оферта', desc: 'Условия продажи, возврата товаров и услуг', fine: 'до 500 000 ₽' },
  { icon: '💧', code: 'Реестры', name: 'Иноагенты и экстремисты', desc: 'Упоминания без обязательной маркировки по реестрам sleza.media', fine: 'до 5 000 000 ₽' },
  { icon: '💊', code: 'ФЗ №3', name: 'Упоминание наркотиков', desc: 'Пропаганда или незаконный оборот запрещённых веществ', fine: 'до 1 500 000 ₽' },
];

const FAQ = [
  { q: 'Это бесплатно?', a: 'Да, проверка полностью бесплатна. AI-анализ и проверка по реестрам иноагентов включены.' },
  { q: 'Насколько точны результаты?', a: 'Мы используем детерминированные алгоритмы по актуальным требованиям законодательства + AI-арбитр для спорных случаев. Точность ~85–90%. Инструмент не заменяет юридическую консультацию.' },
  { q: 'Как часто нужно проверять сайт?', a: 'Рекомендуем раз в квартал и при каждом обновлении политики конфиденциальности или добавлении форм сбора данных.' },
  { q: 'Что делать если нашли нарушения?', a: 'Каждая карточка содержит конкретное действие по устранению. Вы можете скачать PDF-отчёт и передать разработчику или юристу.' },
  { q: 'Проверяет ли сервис весь сайт?', a: 'Да, режим «Весь сайт» сканирует до 150 страниц через sitemap или краулинг. Занимает 2–5 минут.' },
];

function LandingSection() {
  const [openFaq, setOpenFaq] = useState(null);
  return (
    <>
      {/* Law cards */}
      <div className="mt-14 mb-12">
        <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-8">Что проверяем</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LAWS.map(l => (
            <div key={l.code} className="border border-gray-200 rounded-xl p-4 flex gap-3 hover:border-gray-300 transition-colors">
              <span className="text-xl leading-none mt-0.5 flex-shrink-0">{l.icon}</span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-blue-600">{l.code}</span>
                  <span className="text-sm font-semibold text-gray-800">{l.name}</span>
                </div>
                <p className="text-xs text-gray-500 mb-1.5">{l.desc}</p>
                <p className="text-xs text-red-500">Штраф: {l.fine}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Who is it for */}
      <div className="mb-12 border border-gray-200 rounded-xl p-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">Для кого</p>
        <div className="grid grid-cols-2 gap-4">
          {[
            ['👤', 'Владельцы сайтов', 'Проверьте сайт до проверки Роскомнадзора'],
            ['⚖️', 'Юристы', 'Быстрый аудит клиентских сайтов с PDF-отчётом'],
            ['📱', 'Маркетологи', 'Убедитесь что рекламные материалы промаркированы'],
            ['🏗️', 'Веб-студии', 'Сдавайте проекты с гарантией соответствия закону'],
          ].map(([icon, title, desc]) => (
            <div key={title} className="flex gap-3">
              <span className="text-lg leading-none flex-shrink-0">{icon}</span>
              <div>
                <div className="text-sm font-semibold text-gray-800">{title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="mb-12">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">Частые вопросы</p>
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
          {FAQ.map((item, i) => (
            <div key={i}>
              <button
                className="w-full text-left px-5 py-4 text-sm font-medium text-gray-800 flex justify-between items-center hover:bg-gray-50 transition-colors"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                {item.q}
                <span className="text-gray-400 ml-3 flex-shrink-0 text-lg leading-none">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm text-gray-500">{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Powered by */}
      <div className="mb-10 text-center">
        <p className="text-xs text-gray-400">
          Реестры иноагентов и экстремистов предоставлены{' '}
          <a href="https://sleza.media" target="_blank" rel="noopener" className="text-blue-500 hover:underline">sleza.media</a>
        </p>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 pt-6 flex items-center justify-between text-xs text-gray-400">
        <span>💧 СЛЕЗА // ПРОВЕРКА</span>
        <div className="flex gap-4">
          <a href="mailto:kirillmash99@gmail.com" className="hover:text-gray-600 transition-colors">kirillmash99@gmail.com</a>
          <span>Не является юридической консультацией</span>
        </div>
      </div>
    </>
  );
}

export default function Home() {
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [progress,   setProgress]   = useState({ label: '', current: 0, total: 0 });
  const [uuid,       setUuid]       = useState(null);
  const [shareModal, setShareModal] = useState(null);
  const [showForm,   setShowForm]   = useState(true);
  const cancelRef = useRef(null);
  const formRef = useRef(null);


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

  const newScan = () => {
    setResult(null); setUuid(null); setError(null); setShowForm(true);
    window.history.replaceState(null, '', '/');
    setTimeout(() => formRef.current?.querySelector('input')?.focus(), 50);
  };

  const saveResult = async (data) => {
    try {
      const r = await fetch(`${BASE}/api/results`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: data }),
      });
      const { uuid: id } = await r.json();
      setUuid(id);
      window.history.replaceState(null, '', `?report=${id}`);
    } catch (_) {}
  };

  const PHASE_LABELS = {
    sitemap: 'Ищу карту сайта…', crawl: 'Обхожу страницы…',
    render: 'Открываю главную страницу…', sleza: 'Проверяю по реестрам иноагентов…',
    policy: 'Ищу политику конфиденциальности…', ai: 'AI-анализ законов…',
  };

  const stopScan = () => {
    if (cancelRef.current) { cancelRef.current(); cancelRef.current = null; }
    setLoading(false); setProgress({ label: '', current: 0, total: 0 });
    setError('Сканирование остановлено.');
  };

  const scan = async (url, mode, siteType = 'auto') => {
    setLoading(true); setError(null); setResult(null); setUuid(null);
    setProgress({ label: 'Открываю страницу…', current: 0, total: 0 });
    cancelRef.current = null;
    window.history.replaceState(null, '', '/');

    const headers = { 'Content-Type': 'application/json' };
    const body = JSON.stringify({ url, useAI: true, siteType });

    try {
      if (mode === 'single') {
        const res = await fetch(`${BASE}/api/scan/single`, { method: 'POST', headers, body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
        setResult(data); saveResult(data);
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
            if (data.done) { setResult(data.result); saveResult(data.result); finished = true; break; }
            setProgress({ label: PHASE_LABELS[data.phase] || data.phase, current: data.current || 0, total: data.total || 0 });
          }
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError' && e.message !== 'Сканирование остановлено.') setError(e.message);
    } finally {
      cancelRef.current = null; setLoading(false); setProgress({ label: '', current: 0, total: 0 });
    }
  };

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  const showLanding = showForm && !result && !loading;

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <ShareModal open={!!shareModal} onClose={() => setShareModal(null)} uuid={uuid} mode={shareModal} />

      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-3xl">💧</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">СЛЕЗА // ПРОВЕРКА</h1>
            <p className="text-xs text-gray-400">сервис автоматического аудита сайтов</p>
          </div>
        </div>
        {showLanding && (
          <p className="text-gray-600 text-base leading-relaxed">
            Бесплатная проверка вашего сайта на соответствие 152-ФЗ, 149-ФЗ, ЕРИР
            и реестрам иноагентов. Результат — за 30 секунд.
          </p>
        )}
      </header>

      {/* Scan form */}
      {showForm && <div ref={formRef}><ScanForm onScan={scan} loading={loading} /></div>}

      {/* Progress */}
      {loading && !result && (
        <div className="mt-5 border border-gray-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-600 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              {progress.label || 'Сканирование…'}
            </span>
            {progress.total > 0 && <span className="text-xs text-gray-400">{progress.current} / {progress.total}</span>}
          </div>
          {progress.total > 0 && (
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
          )}
          <button onClick={stopScan} className="text-xs text-gray-400 hover:text-red-500 transition-colors">✕ Остановить</button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-5 border border-red-200 bg-red-50 rounded-xl p-4 text-sm text-red-700">⚠ {error}</div>
      )}

      {/* Results */}
      {result && <Results data={result} uuid={uuid} onShare={mode => setShareModal(mode)} onNewScan={newScan} />}

      {/* Landing */}
      {showLanding && <LandingSection />}
    </main>
  );
}
