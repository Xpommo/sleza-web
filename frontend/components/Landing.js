'use client';

import { useState } from 'react';

const LAWS = [
  { code: '152-ФЗ',   tag: 'пд',     name: 'Персональные данные',        desc: 'Политика конфиденциальности, явное согласие на обработку, cookie-баннер.',                       fine: 'до 300 000 ₽' },
  { code: '149-ФЗ',   tag: 'юр',     name: 'Информация о владельце',     desc: 'ИНН, ОГРН, юридический адрес, email и телефон на сайте · сверка с ЕГРЮЛ.',                       fine: 'до 100 000 ₽' },
  { code: 'ЕРИР',     tag: 'рк',     name: 'Маркировка рекламы',          desc: 'ERID-токен, пометка «реклама», корректность данных рекламодателя.',                              fine: 'до 500 000 ₽' },
  { code: 'ЗоЗПП',    tag: 'оф',     name: 'Публичная оферта',           desc: 'Условия продажи, возврата и обмена товаров и услуг.',                                            fine: 'до 500 000 ₽' },
  { code: 'Реестры',  tag: 'сл',     name: 'Иноагенты и экстремисты',    desc: 'Упоминания без обязательной маркировки по реестрам sleza.media (1175+ субъектов).',             fine: 'до 5 000 000 ₽' },
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

const STATS = [
  // Пока бэкенд не отдаёт агрегированную статистику — placeholder. Замените на fetch к /api/admin/stats когда будет публичный endpoint.
  { k: '// сайтов проверено', v: '1 248',     d: 'с запуска беты' },
  { k: '// нарушений найдено', v: '5 612',    d: '4.5 в среднем на сайт' },
  { k: '// видов проверок',    v: '6',        d: '152ФЗ · 149ФЗ · ЕРИР · зозпп · реестры · наркотики' },
  { k: '// время сканера',     v: '28', u: 'сек', d: 'для одной страницы' },
];

const FAQ = [
  { q: 'Это бесплатно?', a: 'Да, проверка полностью бесплатна. AI-анализ и сверка с реестрами иноагентов sleza.media входят в стандартный аудит.' },
  { q: 'Насколько точны результаты?', a: 'Мы используем детерминированные алгоритмы по актуальным требованиям законодательства + AI-арбитр (Groq Llama 3.3 70B) для спорных случаев. Точность ~85–90%. Инструмент не заменяет юридическую консультацию.' },
  { q: 'Как часто нужно проверять сайт?', a: 'Рекомендуем раз в квартал и при каждом обновлении политики конфиденциальности или добавлении форм сбора данных.' },
  { q: 'Что делать если нашли нарушения?', a: 'Каждый пункт отчёта содержит конкретное действие по устранению. Вы можете скачать PDF и передать разработчику или юристу, либо запросить разбор с нашей командой.' },
  { q: 'Проверяет ли сервис весь сайт?', a: 'Да, режим «Весь сайт» сканирует до 150 страниц через sitemap или краулинг. Занимает 2–5 минут.' },
  { q: 'Сохраняете ли вы данные сайта?', a: 'Хранится только итоговый отчёт (по UUID, 7 дней) — для возможности поделиться ссылкой. Контент страниц не сохраняем.' },
];

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
      {LAWS.map((l, i) => (
        <div
          key={l.code}
          className="grid grid-cols-[64px_minmax(0,1.3fr)_minmax(0,2fr)_auto] gap-4 px-5 py-4 items-center border-b border-line last:border-b-0 hover:bg-warm/40 transition-colors"
        >
          <div className="w-12 h-12 rounded-md bg-warm flex items-center justify-center font-extrabold text-[13px] text-brand tracking-tight uppercase">
            {l.tag}
          </div>
          <div>
            <div className="font-mono text-[11px] text-brand font-semibold tracking-wide mb-0.5">{l.code}</div>
            <div className="font-bold text-[16px] tracking-tight leading-snug">{l.name}</div>
          </div>
          <div className="text-[13px] text-ink/60 leading-snug">{l.desc}</div>
          <div className="text-right whitespace-nowrap">
            <div className="font-mono text-[9.5px] uppercase tracking-wider text-ink/25 mb-0.5">штраф</div>
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

function StatsBlock() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-line border border-line-2 rounded-[10px] overflow-hidden">
      {STATS.map((s) => (
        <div key={s.k} className="bg-paper p-5 flex flex-col gap-2">
          <div className="label-micro">{s.k}</div>
          <div className="font-extrabold text-[34px] sm:text-[44px] leading-[0.95] tracking-[-0.04em] tabular-nums">
            {s.v}
            {s.u && <span className="text-[0.46em] text-ink/40 ml-1 font-extrabold align-baseline">{s.u}</span>}
          </div>
          <div className="text-[12px] text-ink/55 leading-snug max-w-[22ch]">{s.d}</div>
        </div>
      ))}
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
  return (
    <div className="space-y-14 mt-10">
      <section>
        <SectionHead
          kicker="// что проверяем"
          title={<>четыре блока законов, <span className="text-brand">12 параметров</span></>}
          sub="под каждым нарушением — конкретная статья закона, цитата и сценарий, как починить. результат — в PDF-отчёте."
        />
        <LawTable />
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
        <StatsBlock />
      </section>

      <section>
        <SectionHead
          kicker="// частые вопросы"
          title="всё, что обычно спрашивают."
        />
        <FaqList />
      </section>

      <section>
        <FoundersNote />
      </section>

      {/* Powered by */}
      <div className="text-center font-mono text-[11px] text-ink/40 tracking-wide">
        реестры иноагентов и экстремистов — данные{' '}
        <a href="https://sleza.media" target="_blank" rel="noopener" className="text-brand hover:underline">sleza.media</a>
      </div>

      {/* Footer */}
      <footer className="border-t border-line pt-7 pb-3 grid sm:grid-cols-[auto_minmax(0,1fr)_auto] gap-5 sm:gap-8 items-start text-[11px] font-mono text-ink/45 tracking-wide">
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 bg-brand inline-block" style={{ borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)' }} />
          <b className="text-ink/70 font-semibold">СЛЕЗА // СКАНЕР</b>
        </span>
        <div className="flex flex-col gap-1">
          <span><b className="text-ink/65 font-semibold">© 2024–2026</b></span>
          <a href="mailto:kirillmash99@gmail.com" className="hover:text-ink transition-colors">kirillmash99@gmail.com</a>
          <span>не является юридической консультацией</span>
        </div>
        <div className="font-sans text-[13px] text-ink/55 sm:text-right">
          <span className="italic">«следи за собой,<br/>будь осторожен»</span><br/>
          <b className="font-bold text-ink">— В. Цой</b>
        </div>
      </footer>
    </div>
  );
}
