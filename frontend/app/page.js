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
  { icon: '🚨', code: 'Реестры', name: 'Иноагенты и экстремисты', desc: 'Упоминания без обязательной маркировки', fine: 'до 5 000 000 ₽' },
  { icon: '💊', code: 'ФЗ №3', name: 'Упоминание наркотиков', desc: 'Пропаганда или незаконный оборот запрещённых веществ', fine: 'до 1 500 000 ₽' },
];

const FAQ = [
  { q: 'Это бесплатно?', a: 'Да, базовая проверка бесплатна. Для AI-анализа потребуется GROQ API ключ (бесплатный тариф есть на groq.com).' },
  { q: 'Насколько точны результаты?', a: 'Мы используем детерминированные проверки по актуальным требованиям законодательства + AI-арбитр для спорных случаев. Точность ~85–90%. Инструмент не заменяет юридическую экспертизу.' },
  { q: 'Как часто нужно проверять сайт?', a: 'Рекомендуем раз в квартал и при каждом обновлении политики конфиденциальности или добавлении новых форм сбора данных.' },
  { q: 'Что делать если нашли нарушения?', a: 'Каждая карточка содержит конкретное действие по устранению нарушения. Вы можете скачать PDF-отчёт и передать разработчику или юристу.' },
  { q: 'Проверяет ли сервис весь сайт?', a: 'Да, режим «Весь сайт» сканирует до 150 страниц через sitemap или краулинг. Проверка занимает 2–5 минут.' },
];

function LandingSection({ onStartScan }) {
  const [openFaq, setOpenFaq] = useState(null);
  return (
    <>
      {/* Law cards */}
      <div className="mt-12 mb-10">
        <h2 className="text-center text-sm font-semibold text-gray-400 uppercase tracking-widest mb-6">Что мы проверяем</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LAWS.map(l => (
            <div key={l.code} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex gap-3">
              <span className="text-2xl leading-none mt-0.5">{l.icon}</span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-blue-400 font-semibold">{l.code}</span>
                  <span className="text-sm font-semibold text-gray-100">{l.name}</span>
                </div>
                <p className="text-xs text-gray-400 mb-1">{l.desc}</p>
                <p className="text-xs text-red-400/70">Штраф: {l.fine}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Who is it for */}
      <div className="mb-10 bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Для кого</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['👤', 'Владельцы сайтов', 'Проверьте свой сайт до проверки Роскомнадзора'],
            ['⚖️', 'Юристы', 'Быстрый аудит клиентских сайтов с PDF-отчётом'],
            ['📱', 'Маркетологи', 'Убедитесь что рекламные материалы промаркированы'],
            ['🏗️', 'Веб-студии', 'Сдавайте проекты с гарантией соответствия закону'],
          ].map(([icon, title, desc]) => (
            <div key={title} className="flex gap-2">
              <span className="text-lg leading-none">{icon}</span>
              <div>
                <div className="font-medium text-gray-200 text-sm">{title}</div>
                <div className="text-xs text-gray-500">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="mb-10">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Частые вопросы</h2>
        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              <button
                className="w-full text-left px-4 py-3 text-sm text-gray-200 font-medium flex justify-between items-center hover:bg-gray-800/50 transition-colors"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                {item.q}
                <span className="text-gray-500 ml-2">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && (
                <div className="px-4 pb-3 text-sm text-gray-400 border-t border-gray-800 pt-2">{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 pt-6 text-center text-xs text-gray-600">
        <p className="mb-1">СЛЕЗА // ПРОВЕРКА — инструмент для предварительного аудита. Не является юридической консультацией.</p>
        <p>По вопросам: <a href="mailto:kirillmash99@gmail.com" className="text-gray-500 hover:text-gray-300">kirillmash99@gmail.com</a></p>
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

  const [keys, setKeys] = useState({ groqKey: '', slezaKey: '' });
  useEffect(() => {
    setKeys({
      groqKey:  localStorage.getItem('groqKey')  || '',
      slezaKey: localStorage.getItem('slezaKey') || '',
    });
  }, []);

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
  const showLanding = showForm && !result && !loading;

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <ShareModal open={!!shareModal} onClose={() => setShareModal(null)} uuid={uuid} mode={shareModal} />

      {/* Header */}
      <div className={`text-center ${showLanding ? 'mb-8' : 'mb-6'}`}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-2xl">💧</span>
          <h1 className="text-2xl font-bold tracking-widest text-blue-400 uppercase">
            СЛЕЗА // ПРОВЕРКА
          </h1>
        </div>
        {showLanding ? (
          <>
            <p className="text-gray-300 text-base mb-1">Бесплатный аудит сайта на соответствие законам РФ</p>
            <p className="text-gray-500 text-sm">152-ФЗ · 149-ФЗ · ЕРИР · Иноагенты · Оферта · Наркотики</p>
          </>
        ) : (
          <p className="text-gray-500 text-sm">Аудит сайта на соответствие 152-ФЗ, 149-ФЗ, ЕРИР, реестрам иноагентов</p>
        )}
      </div>

      {/* API Keys */}
      <details className="mb-6 bg-gray-900 rounded-lg p-4">
        <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-200">⚙ API ключи {!keys.groqKey && <span className="text-yellow-500/70 ml-1">(AI-анализ отключён)</span>}</summary>
        <div className="mt-3 space-y-2">
          <div>
            <label className="text-xs text-gray-500 block mb-1">GROQ KEY — для AI-анализа <a href="https://console.groq.com" target="_blank" rel="noopener" className="text-blue-500 hover:text-blue-400">(получить бесплатно)</a></label>
            <input
              type="password"
              className="w-full bg-gray-800 text-gray-100 rounded px-3 py-1.5 text-sm font-mono border border-gray-700 focus:border-blue-500 outline-none"
              value={keys.groqKey}
              onChange={e => saveKeys({ ...keys, groqKey: e.target.value })}
              placeholder="gsk_..."
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">SLEZA KEY — для реестров иноагентов</label>
            <input
              type="password"
              className="w-full bg-gray-800 text-gray-100 rounded px-3 py-2 text-sm font-mono border border-gray-700 focus:border-blue-500 outline-none"
              value={keys.slezaKey}
              onChange={e => saveKeys({ ...keys, slezaKey: e.target.value })}
              placeholder="sleza_..."
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">Ключи хранятся только в вашем браузере.</p>
        </div>
      </details>

      {/* Scan form */}
      {showForm && (
        <div ref={formRef}>
          <ScanForm onScan={scan} loading={loading} />
        </div>
      )}

      {/* Progress */}
      {loading && !result && (
        <div className="mt-6 bg-gray-900 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-blue-400 text-sm animate-pulse">● {progress.label || 'Сканирование…'}</span>
            {progress.total > 0 && (
              <span className="text-xs text-gray-500">{progress.current} / {progress.total}</span>
            )}
          </div>
          {progress.total > 0 && (
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
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
        <Results data={result} uuid={uuid} onShare={(mode) => setShareModal(mode)} onNewScan={newScan} />
      )}

      {/* Landing content — shown only on initial state */}
      {showLanding && <LandingSection />}
    </main>
  );
}
