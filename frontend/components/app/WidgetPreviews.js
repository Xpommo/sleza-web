'use client';

// Превью виджета — куки-баннер и подвал — в одном месте для шага 5
// анкеты и раздела «Виджет». Раньше это были две разные копии, и одна и та
// же тема на шаге 5 показывалась тёмной, а в кабинете — светлой. Подвал у
// клиента один: показывать его в двух видах на разных страницах значило бы
// врать (решение макета). Тема хранится в анкете — widgetSettings().

import { useState } from 'react';
import { CloseIcon, ShieldCheckIcon, LockIcon } from './AppIcons';
import { CLOSE_BTN } from './Button';

const RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';

// Пять тонов виджета — из макета Ивана «Виджет и реестр документов» (владелец
// 30.09): между чёрным и белым у сайтов весь диапазон серого, и подвал, который
// не попал в тон футера, читается как чужая вставка. «Авто» (по теме браузера
// посетителя) снято: подвал подбирают под сайт, а не под посетителя.
// Цвета — дословно из макета; тема одна и та же для баннера, подвала и реестра.
export const SKINS = {
  Чернила: { bg: '#111111', text: '#F2F2F0', muted: '#C9C7D6', line: '#32323C', accent: '#8FA2FF', accentSoft: '#1C2440', hover: '#1B1B22' },
  Графит: { bg: '#2B2E36', text: '#FFFFFF', muted: '#CFD2DA', line: '#474B57', accent: '#9AA6F7', accentSoft: '#2A3350', hover: '#353942' },
  Туман: { bg: '#F4F4F2', text: '#111111', muted: '#4A4A4A', line: '#D5D5D0', accent: '#2A3BF0', accentSoft: '#E6E8FE', hover: '#E9E9E5' },
  Бумага: { bg: '#FFFFFF', text: '#111111', muted: '#333333', line: '#D5D5D0', accent: '#2A3BF0', accentSoft: '#E6E8FE', hover: '#F4F4F2' },
  Вода: { bg: '#F7FAFE', text: '#111111', muted: '#37405A', line: '#C3D2F0', accent: '#2A3BF0', accentSoft: '#E2E9FA', hover: '#EAF0FB' },
};
export const THEMES = Object.keys(SKINS);
export const WIDGET_DEFAULTS = { bannerTheme: 'Чернила', footerTheme: 'Чернила', bannerOn: true, footerOn: true };
// Анкеты, сохранённые до 30.09, помнят прежние три темы.
const LEGACY = { Светлая: 'Бумага', Тёмная: 'Чернила', Авто: 'Чернила' };
const skinName = (t) => (SKINS[t] ? t : LEGACY[t] || WIDGET_DEFAULTS.footerTheme);

export function widgetSettings(a) {
  const w = { ...WIDGET_DEFAULTS, ...(a.widget || {}) };
  return { ...w, bannerTheme: skinName(w.bannerTheme), footerTheme: skinName(w.footerTheme) };
}

// Цвета темы — CSS-переменными на контейнере превью, классы читают их
// (bg-[color:var(--w-bg)] и т.д.): одна разметка на все пять тонов.
// Та же тема — у страницы документов (app/app/public), как у Ивана.
export function skinStyle(theme) {
  const k = SKINS[skinName(theme)];
  const style = { '--w-bg': k.bg, '--w-text': k.text, '--w-muted': k.muted, '--w-line': k.line, '--w-accent': k.accent, '--w-accent-soft': k.accentSoft, '--w-hover': k.hover };
  // «Вода» — не заливка: почти белый фон и мягкие пятна за содержимым (у Ивана
  // они медленно движутся; в превью — статично).
  if (skinName(theme) === 'Вода') {
    style.backgroundImage = 'radial-gradient(60% 120% at 8% 0%, #E4EFF6 0%, rgba(228,239,246,0) 70%), radial-gradient(50% 120% at 95% 100%, #EAF0FB 0%, rgba(234,240,251,0) 70%)';
  }
  return style;
}

// Выбор тона — сегменты с цветовой пробой (квадратик перед подписью, как у
// Ивана). Пять вариантов не помещаются в строку на телефоне — ряд переносится.
export function ThemeSwitch({ value, onChange, labelledby }) {
  return (
    <div role="group" aria-labelledby={labelledby} className="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-warm p-1 max-sm:gap-y-2">
      {THEMES.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          aria-pressed={value === t}
          className={`tap flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold transition ${RING} ${
            value === t ? 'bg-white text-ink shadow-sm' : 'text-ink/70 hover:text-ink'
          }`}
        >
          <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 rounded-[4px] ring-1 ring-inset ring-ink/15" style={{ background: SKINS[t].bg }} />
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
      className={`tap relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${RING} ${
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
export function CookieBannerPreview({ theme }) {
  return (
    <div className="rounded-xl border border-line-2 bg-paper p-4">
      <div
        style={skinStyle(theme)}
        className="flex flex-col gap-4 rounded-xl border border-[color:var(--w-line)] bg-[color:var(--w-bg)] p-5 text-[color:var(--w-text)] transition-colors duration-300 motion-reduce:transition-none sm:flex-row sm:items-center"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--w-accent-soft)] text-[color:var(--w-accent)]">
          <ShieldCheckIcon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Сайт использует куки</p>
          <p className="mt-1.5 text-[12px] leading-4 text-[color:var(--w-muted)]">
            Нужны для аналитики и корректной работы сервисов на сайте. Нажимая «Принять и продолжить», вы соглашаетесь с
            условиями обработки куки. Отключить их можно в настройках браузера.
          </p>
          <p className="mt-2 text-[11px] text-[color:var(--w-muted)]">Политика обработки куки →</p>
        </div>
        <span className="shrink-0 rounded-lg bg-[color:var(--w-text)] px-4 py-2.5 text-center text-xs font-bold text-[color:var(--w-bg)]">
          Принять и продолжить
        </span>
      </div>
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
// Доп. реквизит по сфере (владелец 30.09, как у Ивана): лицензия, свидетельство
// СМИ, ИТ-аккредитация, реестр ПО — из ответов шага 4, в подвале перед
// «Реквизитами». У СМИ не лицензия, а свидетельство о регистрации (23.09).
const LICENSE_KIND = {
  medicine: 'Лицензия на медицинскую деятельность',
  school: 'Лицензия на образовательную деятельность',
  kids: 'Лицензия на образовательную деятельность',
};
const has = (v) => v === 'Есть' || v === 'Да';
export function footerExtra(a = {}) {
  const out = [];
  if (a.license && has(a.license.has)) out.push(`${LICENSE_KIND[a.sphere] || 'Лицензия'}${a.license.no ? ` № ${a.license.no}` : ''}`);
  if (a.mediaReg && has(a.mediaReg.has)) out.push(`Свидетельство о регистрации СМИ${a.mediaReg.no ? ` ${a.mediaReg.no}` : ''}`);
  if (has(a.itAccred)) out.push(`ИТ-аккредитация${a.itAccredNo ? ` № ${a.itAccredNo}` : ''}`);
  if (has(a.softRegistry)) out.push(`Реестр российского ПО${a.softRegistryNo ? ` № ${a.softRegistryNo}` : ''}`);
  return out;
}

export function FooterPreview({ theme, extra = [] }) {
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
        style={skinStyle(theme)}
        className="flex flex-wrap items-center gap-x-3 gap-y-2 max-sm:gap-y-3 rounded-xl border border-[color:var(--w-line)] bg-[color:var(--w-bg)] px-4 py-3 text-[color:var(--w-text)] transition-colors duration-300 motion-reduce:transition-none"
      >
        {/* Без нашего знака и имени (владелец 25.09): подвал принадлежит сайту
            клиента, «Слеза» в нём читалась как реклама за его деньги. */}
        {PILLS.map((pill) => (
          <button
            key={pill.id}
            type="button"
            onClick={() => setOpen(open === pill.id ? null : pill.id)}
            aria-expanded={open === pill.id}
            className={`tap flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${RING} ${
              open === pill.id
                ? 'border-[color:var(--w-accent)] bg-[color:var(--w-accent-soft)] text-[color:var(--w-accent)]'
                : 'border-[color:var(--w-line)] text-[color:var(--w-muted)] hover:bg-[color:var(--w-hover)] hover:text-[color:var(--w-text)]'
            }`}
          >
            {pill.label}
            {/* Без замочков (два разбора подряд: посетителю они ничего не
                говорят); что «Куки» и «Маркировку» не отключить, владелец
                читает в «Виджете». */}
          </button>
        ))}
        {/* Доп. реквизит и «Реквизиты» — одной группой через точку, как «Оферта ·
            Реквизиты» у Ивана: при переносе строки не остаётся висящей черты. */}
        {/* На телефоне — столбиком без точек: при переносе точка вставала в начало
            строки. Номер («№ Л035-01298-77/00123456») не разрывается посередине. */}
        <span className="flex w-full min-w-0 flex-col items-start gap-1 text-[12px] leading-4 text-[color:var(--w-muted)] sm:ml-auto sm:w-auto sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-end sm:gap-x-2 sm:text-right">
          {extra.map((x) => {
            const [label, no] = x.split(/ (?=№ )/);
            return (
              <span key={x} className="contents">
                <span className="min-w-0">
                  {label}
                  {no && <span className="whitespace-nowrap"> {no}</span>}
                </span>
                <span aria-hidden="true" className="hidden opacity-50 sm:inline">·</span>
              </span>
            );
          })}
          <span className="font-semibold">Реквизиты</span>
        </span>
      </div>

      {open &&
        PILLS.filter((p) => p.id === open).map((pill) => {
          const isMarketing = pill.id === 'marketing';
          const checked = isMarketing ? marketingOn : pdOn;
          return (
            <div key={pill.id} className="mt-3 rounded-xl border border-line bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="font-mono text-[11px] text-ink/60">{pill.meta}</p>
                <button type="button" onClick={() => setOpen(null)} className={CLOSE_BTN} aria-label="Закрыть">
                  <CloseIcon size={16} />
                </button>
              </div>
              <p className="mt-1 text-[15px] font-bold">{pill.title}</p>
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
    </div>
  );
}
