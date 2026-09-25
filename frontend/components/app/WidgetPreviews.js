'use client';

// Превью виджета — куки-баннер и подвал — в одном месте для шага 5
// анкеты и раздела «Виджет». Раньше это были две разные копии, и одна и та
// же тема на шаге 5 показывалась тёмной, а в кабинете — светлой. Подвал у
// клиента один: показывать его в двух видах на разных страницах значило бы
// врать (решение макета). Тема хранится в анкете — widgetSettings().

import { useState } from 'react';
import { CloseIcon, ShieldCheckIcon, LockIcon } from './AppIcons';

const RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';

export const THEMES = ['Светлая', 'Тёмная', 'Авто'];
export const WIDGET_DEFAULTS = { bannerTheme: 'Авто', footerTheme: 'Авто', bannerOn: true, footerOn: true };

export function widgetSettings(a) {
  return { ...WIDGET_DEFAULTS, ...(a.widget || {}) };
}

// «Авто» не имеет одного вида — он зависит от темы браузера посетителя.
// Поэтому показываем тёмный вариант и говорим об этом словами, а не рисуем
// додуманную картинку.
const isDark = (theme) => theme !== 'Светлая';

export function ThemeNote({ theme }) {
  if (theme !== 'Авто') return null;
  return <p className="mt-3 text-[12px] text-ink/60">Подстроится под тему браузера посетителя. Здесь показан тёмный вариант.</p>;
}

export function ThemeSwitch({ value, onChange, labelledby }) {
  return (
    <div role="group" aria-labelledby={labelledby} className="inline-flex rounded-xl border border-line bg-warm p-1">
      {THEMES.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          aria-pressed={value === t}
          className={`w-[86px] rounded-lg py-2 text-[13px] font-semibold transition ${RING} ${
            value === t ? 'bg-white text-ink shadow-sm' : 'text-ink/70 hover:text-ink'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${RING} ${
        // Выключенный — с рамкой: светлый трек на белом давал 1.44:1 (аудит 24.09).
        checked ? 'bg-brand' : 'bg-line-2 ring-1 ring-inset ring-ink/50'
      }`}
    >
      <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

// Баннер информационный: кнопки «Отклонить» в нём нет намеренно —
// 152-ФЗ не требует отказа для простого уведомления, и обещать управление,
// которого нет, нельзя. Текст — дословно реальный виджет.
export function CookieBannerPreview({ theme, note = true }) {
  const dark = isDark(theme);
  return (
    <div className="rounded-xl border border-line-2 bg-paper p-4">
      <div
        className={`flex flex-col gap-4 rounded-xl p-5 transition-colors duration-300 motion-reduce:transition-none sm:flex-row sm:items-center ${
          dark ? 'bg-ink text-white' : 'border border-line bg-white text-ink'
        }`}
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${dark ? 'bg-white/10 text-white' : 'bg-brand/[0.08] text-brand'}`}>
          <ShieldCheckIcon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold">Сайт использует куки</h4>
          <p className={`mt-1.5 text-[12px] leading-4 ${dark ? 'text-white/70' : 'text-ink/60'}`}>
            Нужны для аналитики и корректной работы сервисов на сайте. Нажимая «Принять и продолжить», вы соглашаетесь с
            условиями обработки куки. Отключить их можно в настройках браузера.
          </p>
          <p className={`mt-2 text-[11px] ${dark ? 'text-white/50' : 'text-ink/60'}`}>Политика обработки куки →</p>
        </div>
        <span className={`shrink-0 rounded-lg px-4 py-2.5 text-center text-xs font-bold ${dark ? 'bg-white text-ink' : 'bg-ink text-white'}`}>
          Принять и продолжить
        </span>
      </div>
      {note && <ThemeNote theme={theme} />}
    </div>
  );
}

// Пилюли подвала. Куки и маркировка заперты: согласие на куки уже дано
// в баннере, маркировка обязательна по закону — тумблера там быть не может.
const PILLS = [
  {
    id: 'cookie',
    label: 'Куки',
    locked: true,
    meta: '152-ФЗ, ст.3, 6, 9',
    title: 'Обработка куки',
    body: 'Сайт использует файлы куки для аналитики и корректной работы сервисов. Согласие вы уже дали в баннере при заходе на сайт, поэтому отдельно отключить его здесь нельзя. Состав собираемых данных и цели описаны в политике ниже.',
    lockNote: 'Обязательное согласие уже подтверждено',
    links: ['Политика обработки куки →'],
  },
  {
    id: 'pd',
    label: 'Персональные данные',
    meta: '152-ФЗ, ст.9',
    title: 'Согласие на обработку персональных данных',
    body: 'Разрешает сайту обрабатывать данные, которые вы оставляете в формах: имя, телефон, email. Действует сразу на все формы сайта: если включить здесь, включится везде, и наоборот.',
    toggle: true,
    links: ['Политика обработки персональных данных →', 'Согласие на обработку персональных данных →'],
  },
  {
    id: 'marketing',
    label: 'Реклама',
    meta: 'ч.1 ст.18 №38-ФЗ «О рекламе» · ч.4.1 ст.14.3 КоАП',
    title: 'Согласие на получение рекламных сообщений',
    body: 'Разрешает присылать вам рекламные сообщения: письма, сообщения в мессенджерах и звонки.',
    hint: 'Сначала включите согласие на персональные данные: без него рассылка недоступна.',
    toggle: true,
    links: ['Согласие на получение рекламных сообщений →'],
  },
  {
    id: 'marking',
    label: 'Маркировка',
    locked: true,
    meta: 'реестры Минюста и Росфинмониторинга',
    title: 'Маркировка',
    body: 'На сайте автоматически отмечены упоминания лиц и организаций из реестров (иностранные агенты, экстремистские и террористические организации), а также упоминания наркотических веществ.',
    lockNote: 'Обязательно по закону',
  },
];

// Подвал — живой: пилюли открывают то же, что увидит посетитель.
// Реклама не включается без согласия на ПДн: рассылать письма человеку,
// который не разрешил обрабатывать свои данные, нельзя.
export function FooterPreview({ theme, note = true }) {
  const dark = isDark(theme);
  const [open, setOpen] = useState(null);
  const [pdOn, setPdOn] = useState(false);
  const [marketingOn, setMarketingOn] = useState(false);

  function togglePd() {
    const next = !pdOn;
    setPdOn(next);
    if (!next) setMarketingOn(false);
  }

  return (
    <div className="rounded-xl border border-line-2 bg-paper p-4">
      <div
        className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-4 py-3 transition-colors duration-300 motion-reduce:transition-none ${
          dark ? 'bg-ink text-white' : 'border border-line bg-white text-ink'
        }`}
      >
        {/* Без нашего знака и имени (владелец 25.09): подвал принадлежит сайту
            клиента, «Слеза» в нём читалась как реклама за его деньги. */}
        {PILLS.map((pill) => (
          <button
            key={pill.id}
            type="button"
            onClick={() => setOpen(open === pill.id ? null : pill.id)}
            aria-expanded={open === pill.id}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${RING} ${
              dark
                ? open === pill.id ? 'border-white/60 bg-white/15 text-white' : 'border-white/20 text-white/80 hover:text-white'
                : open === pill.id ? 'border-brand bg-brand/[0.06] text-brand' : 'border-line text-ink/65 hover:text-ink'
            }`}
          >
            {pill.label}
            {/* Без замочков (два разбора подряд: посетителю они ничего не
                говорят); что «Куки» и «Маркировку» не отключить, владелец
                читает в «Виджете». */}
          </button>
        ))}
        <span className={`ml-auto text-[12px] font-semibold ${dark ? 'text-white/70' : 'text-ink/60'}`}>Реквизиты</span>
      </div>

      {open &&
        PILLS.filter((p) => p.id === open).map((pill) => {
          const isMarketing = pill.id === 'marketing';
          const checked = isMarketing ? marketingOn : pdOn;
          return (
            <div key={pill.id} className="mt-3 rounded-xl border border-line bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.09em] text-ink/60">{pill.meta}</p>
                <button type="button" onClick={() => setOpen(null)} className={`-m-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink/60 transition hover:bg-warm hover:text-ink ${RING}`} aria-label="Закрыть">
                  <CloseIcon size={16} />
                </button>
              </div>
              <h4 className="mt-1 text-[15px] font-bold">{pill.title}</h4>
              <p className="mt-2 text-[13px] leading-5 text-ink/60">{pill.body}</p>
              {isMarketing && !pdOn && <p className="mt-3 rounded-lg bg-warn/10 px-3 py-2 text-[12px] text-ink/70">{pill.hint}</p>}
              {pill.toggle && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-warm px-3 py-2.5">
                  <span className="text-[13px] font-semibold">Моё согласие</span>
                  <Switch
                    checked={checked}
                    disabled={isMarketing && !pdOn}
                    label={pill.title}
                    onChange={() => (isMarketing ? setMarketingOn(!marketingOn) : togglePd())}
                  />
                </div>
              )}
              {pill.lockNote && (
                <p className="mt-3 flex items-center gap-2 rounded-lg bg-warm px-3 py-2.5 text-[12px] font-semibold text-ink/60"><LockIcon size={14} className="shrink-0" /> {pill.lockNote}</p>
              )}
              {pill.links && (
                <div className="mt-3 flex flex-col gap-1.5">
                  {pill.links.map((l) => (
                    <span key={l} className="text-[12px] font-semibold text-brand">
                      {l}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      {note && <ThemeNote theme={theme} />}
    </div>
  );
}
