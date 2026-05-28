'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

function useCountUp(target, duration = 1400) {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const runRef = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting || runRef.current) return;
        runRef.current = true;
        const start = performance.now();
        function step(t) {
          const p = Math.min(1, (t - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setN(Math.round(target * eased));
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        io.unobserve(el);
      });
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [target, duration]);
  return [ref, n];
}

function fmt(n) { return n.toLocaleString('ru-RU').replace(/,/g, ' '); }

const LAWS = [
  { code: '152-ФЗ',   tag: 'пд',     name: 'Персональные данные',        desc: 'Политика конфиденциальности, явное согласие на обработку, cookie-баннер.',                       fine: 'до 300 000 ₽' },
  { code: '149-ФЗ',   tag: 'юр',     name: 'Информация о владельце',     desc: 'ИНН, ОГРН, юридический адрес, email и телефон на сайте · сверка с ЕГРЮЛ.',                       fine: 'до 100 000 ₽' },
  { code: 'ЕРИР',     tag: 'рк',     name: 'Маркировка рекламы',          desc: 'ERID-токен, пометка «реклама», корректность данных рекламодателя.',                              fine: 'до 500 000 ₽' },
  { code: 'ЗоЗПП',    tag: 'оф',     name: 'Публичная оферта',           desc: 'Условия продажи, возврата и обмена товаров и услуг.',                                            fine: 'до 500 000 ₽' },
  { code: 'Реестры',  tag: 'сл',     name: 'Иноагенты и экстремисты',    desc: 'Упоминания без обязательной маркировки по реестрам иноагентов, экстремистов и нежелательных организаций (1175+ субъектов).',             fine: 'до 5 000 000 ₽' },
  { code: 'ФЗ № 3',   tag: 'нк',     name: 'Упоминание наркотиков',      desc: 'Пропаганда или незаконный оборот запрещённых веществ.',                                          fine: 'до 1 500 000 ₽' },
];

const AUDIENCE = [
  ['владельцы сайтов', 'Проверьте сайт до проверки Роскомнадзора. Узнайте про штраф первыми.'],
  ['юристы и комплаенс', 'Быстрый аудит клиентских сайтов с PDF-отчётом и цитатами статей.'],
  ['маркетологи',       'Убедитесь, что рекламные материалы промаркированы по ЕРИР.'],
  ['веб-студии',        'Сдавайте проекты с подтверждением соответствия требованиям регулятора.'],
];

const HOW = [
  { n: '01', title: 'вставляете адрес сайта', desc: 'главную или весь сайт целиком. для медиа и e-commerce — рекурсивный обход до 150 страниц.', time: '~5 секунд' },
  { n: '02', title: 'сканер обходит код',      desc: 'headless Chromium парсит DOM, метатеги, сетевые запросы и cookies. сверяет с реестрами и судебной практикой.', time: '~25 секунд' },
  { n: '03', title: 'отчёт готов',              desc: 'видите результат на этой же странице. PDF скачивается по кнопке, ссылка сохраняется по UUID (7 дней).', time: '~5 секунд' },
];

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

const STATS_STATIC = [
  { k: '// видов проверок', v: 6,  d: '152ФЗ · 149ФЗ · ЕРИР · зозпп · реестры · наркотики' },
  { k: '// время сканера',  v: 28, u: 'сек', d: 'для одной страницы' },
];

const CHECK_LABELS = {
  law152: { name: '152-ФЗ · персональные данные',  fine: 'до 300 000 ₽' },
  law149: { name: '149-ФЗ · реквизиты компании',   fine: 'до 100 000 ₽' },
  erir:   { name: 'ЕРИР · маркировка рекламы',      fine: 'до 500 000 ₽' },
  offer:  { name: 'ЗоЗПП · публичная оферта',       fine: 'до 500 000 ₽' },
  cookie: { name: '152-ФЗ · cookie-согласие',       fine: 'до 300 000 ₽' },
  ga:     { name: 'Google Analytics · 152-ФЗ',      fine: 'до 300 000 ₽' },
  drugs:  { name: 'ФЗ № 3 · наркотики',             fine: 'до 1 500 000 ₽' },
  sleza:  { name: 'Иноагенты без маркировки',        fine: 'до 5 000 000 ₽' },
};

const SAMPLE_FINDINGS = [
  { law: 'cookies без отказа',           code: '152-ФЗ · ст. 9 · ч. 4',     desc: 'баннер cookie не предлагает опции «отказаться», метрики Я.Метрика и top-mailru загружаются до получения согласия. 3 трекера.', fine: '300 000 ₽' },
  { law: 'политика ПД не найдена',       code: '152-ФЗ · ст. 18.1 · ч. 2',  desc: 'в подвале и в footer-меню нет ссылки на политику обработки. форма обратной связи собирает email и телефон.', fine: '300 000 ₽' },
  { law: '3 баннера без ERID',             code: '38-ФЗ · ст. 18.1',          desc: 'рекламные блоки «партнёрский материал» и 2 промо-тизера на главной не содержат токена в HTML и не присутствуют в ЕРИР.', fine: '500 000 ₽' },
  { law: 'упоминание иноагента без метки', code: '5-ФЗ · ст. 11 · по реестру minjust', desc: 'в 4 статьях упоминается лицо из реестра иноагентов без обязательной плашки «выполняет функции иностранного агента».', fine: '150 000 ₽' },
];

const FAQ = [
  { q: 'Это бесплатно?', a: 'Да, проверка полностью бесплатна. AI-анализ и сверка с реестрами иноагентов входят в стандартный аудит.' },
  { q: 'Насколько точны результаты?', a: 'Мы используем детерминированные алгоритмы по актуальным требованиям законодательства + AI-арбитр (Groq Llama 3.3 70B) для спорных случаев. Точность ~85–90%. Инструмент не заменяет юридическую консультацию.' },
  { q: 'Как часто нужно проверять сайт?', a: 'Рекомендуем раз в квартал и при каждом обновлении политики конфиденциальности или добавлении форм сбора данных.' },
  { q: 'Что делать если нашли нарушения?', a: 'Каждый пункт отчёта содержит конкретное действие по устранению и ссылку на статью закона. Скачайте PDF и передайте разработчику или юристу — там всё структурировано. Если нужен разбор отчёта вместе с нами — пишите на kirillmash99@gmail.com, поможем.' },
  { q: 'Проверяет ли сервис весь сайт?', a: 'Да, режим «Весь сайт» сканирует до 150 страниц через sitemap или краулинг. Занимает 2–5 минут.' },
  { q: 'Сохраняете ли вы данные сайта?', a: 'Хранится только итоговый отчёт (по UUID, 7 дней) — для возможности поделиться ссылкой. Контент страниц не сохраняем.' },
];

function SampleReport() {
  return (
    <div className="bg-white border border-line-2 rounded-[10px] overflow-hidden">
      {/* meta header */}
      <div className="bg-paper border-b border-line px-5 sm:px-6 py-3.5 flex flex-wrap gap-x-6 gap-y-2 items-center font-mono text-[11px] text-ink/60">
        <SmpMeta k="домен"      v="media-***.ru" />
        <SmpMeta k="тип сайта"  v="СМИ / редакция" />
        <SmpMeta k="отчёт от"   v="22.05.2026 · 14:08" />
        <SmpMeta k="параметров" v="6 / 6" />
        <span className="ml-auto font-mono text-[9.5px] uppercase tracking-[0.16em] font-bold border rounded-[4px] px-2.5 py-1 border-danger text-danger bg-danger/[0.04]">
          требует действий
        </span>
      </div>

      {/* verdict */}
      <div className="px-5 sm:px-6 py-7 sm:py-8 border-b border-line grid md:grid-cols-[1fr_auto] gap-7 md:gap-8 items-start md:items-center">
        <div>
          <div className="label-micro mb-2">потенциальные штрафы · 13.15 коап рф</div>
          <div className="font-extrabold text-danger tracking-[-0.05em] leading-[0.92] tabular-nums" style={{ fontSize: 'clamp(44px, 6vw, 76px)' }}>
            1 250 000 ₽
          </div>
          <div className="mt-3 text-[13px] text-ink/60 leading-snug max-w-[52ch]">
            <b className="text-ink">суммарно по найденным нарушениям</b> · считаем по верхней границе санкции для юр. лиц. реальная сумма зависит от региона и количества эпизодов.
          </div>
        </div>
        <div className="flex flex-col gap-2 items-start md:items-end w-full md:min-w-[240px] md:w-auto">
          <div className="label-micro">риск-скор</div>
          <div className="w-full md:w-[240px] h-2 bg-warm border border-line rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: '84%', background: 'linear-gradient(90deg, #b87900 0%, #d63816 100%)' }} />
          </div>
          <div className="w-full md:w-[240px] flex justify-between font-mono text-[10px] text-ink/25">
            <span>0</span><span>5</span><span>10</span>
          </div>
          <div className="font-bold text-[14px] tracking-tight text-danger">8.4 / 10 · высокий</div>
        </div>
      </div>

      {/* findings */}
      <div>
        {SAMPLE_FINDINGS.map((f, i) => (
          <div key={i} className="px-5 sm:px-6 py-4 border-b border-line grid sm:grid-cols-[40px_minmax(0,1.4fr)_minmax(0,2fr)_auto_28px] gap-3 sm:gap-4 items-start">
            <div className="font-mono text-[11px] text-ink/30 tracking-wider hidden sm:block pt-1">{String(i + 1).padStart(2, '0')}</div>
            <div className="flex sm:block items-baseline gap-3">
              <span className="font-mono text-[11px] text-ink/30 tracking-wider sm:hidden">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h4 className="font-bold text-[15px] tracking-tight leading-snug">{f.law}</h4>
                <div className="font-mono text-[11px] text-brand mt-0.5">{f.code}</div>
              </div>
            </div>
            <div className="text-[13px] text-ink/60 leading-snug pt-0.5">{f.desc}</div>
            <div className="flex sm:block items-center justify-between sm:text-right whitespace-nowrap pt-0.5">
              <div className="font-mono text-[9px] uppercase tracking-wider text-ink/25 sm:mb-0.5">штраф до</div>
              <div className="font-bold text-[15px] tracking-tight text-danger">{f.fine}</div>
            </div>
            <div className="hidden sm:flex justify-end pt-1">
              <span className="w-6 h-6 rounded-full bg-danger text-white flex items-center justify-center font-mono text-[11px] font-bold">!</span>
            </div>
          </div>
        ))}

        {/* locked rows */}
        {[0, 1].map(i => (
          <div key={`l${i}`} className="px-5 sm:px-6 py-4 border-b border-line last:border-b-0 grid sm:grid-cols-[40px_minmax(0,1.4fr)_minmax(0,2fr)_auto_28px] gap-3 sm:gap-4 items-start opacity-50 pointer-events-none select-none" style={{ filter: 'blur(4px)' }}>
            <div className="font-mono text-[11px] text-ink/25 tracking-wider hidden sm:block pt-1">0{5 + i}</div>
            <div className="flex sm:block items-baseline gap-3">
              <span className="font-mono text-[11px] text-ink/25 tracking-wider sm:hidden">0{5 + i}</span>
              <div>
                <h4 className="font-bold text-[15px] tracking-tight leading-snug">████████████</h4>
                <div className="font-mono text-[11px] text-brand mt-0.5">149-ФЗ · ст. ██</div>
              </div>
            </div>
            <div className="text-[13px] text-ink/60 leading-snug pt-0.5">█████ █████████ ██ ████ ███████ ██ ███████.</div>
            <div className="flex sm:block items-center justify-between sm:text-right whitespace-nowrap pt-0.5">
              <div className="font-mono text-[9px] uppercase tracking-wider text-ink/25 sm:mb-0.5">штраф до</div>
              <div className="font-bold text-[15px] tracking-tight text-danger">███ 000 ₽</div>
            </div>
            <div className="hidden sm:flex justify-end pt-1">
              <span className="w-6 h-6 rounded-full bg-warn text-white flex items-center justify-center font-mono text-[11px] font-bold">!</span>
            </div>
          </div>
        ))}
      </div>

      {/* CTA below */}
      <div className="px-5 sm:px-6 py-6 bg-paper border-t border-line text-center relative">
        <div className="absolute left-0 right-0 -top-20 h-20 bg-gradient-to-b from-transparent to-paper pointer-events-none" />
        <div className="relative">
          <div className="font-bold text-[18px] tracking-tight leading-snug mb-1.5">
            это образец отчёта · остальные <span className="text-brand">6 пунктов</span> — по вашему домену
          </div>
          <div className="text-[13.5px] text-ink/60 leading-snug max-w-[52ch] mx-auto mb-4">
            впишите свой сайт в сканер выше — проверим по 6 параметрам и соберём такой же отчёт за 30 секунд. бесплатно.
          </div>
          <a
            href="#scan"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setTimeout(() => { document.querySelector('input[placeholder*="example"]')?.focus(); }, 600);
            }}
            className="inline-flex items-center gap-2 bg-brand hover:bg-ink text-white rounded-lg px-5 py-3 text-[14px] font-bold transition-colors"
          >
            проверить мой сайт ↑
          </a>
        </div>
      </div>
    </div>
  );
}

function SmpMeta({ k, v }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9.5px] uppercase tracking-[0.1em] text-ink/25">{k}</span>
      <span className="text-ink font-medium">{v}</span>
    </div>
  );
}

function SectionHead({ kicker, title, sub }) {
  return (
    <div className="mb-7">
      <div className="label-micro text-brand mb-2.5">{kicker}</div>
      <h2 className="text-[28px] sm:text-[34px] font-extrabold tracking-[-0.035em] leading-[1.05] mb-2 text-balance">
        {title}
      </h2>
      {sub && <p className="text-[15px] text-ink/60 leading-snug max-w-[60ch]">{sub}</p>}
    </div>
  );
}

function LawTable() {
  return (
    <div className="bg-white border border-line-2 rounded-[10px] overflow-hidden">
      {LAWS.map((l) => (
        <div
          key={l.code}
          className="px-4 sm:px-5 py-4 border-b border-line last:border-b-0 hover:bg-warm/40 transition-colors grid sm:grid-cols-[64px_minmax(0,1.3fr)_minmax(0,2fr)_auto] gap-3 sm:gap-4 sm:items-center"
        >
          <div className="flex items-center gap-3 sm:contents">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-md bg-warm flex items-center justify-center font-extrabold text-[13px] text-brand tracking-tight uppercase shrink-0">
              {l.tag}
            </div>
            <div className="sm:hidden flex-1 min-w-0">
              <div className="font-mono text-[11px] text-brand font-semibold tracking-wide mb-0.5">{l.code}</div>
              <div className="font-bold text-[15px] tracking-tight leading-snug">{l.name}</div>
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="font-mono text-[11px] text-brand font-semibold tracking-wide mb-0.5">{l.code}</div>
            <div className="font-bold text-[16px] tracking-tight leading-snug">{l.name}</div>
          </div>
          <div className="text-[13px] text-ink/60 leading-snug">{l.desc}</div>
          <div className="flex sm:block items-center justify-between sm:text-right whitespace-nowrap">
            <div className="font-mono text-[9.5px] uppercase tracking-wider text-ink/25 sm:mb-0.5">штраф</div>
            <div className="font-bold text-[15px] tracking-tight text-danger">{l.fine}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AudienceGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-line border border-line-2 rounded-[10px] overflow-hidden">
      {AUDIENCE.map(([title, desc], i) => (
        <div key={title} className="bg-white p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink/30 mb-1.5">// 0{i + 1}</div>
          <div className="font-bold text-[16px] tracking-tight mb-1">{title}</div>
          <div className="text-[13px] text-ink/60 leading-snug">{desc}</div>
        </div>
      ))}
    </div>
  );
}

function HowItWorks() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-line border border-line-2 rounded-[10px] overflow-hidden">
      {HOW.map((step) => (
        <div key={step.n} className="bg-white p-5 flex flex-col gap-3 min-h-[180px]">
          <div className="font-mono text-[11px] text-brand font-semibold tracking-wider">шаг {step.n}</div>
          <div className="font-bold text-[18px] tracking-tight leading-snug">{step.title}</div>
          <p className="text-[13px] text-ink/60 leading-snug">{step.desc}</p>
          <div className="mt-auto pt-3 border-t border-dashed border-line-2 font-mono text-[10.5px] uppercase tracking-wider text-ink/40">
            {step.time}
          </div>
        </div>
      ))}
    </div>
  );
}

function usePublicStats() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(`${BASE}/api/stats`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {});
  }, []);
  return data;
}

function StatsBlock({ scanCount }) {
  const stats = [
    { k: '// сайтов проверено', v: scanCount, d: 'с запуска сервиса' },
    ...STATS_STATIC,
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-line border border-line-2 rounded-[10px] overflow-hidden">
      {stats.map((s) => (
        <StatCell key={s.k} s={s} />
      ))}
    </div>
  );
}

function TopViolations({ violations, totalScans }) {
  if (!violations?.length) return null;

  const known = violations
    .map(v => ({ ...v, meta: CHECK_LABELS[v.check_id] }))
    .filter(v => v.meta);

  if (!known.length) return null;

  const maxCnt = Math.max(...known.map(v => v.cnt));

  return (
    <div className="bg-white border border-line-2 rounded-[10px] overflow-hidden">
      {known.map((v, i) => {
        const pct = totalScans > 0 ? Math.round((v.cnt / totalScans) * 100) : null;
        const barW = Math.round((v.cnt / maxCnt) * 100);
        return (
          <div key={v.check_id} className="px-5 sm:px-6 py-4 border-b border-line last:border-b-0 grid sm:grid-cols-[minmax(0,1fr)_80px_120px] gap-3 sm:gap-5 items-center">
            <div>
              <div className="font-bold text-[14px] tracking-tight leading-snug">{v.meta.name}</div>
              <div className="mt-1.5 h-1.5 bg-warm rounded-full overflow-hidden w-full max-w-[320px]">
                <div className="h-full bg-danger/60 rounded-full transition-all" style={{ width: `${barW}%` }} />
              </div>
            </div>
            <div className="text-right">
              {pct != null ? (
                <>
                  <div className="font-extrabold text-[22px] tracking-tight text-danger tabular-nums">{pct}%</div>
                  <div className="font-mono text-[10px] text-ink/30 uppercase tracking-wider">сайтов</div>
                </>
              ) : (
                <div className="font-extrabold text-[22px] tracking-tight text-danger tabular-nums">{v.cnt}</div>
              )}
            </div>
            <div className="text-right hidden sm:block">
              <div className="font-mono text-[10px] text-ink/25 uppercase tracking-wider mb-0.5">штраф</div>
              <div className="font-bold text-[13px] text-danger">{v.meta.fine}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatCell({ s }) {
  const [ref, n] = useCountUp(s.v ?? 0);
  const isLoading = s.v == null;
  return (
    <div className="bg-paper p-5 flex flex-col gap-2">
      <div className="label-micro">{s.k}</div>
      <div ref={ref} className="font-extrabold text-[34px] sm:text-[44px] leading-[0.95] tracking-[-0.04em] tabular-nums">
        {isLoading ? <span className="text-ink/20">—</span> : (
          <>
            {fmt(n)}
            {s.u && <span className="text-[0.46em] text-ink/40 ml-1 font-extrabold align-baseline">{s.u}</span>}
          </>
        )}
      </div>
      <div className="text-[12px] text-ink/55 leading-snug max-w-[22ch]">{s.d}</div>
    </div>
  );
}

function FoundersNote() {
  return (
    <div className="bg-white border border-line-2 rounded-[10px] p-7 sm:p-10 grid sm:grid-cols-[160px_minmax(0,1fr)] gap-7 sm:gap-10 items-start">
      <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink/45 leading-[1.7]">
        <div>от <b className="text-ink font-semibold">команды<br/>слеза.media</b></div>
        <div className="mt-3">23 мая 2026</div>
      </div>
      <div className="text-[16px] sm:text-[17px] leading-[1.55] text-ink-2 space-y-4">
        <p>В 2024 мы запустили <b className="text-ink font-bold">sleza.media</b> — первый сервис маркировки иноагентов, экстремистов и террористов для СМИ. За полтора года к нам пришли редакции и корпоративные блоги с одним и тем же вопросом: <b className="text-ink font-bold">«а что ещё мы нарушаем?»</b></p>
        <p>Поэтому теперь — <b className="text-ink font-bold">сканер.</b> Бесплатно проверяет соответствие 152-ФЗ, 149-ФЗ и ЕРИР. Не угадывает — считает по верхней границе санкции. Присылает PDF, который можно отдать юристу.</p>
        <p>Цель простая: <b className="text-ink font-bold">увидеть штраф первым</b> — не от прокурора.</p>
      </div>
    </div>
  );
}

function FaqList() {
  const [open, setOpen] = useState(null);
  return (
    <div className="bg-white border border-line-2 rounded-[10px] overflow-hidden">
      {FAQ.map((item, i) => (
        <div key={i} className="border-b border-line last:border-b-0">
          <button
            className="w-full text-left px-5 py-4 text-[14px] font-medium flex justify-between items-center hover:bg-warm/40 transition-colors gap-3"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-ink/30 tracking-wider">{String(i + 1).padStart(2, '0')}</span>
              <span className="text-ink">{item.q}</span>
            </span>
            <span className="text-ink/30 text-[18px] leading-none shrink-0">{open === i ? '−' : '+'}</span>
          </button>
          {open === i && (
            <div className="px-5 pb-4 pl-[60px] text-[13.5px] text-ink/65 leading-relaxed">{item.a}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Landing() {
  const stats = usePublicStats();

  return (
    <div className="space-y-14 mt-10">
      <section>
        <SectionHead
          kicker="// что проверяем"
          title={<>четыре блока законов, <span className="text-brand">6 проверок</span></>}
          sub="под каждым нарушением — конкретная статья закона, цитата и сценарий, как починить. результат — в PDF-отчёте."
        />
        <LawTable />
      </section>

      <section>
        <SectionHead
          kicker="// образец отчёта"
          title={<>так выглядит результат <span className="text-brand">сканирования.</span></>}
          sub="реальный отчёт по обезличенному СМИ-порталу. 4 нарушения, 2 риска. структура — такая же для вашего сайта."
        />
        <SampleReport />
      </section>

      <section>
        <SectionHead
          kicker="// для кого"
          title="продукт сделан для четырёх ролей."
          sub="каждая из них хочет одного и того же — узнать про штраф первой, не от регулятора."
        />
        <AudienceGrid />
      </section>

      <section>
        <SectionHead
          kicker="// как это работает"
          title={<>от URL до отчёта — <span className="text-brand">меньше минуты.</span></>}
          sub="никакой регистрации. вводите адрес, видите результат на той же странице, при желании — скачиваете PDF или передаёте ссылку."
        />
        <HowItWorks />
      </section>

      <section>
        <SectionHead
          kicker="// что мы видим"
          title="статистика по всем проверкам."
          sub="всё обезличено. храним только итоговый отчёт, не содержимое сайта."
        />
        <StatsBlock scanCount={stats?.scans} />
      </section>

      {stats?.violations?.length > 0 && (
        <section>
          <SectionHead
            kicker="// типичные ошибки"
            title={<>что находим чаще всего.</>}
            sub="реальная статистика по всем проверенным сайтам. данные обновляются при каждом новом скане."
          />
          <TopViolations violations={stats.violations} totalScans={stats.scans} />
        </section>
      )}

      <section>
        <SectionHead
          kicker="// частые вопросы"
          title="всё, что обычно спрашивают."
        />
        <FaqList />
      </section>

      {/* Footer */}
      <footer className="border-t border-line pt-7 pb-3 grid sm:grid-cols-[auto_minmax(0,1fr)] gap-5 sm:gap-8 items-start text-[11px] font-mono text-ink/45 tracking-wide">
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 bg-brand inline-block" style={{ borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)' }} />
          <b className="text-ink/70 font-semibold">ФОНАРИК // СКАНЕР</b>
        </span>
        <div className="flex flex-col gap-1">
          <span><b className="text-ink/65 font-semibold">© 2026</b> · Подсвечиваем нарушения на российских сайтах</span>
          <a href="mailto:kirillmash99@gmail.com" className="hover:text-ink transition-colors">kirillmash99@gmail.com</a>
          <Link href="/privacy" className="hover:text-ink transition-colors underline underline-offset-2">Политика конфиденциальности</Link>
          <span>не является юридической консультацией</span>
        </div>
      </footer>
    </div>
  );
}
