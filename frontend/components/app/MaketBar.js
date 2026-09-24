'use client';

// Панель «Макет» — навигация по прототипу без прохождения анкеты. Тот же
// смысл, что у тулбара «МАКЕТ» в статических макетах: открыть любой экран
// в любом состоянии за один клик. В реальном продукте её нет.
//
// Состояние экранов живёт в анкете (sessionStorage, anketaState.js), поэтому
// пресет — это просто готовая анкета: записываем её и перезагружаем экран.

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const KEY = 'anketa_v1';
const UI_KEY = 'maket_bar_v1';
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

const SCREENS = [
  ['Вход', [
    ['Регистрация', '/app/register'],
    ['Вход', '/app/login'],
    ['Мои сайты', '/app/sites'],
  ]],
  ['Анкета', [
    ['1 · Ваш профиль', '/app/start/profile'],
    ['2 · О сайте', '/app/start/site'],
    ['3 · Данные клиентов', '/app/start/clients'],
    ['4 · Реквизиты', '/app/start/requisites'],
    ['5 · Пакет документов', '/app/start/documents'],
    ['6 · Установка', '/app/start/code'],
  ]],
  ['Сайт', [
    ['Обзор', '/app/site'],
    ['Документы', '/app/site/documents'],
    ['Виджет', '/app/site/widget'],
  ]],
  ['Аккаунт', [
    ['Подписка', '/app/billing'],
    ['Настройки', '/app/settings'],
    ['Поддержка', '/app/support'],
  ]],
];

// Ответы — те, что дала бы демо-автоподстановка по ИНН на шаге 4, чтобы
// экраны не спорили друг с другом.
const PERSON = { role: 'Директор / собственник', personName: 'Кирилл', personPhone: '+7 (999) 123-45-67', personEmail: 'director@alfa-school.ru' };
const SITE = { domain: 'alfa-school.ru', sphere: 'school', sphereOther: '', platform: 'Тильда', platformOther: '', analytics: ['metrika'], features: ['chat'] };
const CLIENTS = { purposes: ['booking', 'inquiry'], pdFields: ['name', 'phone', 'email'], callsBase: true };
const REQ = {
  owner: 'ООО', inn: '7701234567', companyName: 'ООО «Альфа Образование»', ogrn: '1157746112233', kpp: '770101001',
  address: '119019, Москва, ул. Воздвиженка, д. 10',
  bank: { account: '40702810900000012345', bank: 'ПАО «Сбербанк»', bik: '044525225', corr: '30101810400000000225' },
  license: { has: 'Да', no: 'Л035-01298-77/00123456', date: 'бессрочная', org: 'Департамент образования и науки города Москвы' },
  itAccred: null, softRegistry: null,
  contacts: { companyMail: 'info@alfa-school.ru', companyPhone: '+7 (495) 123-45-67', postAddress: '', pdContact: 'pd@alfa-school.ru' },
};
const CARD = { method: 'Картой', card: { last4: '2323', exp: '11/28' } };

const PRESETS = [
  ['Пусто — сайтов нет', () => ({}), '/app/sites'],
  ['Анкета: пройден шаг 1', () => ({ ...PERSON, stepsDone: 1 }), '/app/start/site'],
  ['Анкета: пройден шаг 2', () => ({ ...PERSON, ...SITE, stepsDone: 2 }), '/app/start/clients'],
  ['Анкета: пройден шаг 3', () => ({ ...PERSON, ...SITE, ...CLIENTS, stepsDone: 3 }), '/app/start/requisites'],
  ['Анкета: пакет собран', () => ({ ...PERSON, ...SITE, ...CLIENTS, ...REQ, stepsDone: 4 }), '/app/start/documents'],
  ['Всё пройдено, код не поставлен', () => ({ ...PERSON, ...SITE, ...CLIENTS, ...REQ, stepsDone: 5 }), '/app/site'],
  ['Пробный период, код найден', () => ({ ...PERSON, ...SITE, ...CLIENTS, ...REQ, stepsDone: 5, installed: true, trialStartedAt: Date.now() - 2 * HOUR }), '/app/site'],
  // Google Analytics на сайте — задача «Уберите Google Analytics» на «Обзоре»
  // (владелец 24.09). В остальных состояниях его нет, как в данных демо-сайта.
  ['Пробный период, на сайте Google Analytics', () => ({ ...PERSON, ...SITE, analytics: ['metrika', 'ga'], ...CLIENTS, ...REQ, stepsDone: 5, installed: true, trialStartedAt: Date.now() - 2 * HOUR }), '/app/site'],
  // Пробный период — 5 дней с момента, когда код найден (решение 23.09).
  ['Пробный период закончился', () => ({ ...PERSON, ...SITE, ...CLIENTS, ...REQ, stepsDone: 5, installed: true, trialStartedAt: Date.now() - 6 * 24 * HOUR }), '/app/site'],
  // Модель баланса (партнёрская программа, 14.09): пополняют баланс, оплата
  // года каждого сайта списывается с него.
  ['Пробный период, баланс пополнен', () => ({ ...PERSON, ...SITE, ...CLIENTS, ...REQ, stepsDone: 5, installed: true, trialStartedAt: Date.now() - 2 * HOUR, billing: { ...CARD, actsEmail: 'buh@alfa-school.ru', balance: 12000, ops: [{ at: Date.now() - HOUR, kind: 'topup', amount: 12000, method: 'Картой' }] } }), '/app/billing'],
  ['Счёт на пополнение выставлен', () => ({ ...PERSON, ...SITE, ...CLIENTS, ...REQ, stepsDone: 5, installed: true, trialStartedAt: Date.now() - 5 * HOUR, billing: { method: 'По счёту', actsEmail: 'buh@alfa-school.ru', topupInvoice: { no: `${new Date().getFullYear()}-0142`, at: Date.now() - HOUR, payer: null, amount: 12000 } } }), '/app/billing'],
  ['Счёт висит больше 3 дней', () => ({ ...PERSON, ...SITE, ...CLIENTS, ...REQ, stepsDone: 5, installed: true, trialStartedAt: Date.now() - 4 * 24 * HOUR, billing: { method: 'По счёту', actsEmail: 'buh@alfa-school.ru', topupInvoice: { no: `${new Date().getFullYear()}-0142`, at: Date.now() - 4 * 24 * HOUR, payer: null, amount: 12000 } } }), '/app/billing'],
  ['Оплачено', () => ({ ...PERSON, ...SITE, ...CLIENTS, ...REQ, stepsDone: 5, installed: true, trialStartedAt: Date.now() - 20 * HOUR, billing: { ...CARD, paidAt: Date.now() - HOUR, actsEmail: 'buh@alfa-school.ru', balance: 0, ops: [{ at: Date.now() - HOUR - 60000, kind: 'topup', amount: 12000, method: 'Картой' }, { at: Date.now() - HOUR, kind: 'debit', amount: 12000, site: 'alfa-school.ru' }] } }), '/app/site'],
  // Несколько сайтов — как у агента или партнёра (решения 23.09): у каждого
  // сайта свой тариф и своя дата продления, сайт, добавленный посреди года,
  // платит за свой год отдельно. Три сайта — демо-строки.
  ['Несколько сайтов (агент)', () => ({ ...PERSON, ...SITE, ...CLIENTS, ...REQ, stepsDone: 5, installed: true, trialStartedAt: Date.now() - 20 * HOUR, siteTariff: 'Тариф Х', billing: { ...CARD, paidAt: Date.now() - HOUR, actsEmail: 'buh@alfa-school.ru', invoiceSeq: 150, balance: 24000, ops: [{ at: Date.now() - 2 * DAY, kind: 'topup', amount: 60000, method: 'По счёту' }, { at: Date.now() - HOUR, kind: 'debit', amount: 12000, site: 'alfa-school.ru' }] }, extraSites: [
    { key: 'beta', domain: 'beta-kids.ru', company: 'ИП Иванова М. С.', tariff: 'Тариф У', trialStartedAt: Date.now() - 200 * DAY, paidAt: Date.now() - 195 * DAY, cancelled: false },
    { key: 'gamma', domain: 'gamma-shop.ru', company: 'ООО «Гамма»', tariff: 'Тариф Х', trialStartedAt: Date.now() - 120 * DAY, paidAt: Date.now() - 115 * DAY, cancelled: true },
    { key: 'delta', domain: 'delta-clinic.ru', company: 'ООО «Дельта»', tariff: 'Тариф Z', trialStartedAt: Date.now() - DAY, cancelled: false },
  ] }), '/app/billing'],
  ['Оплачено, автопродление выключено', () => ({ ...PERSON, ...SITE, ...CLIENTS, ...REQ, stepsDone: 5, installed: true, trialStartedAt: Date.now() - 20 * HOUR, billing: { ...CARD, paidAt: Date.now() - HOUR, cancelled: true, cancelledAt: Date.now() - 10 * 60 * 1000 } }), '/app/site'],
];

function readUi() {
  try {
    return JSON.parse(localStorage.getItem(UI_KEY) || '{}');
  } catch {
    return {};
  }
}
function writeUi(v) {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify(v));
  } catch {
    /* приватный режим — панель просто не запомнит положение */
  }
}

export default function MaketBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [preset, setPreset] = useState(null);

  useEffect(() => {
    const ui = readUi();
    setOpen(Boolean(ui.open));
    setHidden(Boolean(ui.hidden));
    setPreset(ui.preset ?? null);
  }, []);

  function toggle(v) {
    setOpen(v);
    writeUi({ ...readUi(), open: v });
  }

  // Пресет записывает анкету целиком и ведёт на экран, где это состояние
  // видно лучше всего. Куки-баннер лендинга в макете только мешает.
  function apply(i) {
    const [, make, to] = PRESETS[i];
    try {
      sessionStorage.setItem(KEY, JSON.stringify(make()));
      // Открытый сайт — снова основной: пресет задаёт состояние заново.
      sessionStorage.removeItem('current_site_v1');
      localStorage.setItem('consent_v1', 'accepted');
    } catch {
      /* без хранилища пресеты не работают — прототип тоже */
    }
    setPreset(i);
    writeUi({ ...readUi(), preset: i });
    // Полная перезагрузка, а не router.push: экраны читают анкету при
    // монтировании. Префикс пути (basePath на GitHub Pages) берём из адреса.
    const base = window.location.pathname.replace(/\/app(\/.*)?$/, '');
    window.location.assign(`${base}${to}/`);
  }

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => {
          setHidden(false);
          writeUi({ ...readUi(), hidden: false });
        }}
        className="fixed bottom-3 right-3 z-[60] h-3 w-3 rounded-full bg-brand/40 hover:bg-brand"
        aria-label="Показать панель макета"
        title="Показать панель макета"
      />
    );
  }

  const current = pathname?.replace(/\/$/, '') || '';

  return (
    <div className="fixed right-4 z-[60] font-sans" style={{ bottom: 'calc(16px + var(--cookie-banner-h, 0px) + var(--bottombar-h, 0px))' }}>
      {open ? (
        <div className="max-h-[calc(100vh-120px)] w-[300px] overflow-y-auto rounded-2xl border border-ink/10 bg-ink p-4 text-white shadow-2xl">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">Макет</p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => {
                  setHidden(true);
                  writeUi({ ...readUi(), hidden: true, open: false });
                }}
                className="rounded px-2 py-1 text-[11px] text-white/50 hover:text-white"
                title="Спрятать совсем — вернуть можно точкой в углу"
              >
                спрятать
              </button>
              <button type="button" onClick={() => toggle(false)} className="rounded px-2 py-1 text-[13px] text-white/60 hover:text-white" aria-label="Свернуть">
                ✕
              </button>
            </div>
          </div>

          <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">Состояние</p>
          <div className="space-y-1">
            {PRESETS.map(([label], i) => (
              <button
                key={label}
                type="button"
                onClick={() => apply(i)}
                className={`block w-full rounded-lg px-3 py-1.5 text-left text-[12.5px] transition ${
                  preset === i ? 'bg-brand font-semibold text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-4 text-white/40">Подставляет готовые ответы анкеты и открывает нужный экран.</p>

          {SCREENS.map(([group, items]) => (
            <div key={group}>
              <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">{group}</p>
              <div className="flex flex-wrap gap-1.5">
                {items.map(([label, href]) => (
                  <button
                    key={href}
                    type="button"
                    onClick={() => router.push(href)}
                    className={`rounded-lg border px-2.5 py-1 text-[12px] transition ${
                      current.endsWith(href) ? 'border-brand bg-brand text-white' : 'border-white/15 text-white/75 hover:border-white/40 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className="mt-3 text-[11px] leading-4 text-white/40">
            Экраны сайта и подписки без добавленного сайта уводят в «Мои сайты» — сначала выберите состояние.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => toggle(true)}
          className="rounded-full bg-ink px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white shadow-xl hover:bg-ink-2"
        >
          Макет
        </button>
      )}
    </div>
  );
}
