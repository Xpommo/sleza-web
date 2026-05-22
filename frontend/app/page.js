'use client';

import { useState, useEffect, useRef } from 'react';
import ScanForm from '../components/ScanForm';
import Results from '../components/Results';
import ShareModal from '../components/ShareModal';

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

const LAWS = [
  { code: '152-ФЗ',   name: 'Персональные данные',      desc: 'Политика конфиденциальности, согласие на обработку, cookie-баннер', fine: '300 000 ₽' },
  { code: '149-ФЗ',   name: 'Информация о владельце',   desc: 'ИНН, ОГРН, юр. адрес, email, телефон на сайте',                    fine: '100 000 ₽' },
  { code: 'ЕРИР',     name: 'Маркировка рекламы',        desc: 'ERID-токен, пометка «реклама», данные рекламодателя',               fine: '500 000 ₽' },
  { code: 'ЗоЗПП',    name: 'Публичная оферта',          desc: 'Условия продажи, возврата товаров и услуг',                        fine: '500 000 ₽' },
  { code: 'Реестры',  name: 'Иноагенты и экстремисты',  desc: 'Упоминания без обязательной маркировки по реестрам sleza.media',    fine: '5 000 000 ₽' },
  { code: 'ФЗ №3',    name: 'Наркотики',                 desc: 'Пропаганда или незаконный оборот запрещённых веществ',             fine: '1 500 000 ₽' },
];

const FAQ = [
  { q: 'Это бесплатно?',                   a: 'Да, проверка полностью бесплатна. AI-анализ и проверка по реестрам иноагентов включены.' },
  { q: 'Насколько точны результаты?',      a: 'Мы используем детерминированные алгоритмы по актуальным требованиям законодательства + AI-арбитр для спорных случаев. Точность ~85–90%. Инструмент не заменяет юридическую консультацию.' },
  { q: 'Как часто нужно проверять сайт?',  a: 'Рекомендуем раз в квартал и при каждом обновлении политики конфиденциальности или добавлении форм сбора данных.' },
  { q: 'Что делать если нашли нарушения?', a: 'Каждая карточка содержит конкретное действие по устранению. Вы можете скачать PDF-отчёт и передать разработчику или юристу.' },
  { q: 'Проверяет ли сервис весь сайт?',   a: 'Да, режим «Весь сайт» сканирует до 150 страниц через sitemap или краулинг. Занимает 2–5 минут.' },
];

function LandingSection() {
  const [openFaq, setOpenFaq] = useState(null);
  return (
    <>
      {/* What we check */}
      <div className="mt-16 mb-14">
        <p className="text-xs font-semibold text-neutral-600 uppercase tracking-[0.2em] mb-6">Что проверяем</p>
        <div className="space-y-px">
          {LAWS.map(l => (
            <div
              key={l.code}
              className="flex items-start gap-4 bg-neutral-900 border border-neutral-800 p-4 hover:border-neutral-700 transition-colors group"
            >
              <span className="font-mono text-xs font-bold text-neutral-600 group-hover:text-neutral-400 w-16 flex-shrink-0 pt-0.5 transition-colors">
                {l.code}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-neutral-200">{l.name}</div>
                <div className="text-xs text-neutral-500 mt-0.5">{l.desc}</div>
              </div>
              <div className="text-xs font-mono text-red-500/70 flex-shrink-0 pt-0.5 text-right whitespace-nowrap">
                до {l.fine}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Who is it for */}
      <div className="mb-14">
        <p className="text-xs font-semibold text-neutral-600 uppercase tracking-[0.2em] mb-6">Для кого</p>
        <div className="grid grid-cols-2 gap-px bg-neutral-800">
          {[
            ['Владельцы сайтов', 'Проверьте до Роскомнадзора'],
            ['Юристы',           'Быстрый аудит с PDF-отчётом'],
            ['Маркетологи',      'Проверка маркировки рекламы'],
            ['Веб-студии',       'Сдавайте сайты с гарантией'],
          ].map(([title, desc]) => (
            <div key={title} className="bg-neutral-950 p-4">
              <div className="text-sm font-semibold text-neutral-200">{title}</div>
              <div className="text-xs text-neutral-500 mt-1">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="mb-14">
        <p className="text-xs font-semibold text-neutral-600 uppercase tracking-[0.2em] mb-6">Частые вопросы</p>
        <div className="divide-y divide-neutral-800 border-y border-neutral-800">
          {FAQ.map((item, i) => (
            <div key={i}>
              <button
                className="w-full text-left py-4 text-sm font-medium text-neutral-300 flex justify-between items-center hover:text-neutral-100 transition-colors"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                {item.q}
                <span className="text-neutral-600 ml-3 flex-shrink-0 font-mono text-base leading-none">
                  {openFaq === i ? '−' : '+'}
                </span>
              </button>
              {openFaq === i && (
                <div className="pb-4 text-sm text-neutral-500 leading-relaxed">{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Powered by */}
      <div className="mb-10 text-center">
        <p className="text-xs text-neutral-700">
          Реестры иноагентов и экстремистов —{' '}
          <a
            href="https://sleza.media"
            target="_blank"
            rel="noopener"
            className="text-neutral-500 hover:text-neutral-300 transition-colors underline underline-offset-2"
          >
            sleza.media
          </a>
        </p>
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-800 pt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-700">
        <span className="font-mono">💧 СЛЕЗА</span>
        <div className="flex gap-4">
          <a href="mailto:kirillmash99@gmail.com" className="hover:text-neutral-400 transition-colors">
            kirillmash99@gmail.com
          </a>
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
  const formRef   = useRef(null);

  useEffect(() => {
    const params   = new URLSearchParams(window.location.search);
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
      .catch(e  => { setError(e.message); setShowForm(true); })
      .finally(()  => setLoading(false));
  }, []);

  const newScan = () => {
    setResult(null); setUuid(null); setError(null); setShowForm(true);
    window.history.replaceState(null, '', '/');
    setTimeout(() => formRef.current?.querySelector('input')?.focus(), 50);
  };

  const saveResult = async (data) => {
    try {
      const r = await fetch(`${BASE}/api/results`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ result: data }),
      });
      const { uuid: id } = await r.json();
      setUuid(id);
      window.history.replaceState(null, '', `?report=${id}`);
    } catch (_) {}
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
    setLoading(true); setError(null); setResult(null); setUuid(null);
    setProgress({ label: 'Открываю страницу…', current: 0, total: 0 });
    cancelRef.current = null;
    window.history.replaceState(null, '', '/');

    const headers = { 'Content-Type': 'application/json' };
    const body    = JSON.stringify({ url, useAI: true, siteType });

    try {
      if (mode === 'single') {
        const res  = await fetch(`${BASE}/api/scan/single`, { method: 'POST', headers, body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
        setResult(data); saveResult(data);
      } else {
        const res = await fetch(`${BASE}/api/scan/full/stream`, { method: 'POST', headers, body });
        if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || 'Ошибка сервера'); }
        const reader  = res.body.getReader();
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

  const pct         = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  const showLanding = showForm && !result && !loading;

  return (
    <main className="max-w-2xl mx-auto px-4 pt-16 pb-20">
      <ShareModal open={!!shareModal} onClose={() => setShareModal(null)} uuid={uuid} mode={shareModal} />

      {/* Header */}
      <header className="mb-12">
        <div className="flex items-baseline gap-3 mb-5">
          <span className="text-4xl leading-none select-none">💧</span>
          <h1 className="text-2xl font-black text-neutral-100 leading-none tracking-tight uppercase">
            СЛЕЗА
            <span className="text-neutral-700 font-thin mx-2">//</span>
            ПРОВЕРКА
          </h1>
        </div>
        {showLanding ? (
          <p className="text-neutral-500 text-sm leading-relaxed">
            Бесплатная проверка сайта на соответствие 152-ФЗ, 149-ФЗ, ЕРИР
            и реестрам иноагентов — результат за 30 секунд.
          </p>
        ) : (
          <p className="text-xs text-neutral-600 uppercase tracking-[0.2em]">
            автоматический аудит сайтов
          </p>
        )}
      </header>

      {/* Scan form */}
      {showForm && <div ref={formRef}><ScanForm onScan={scan} loading={loading} /></div>}

      {/* Progress */}
      {loading && !result && (
        <div className="mt-6 border border-neutral-800 bg-neutral-900 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-400 flex items-center gap-2.5">
              <span className="inline-block w-1.5 h-1.5 bg-neutral-400 rounded-full animate-pulse" />
              {progress.label || 'Сканирование…'}
            </span>
            {progress.total > 0 && (
              <span className="text-xs font-mono text-neutral-600">
                {progress.current} / {progress.total}
              </span>
            )}
          </div>
          {progress.total > 0 && (
            <div className="h-px bg-neutral-800 overflow-hidden">
              <div
                className="h-full bg-neutral-400 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
          <button
            onClick={stopScan}
            className="text-xs text-neutral-600 hover:text-red-400 transition-colors uppercase tracking-wider"
          >
            × Остановить
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-6 border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <Results data={result} uuid={uuid} onShare={mode => setShareModal(mode)} onNewScan={newScan} />
      )}

      {/* Landing */}
      {showLanding && <LandingSection />}
    </main>
  );
}
