'use client';

import { useState } from 'react';
import Link from 'next/link';
import StartFrame, { RING } from '../../../../components/start/StartFrame';
import { RefreshIcon } from '../../../../components/app/AppIcons';
import { projectSummary } from '../../../../lib/appMock';
import { PRICE, getProject } from '../../../../lib/projectMock';

const TABS = [
  { key: 'tilda', label: 'Тильда', text: 'Настройки сайта → Ещё → HTML-код для вставки внутрь HEAD → вставить строку → Опубликовать все страницы.' },
  { key: 'wp', label: 'WordPress', text: 'Внешний вид → Редактор тем → header.php → вставить перед </head>. Либо плагин для вставки кода в шапку.' },
  { key: 'bitrix', label: 'Битрикс', text: 'Настройки → Настройки продукта → Сайты → шаблон сайта → вставить в секцию HEAD.' },
  { key: 'other', label: 'Другой сайт', text: 'Вставьте строку в HTML любой страницы перед закрывающим тегом </head>. Работает на любом движке.' },
];

// 4 · Установка + оплата — последний шаг, как раньше был «оффер» (см. «ready»):
// растворили отдельный экран, перенесли его содержимое туда, где оно уместнее.
// Здесь то же самое с «оплатой» — код и инструкцию видно и можно поставить сразу,
// бесплатно; сама оплата — последнее действие на этом же экране, а не отдельный
// шаг перед ним. Поэтому каркас — снова StartFrame, не AppShell: оплата всё ещё
// решение на один экран, боковая навигация тут отвлекает больше, чем помогает.
export default function InstallPage() {
  const project = getProject('p1');
  const summary = projectSummary(project);
  const [tab, setTab] = useState('tilda');
  const [found, setFound] = useState(false);
  const [payState, setPayState] = useState('form'); // макет: form | error
  const active = TABS.find(t => t.key === tab);

  return (
    <StartFrame project={project} summary={summary} step={4} back={{ href: '/app/start/ready', label: 'документы' }}>
      <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">Установить скрипт</h1>
      <p className="mt-2 text-[15px] text-ink/65">
        Одна строчка кода. Она подтянет баннер, реквизиты и ссылки на документы — дальше мы обновляем их сами.
      </p>

      <h2 className="mb-3 mt-7 text-[15px] font-bold tracking-[-0.02em]">Сделать самому</h2>
      <div className="rounded-lg border border-line-2 bg-white p-4">
        <pre className="overflow-x-auto rounded-lg bg-ink p-3.5 font-mono text-[12.5px] leading-relaxed text-white/90">
{`<script src="https://cdn.shtrafkontrol.ru/w.js"
data-site="${project.domain.replace(/\./g, '-')}" async></script>`}
        </pre>
        <button type="button" className={`mt-3 rounded-lg border border-line-2 bg-white px-4 py-2 text-[13px] font-semibold transition-colors hover:border-ink/40 ${RING}`}>
          Скопировать код
        </button>

        <div className="my-4 h-px bg-line" />
        <div className="mb-3 flex flex-wrap gap-1 border-b border-line">
          {TABS.map(t => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-semibold transition-colors ${
                tab === t.key ? 'border-ink text-ink' : 'border-transparent text-ink/60 hover:text-ink'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-[13.5px] leading-relaxed text-ink/70">{active.text}</p>
      </div>

      <h2 className="mb-3 mt-6 text-[15px] font-bold tracking-[-0.02em]">Поручить тому, кто делает сайт</h2>
      <div className="rounded-lg border border-line-2 bg-white p-4">
        <label className="mb-1 block text-[13px] font-bold" htmlFor="dev-mail">Почта разработчика</label>
        <input id="dev-mail" placeholder="dev@studio.ru" className={`w-full rounded-lg border border-line-2 px-3.5 py-3 font-mono text-[15px] ${RING}`} />
        <button type="button" className={`mt-3 rounded-lg border border-line-2 bg-white px-4 py-2 text-[13px] font-semibold transition-colors hover:border-ink/40 ${RING}`}>
          Отправить инструкцию
        </button>
      </div>

      <h2 className="mb-3 mt-6 text-[15px] font-bold tracking-[-0.02em]">Поручить нам</h2>
      <div className="rounded-lg border border-line-2 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13.5px] text-ink/75">Подключимся к сайту и поставим сами. Нужен доступ в админку.</p>
            <p className="mt-1 text-[11.5px] text-ink/60">Разово, обычно в течение рабочего дня</p>
          </div>
          <span className="shrink-0 text-[16px] font-extrabold">1 500 ₽</span>
        </div>
        <button type="button" className={`mt-3 rounded-lg border border-line-2 bg-white px-4 py-2 text-[13px] font-semibold transition-colors hover:border-ink/40 ${RING}`}>
          Заказать установку
        </button>
      </div>

      <div className="mt-6 rounded-lg border border-line-2 bg-white p-4">
        {found ? (
          <>
            <div className="inline-flex items-center gap-1.5 text-[14px] font-bold text-ok">✓ Скрипт установлен, всё работает</div>
            <p className="mt-2 text-[13.5px] text-ink/70">Баннер показывается, реквизиты в подвале, ссылки на документы на месте.</p>
            <button type="button" onClick={() => setFound(false)} className={`mt-3 text-[13px] font-semibold text-ink/60 transition-colors hover:text-ink ${RING}`}>
              показать состояние «не найден»
            </button>
          </>
        ) : (
          <>
            <div className="inline-flex items-center gap-1.5 text-[14px] font-bold text-danger">✕ Скрипт на сайте не найден</div>
            <p className="mt-2 text-[13.5px] text-ink/70">
              Проверили {project.domain} минуту назад. Если только что вставили — подождите пару минут и проверьте снова.
            </p>
            <button type="button" onClick={() => setFound(true)}
              className={`mt-3 inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-brand ${RING}`}>
              <RefreshIcon size={15} />
              Проверить установку
            </button>
          </>
        )}
      </div>

      <h2 className="mb-3 mt-8 text-[15px] font-bold tracking-[-0.02em]">Осталось оплатить</h2>

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink/60">
        <span className="rounded-full border border-line-2 px-2 py-0.5">макет</span>
        <span className="inline-flex items-center gap-1.5">
          оплата:
          {[['form', 'форма'], ['error', 'банк отклонил']].map(([val, label]) => (
            <button key={val} type="button" aria-pressed={payState === val} onClick={() => setPayState(val)}
              className={`rounded px-1.5 py-0.5 transition-colors ${RING} ${payState === val ? 'bg-ink text-white' : 'hover:text-ink'}`}>
              {label}
            </button>
          ))}
        </span>
      </div>

      {payState === 'error' ? (
        <div className="rounded-lg border border-danger/30 bg-white p-4">
          <div className="text-[14px] font-bold text-danger">✕ Карта ···· 4417 — отклонено</div>
          <div className="my-3 h-px bg-line" />
          <p className="text-[13.5px] text-ink/70">Данные, которые вы вводили, сохранены — заполнять заново не нужно.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => setPayState('form')}
              className={`rounded-lg bg-ink px-5 py-3 text-[14px] font-bold text-white transition-colors hover:bg-brand ${RING}`}>
              Попробовать другой картой
            </button>
            <button type="button" className={`rounded-lg px-3 py-3 text-[14px] font-semibold text-ink/70 transition-colors hover:text-ink ${RING}`}>
              Выставить счёт по реквизитам
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-line-2 bg-white p-4">
            <h3 className="text-[13px] font-bold uppercase tracking-[0.04em] text-ink/60">Сразу</h3>
            <ul className="mt-2 space-y-1.5 text-[13.5px] text-ink/75">
              <li>· Готовый пакет документов под ваши формы и трекеры</li>
              <li>· Виджет: куки-баннер и реквизиты в подвале</li>
              <li>· Постоянные ссылки на документы</li>
            </ul>
            <h3 className="mt-4 text-[13px] font-bold uppercase tracking-[0.04em] text-ink/60">Каждый месяц</h3>
            <ul className="mt-2 space-y-1.5 text-[13.5px] text-ink/75">
              <li>· Проверка сайта и обновление документов при смене закона</li>
              <li>· Уведомления, если что-то изменилось</li>
            </ul>
            <div className="my-4 h-px bg-line" />
            <div className="flex items-center justify-between">
              <span className="text-[14.5px] text-ink/70">Итого</span>
              <span className="text-[19px] font-extrabold tracking-[-0.02em]">{PRICE}</span>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-line-2 bg-white p-4">
            <label className="mb-1 block text-[13px] font-bold" htmlFor="card">Номер карты</label>
            <input id="card" placeholder="0000 0000 0000 0000" className={`w-full rounded-lg border border-line-2 px-3.5 py-3 font-mono text-[15px] ${RING}`} />
            <div className="mt-3 flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-[13px] font-bold" htmlFor="exp">Срок</label>
                <input id="exp" placeholder="ММ/ГГ" className={`w-full rounded-lg border border-line-2 px-3.5 py-3 font-mono text-[15px] ${RING}`} />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-[13px] font-bold" htmlFor="cvc">CVC</label>
                <input id="cvc" placeholder="•••" className={`w-full rounded-lg border border-line-2 px-3.5 py-3 font-mono text-[15px] ${RING}`} />
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-line-2 pt-4">
            <Link href="/app/project/p1"
              className={`flex w-full items-center justify-center rounded-lg bg-ink px-5 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-brand ${RING}`}>
              Оплатить {PRICE.split('/')[0].trim()} и войти в кабинет →
            </Link>
            <p className="mt-2.5 text-center text-[12px] text-ink/60">
              Автопродление раз в месяц · отменить можно в любой момент, деньги за неиспользованные дни вернём
            </p>
          </div>
        </>
      )}
    </StartFrame>
  );
}
