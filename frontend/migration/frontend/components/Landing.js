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
          kicker="// частые вопросы"
          title="всё, что обычно спрашивают."
        />
        <FaqList />
      </section>

      {/* Powered by */}
      <div className="text-center font-mono text-[11px] text-ink/40 tracking-wide">
        реестры иноагентов и экстремистов — данные{' '}
        <a href="https://sleza.media" target="_blank" rel="noopener" className="text-brand hover:underline">sleza.media</a>
      </div>

      {/* Footer */}
      <footer className="border-t border-line pt-6 pb-2 flex flex-wrap items-center justify-between gap-4 text-[11px] font-mono text-ink/40 tracking-wide">
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 bg-brand inline-block" style={{ borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)' }} />
          <b className="text-ink/60 font-semibold">СЛЕЗА // ПРОВЕРКА</b>
        </span>
        <div className="flex gap-5 items-center">
          <a href="mailto:kirillmash99@gmail.com" className="hover:text-ink transition-colors">kirillmash99@gmail.com</a>
          <span>не является юридической консультацией</span>
        </div>
      </footer>
    </div>
  );
}
