'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, InfoIcon } from '../../../../components/app/AppIcons';
import { CURRENT_USER } from '../../../../lib/appMock';
import { formatPhone, normalizePhone } from '../../../../lib/validate';
import { accountUser, loadAnketa } from './anketaState';
import { SidebarShell, TearMark, useBottomBar, usePopup } from '../../site/_shared/SiteChrome';

// Общий каркас всех шести шагов анкеты «Слеза Белый Сайт». Названия шагов
// согласованы отдельно: каждое описывает содержимое, не процесс
// («Настройка»/«Проверка» отклонены разбором за то, что не говорят, что внутри).
export const STEPS = ['Ваш профиль', 'О сайте', 'Данные клиентов', 'Реквизиты', 'Пакет документов', 'Установка'];

export const RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';

// Знак — тот же, что в кабинете и на входе: раньше анкета носила фонарик
// сканера, и переход «Мои сайты → анкета» выглядел как переход в другой сервис.
// После неудачного «Далее» — к первой ошибке: прокрутить и поставить фокус
// (разбор 24.09: на телефоне 4 из 5 ошибок оставались за экраном, а фокус —
// на «Далее»). Ошибка поля — само поле (у него aria-invalid); ошибка группы
// плиток — первая плитка группы перед сообщением; на экран — и начало группы,
// и сообщение под ней, а если длинный список не влезает (телефон) — само
// сообщение: иначе прокрутка к первой плитке снова прятала текст ошибки под
// списком. Ждём кадр: ошибки рисуются после setState.
export function focusFirstError() {
  setTimeout(() => {
    const root = document.querySelector('main') || document.body;
    const el = root.querySelector('[aria-invalid="true"], [role="alert"]');
    if (!el) return;
    let target = el;
    if (el.getAttribute('role') === 'alert') {
      const prev = el.previousElementSibling;
      const control = prev && (prev.matches('input, select, textarea, button') ? prev : prev.querySelector('input, select, textarea, button'));
      if (control) target = control;
      else el.setAttribute('tabindex', '-1');
    }
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (target !== el) {
      const top = el.previousElementSibling.getBoundingClientRect().top;
      const bottom = el.getBoundingClientRect().bottom;
      const room = window.innerHeight - 160; // шапка и нижняя панель на телефоне
      const y = bottom - top <= room ? top - (window.innerHeight - (bottom - top)) / 2 : bottom - window.innerHeight / 2;
      window.scrollTo({ top: window.scrollY + y, behavior });
    } else target.scrollIntoView({ block: 'center', behavior });
    target.focus({ preventScroll: true });
  }, 60);
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <TearMark />
      <span className="text-[17px] font-bold tracking-[-0.035em] text-ink">Слеза Белый Сайт</span>
    </div>
  );
}

export const STEP_URLS = ['profile', 'site', 'clients', 'requisites', 'documents', 'code'].map((x) => `/app/start/${x}`);

// Шаги открываются по мере прохождения — как степпер живого макета
// (решение 7 сентября): видны только те, до которых человек дошёл.
// Пройденный (с него ушли вперёд) — галочка; самый дальний открытый —
// без галочки, но кликабельный: он открыт, не сделан; будущих не видно.
// «Пройден» и «открыт сейчас» — разные состояния: активному шагу рано
// носить галочку, он ещё не заполнен.
export function StepList({ current, first = 0, onPick }) {
  const [reached, setReached] = useState(current);
  useEffect(() => setReached(Math.max(current, Math.min(loadAnketa().stepsDone || 0, STEPS.length - 1))), [current]);
  return (
    <div className="relative mt-4 pl-8">
      <div className="absolute left-[11px] top-0 h-full w-px bg-line" />
      {STEPS.slice(0, reached + 1).map((step, i) => {
        if (i < first) return null;
        const active = i === current;
        const done = i < reached && !active;
        return (
          <Link
            key={step}
            href={STEP_URLS[i]}
            onClick={() => onPick?.()}
            aria-current={active ? 'step' : undefined}
            className={`relative flex items-center gap-3 rounded-lg py-3 text-[14px] ${RING} ${
              active ? 'font-bold text-ink' : `font-bold text-ink/60 hover:text-ink`
            }`}
          >
            {done ? (
              <span className="z-10 flex h-5 w-5 items-center justify-center rounded-full bg-ok/10 text-ok ring-4 ring-white">
                <CheckIcon size={12} />
              </span>
            ) : active ? (
              <span className="z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 border-brand bg-white ring-4 ring-white">
                <span className="h-2 w-2 rounded-full bg-brand" />
              </span>
            ) : (
              /* Маркер в той же ширине 20px, что галочка и кольцо: иначе название
                 шага съезжало влево относительно соседних. */
              <span className="z-10 flex h-5 w-5 items-center justify-center">
                <span className="h-2.5 w-2.5 rounded-full border-2 border-line-2 bg-white ring-4 ring-white" />
              </span>
            )}
            {step}
          </Link>
        );
      })}
    </div>
  );
}

// Полоса прогресса над карточкой: пройденные шаги отмечены галочкой вместо
// номера — цифра у пройденного шага ничего не сообщает, галочка сообщает.
export function Progress({ current, first = 0 }) {
  return (
    <div className="mb-8 flex items-center gap-2 sm:gap-3" aria-label="Прогресс заполнения">
      {STEPS.map((step, i) => i >= first && (
        <div key={step} className="flex flex-1 items-center gap-2">
          <div className={`h-1.5 flex-1 rounded-full ${i <= current ? 'bg-brand' : 'bg-line'}`} />
          {i < current ? (
            <span
              aria-label="Шаг завершён"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ok/10 text-ok ring-1 ring-ok/20"
            >
              <CheckIcon size={14} />
            </span>
          ) : (
            <span className={`hidden text-[11px] font-bold xl:block ${i === current ? 'text-brand' : 'text-ink/60'}`}>
              {i + 1 - first}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// Сайдбар анкеты — тот же каркас, что у кабинета (SidebarShell): знак,
// «← Мои сайты», внизу «Поддержка» и аккаунт. Внутри — шаги подключения.
export function Sidebar({ current, first = 0, bottomBar }) {
  // Тот, кто представился на шаге 1, а не мок аккаунта: иначе в углу анкеты
  // стоял чужой человек, хотя имя и почту уже назвали.
  const [user, setUser] = useState(CURRENT_USER);
  useEffect(() => setUser(accountUser(CURRENT_USER)), [current]);
  return (
    <SidebarShell user={user} bottomBar={bottomBar}>
      <Link
        href="/app/sites"
        className={`mt-10 flex w-fit items-center gap-2 rounded text-sm font-semibold text-ink/60 transition hover:text-ink ${RING}`}
      >
        <ArrowLeftIcon size={16} /> Мои сайты
      </Link>
      <div className="mt-7 border-t border-line pt-6">
        <p className="mb-1 px-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink/60">Подключение сайта</p>
        <StepList current={current} first={first} />
      </div>
    </SidebarShell>
  );
}

// Панель анкеты на телефоне (живой макет, #funnelbar): «Назад», номер шага
// с листом шагов и «Далее». Кнопки не дублируют логику, а нажимают
// настоящие кнопки шага ([data-funnel-back] / [data-funnel-next]) — все
// проверки остаются единственными, в своих гейтах.
function FunnelBar({ current, first = 0, nextLabel }) {
  const [sheet, setSheet] = useState(false);
  const [done, setDone] = useState(0);
  const sheetBtn = useRef(null);
  const sheetRef = useRef(null);
  useBottomBar();
  usePopup(sheet, setSheet, sheetBtn, sheetRef, { menu: false });
  useEffect(() => setDone(loadAnketa().stepsDone || 0), [sheet]);
  const press = (sel) => document.querySelector(sel)?.click();
  const side = `flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold transition active:scale-95 ${RING}`;
  return (
    <>
      {sheet && <div className="fixed inset-0 z-40 bg-ink/20 lg:hidden" aria-hidden="true" onClick={() => setSheet(false)} />}
      {sheet && (
        <div ref={sheetRef} className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-50 rounded-2xl border border-line bg-white p-4 shadow-xl lg:hidden">
          <p className="px-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink/60">Шаги анкеты</p>
          <div className="-mt-2">
            <StepList current={current} first={first} onPick={() => setSheet(false)} />
          </div>
          <div className="my-2 h-px bg-line" />
          <Link href="/app/sites" className={`flex items-center gap-2 rounded-lg px-1 py-2 text-sm font-semibold text-ink/60 hover:text-ink ${RING}`}>
            <ArrowLeftIcon size={16} /> Мои сайты
          </Link>
        </div>
      )}
      <nav
        aria-label="Анкета"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="h-1 bg-line">
          <div className="h-full bg-brand transition-all" style={{ width: `${((current - first + (done > current ? 1 : 0)) / (STEPS.length - first)) * 100}%` }} />
        </div>
        <div className="flex items-stretch px-2">
          <button type="button" onClick={() => press('[data-funnel-back]')} className={`${side} text-ink/60`}>
            <ArrowLeftIcon size={18} />
            Назад
          </button>
          <button ref={sheetBtn} type="button" onClick={() => setSheet(!sheet)} aria-expanded={sheet} className={`${side} text-ink/70`}>
            {/* Без цифры: номер шага уже стоит над заголовком экрана, здесь его
                заменяет полоса прогресса — дублировать незачем (правка владельца). */}
            <span className="flex h-8 w-12 items-center justify-center rounded-full bg-ink text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M9 6h11M9 12h11M9 18h11" />
                <circle cx="4.5" cy="6" r="1" fill="currentColor" />
                <circle cx="4.5" cy="12" r="1" fill="currentColor" />
                <circle cx="4.5" cy="18" r="1" fill="currentColor" />
              </svg>
            </span>
            Шаги
          </button>
          <button type="button" onClick={() => press('[data-funnel-next]')} className={`${side} text-brand`}>
            <ArrowRightIcon size={18} />
            {nextLabel}
          </button>
        </div>
      </nav>
    </>
  );
}

// Каркас шага анкеты: сайдбар, шапка (номер шага, заголовок, лид) и полоса
// прогресса — одни на все шесть шагов. Раньше шапка копировалась в каждый
// шаг и разошлась: плашки «Защищённая форма» / «Почти готово», разные
// отступы. Заголовок — той же ступени, что в кабинете (28/36).
// Второй и следующие сайты — без «Вашего профиля»: это вопрос аккаунта, он
// уже пройден, и анкета начинается с «О сайте», шкала — «из 5» (живой макет,
// FUNNEL_ALL.skipIf). Признак skipProfile ставит «Добавить сайт».
export function useFirstStep() {
  const [first, setFirst] = useState(0);
  useEffect(() => setFirst(loadAnketa().skipProfile ? 1 : 0), []);
  return first;
}

export function AnketaFrame({ current, title, lead, nextLabel = 'Далее', children }) {
  const first = useFirstStep();
  return (
    <div className="min-h-screen bg-warm text-ink lg:flex">
      <Sidebar current={current} first={first} bottomBar={<FunnelBar current={current} first={first} nextLabel={nextLabel} />} />
      <main id="content" tabIndex={-1} className="min-w-0 flex-1 outline-none">
        <div className="mx-auto max-w-[1000px] px-5 py-8 sm:px-8 sm:py-10 lg:px-14 lg:py-12">
          <header className="mb-8">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-brand">
              Шаг {current + 1 - first} из {STEPS.length - first}
            </p>
            <h1 className="text-[28px] font-bold tracking-[-0.045em] sm:text-[36px]">{title}</h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-6 text-ink/60">{lead}</p>
          </header>
          <div className="hidden sm:block">
            <Progress current={current} first={first} />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

// Иконка слева, подпись сверху, бейдж справа от подписи (для «подставим из
// реестра»). Ошибка — под полем, красной рамкой и текстом одновременно:
// цвет никогда не единственный сигнал.
export function Field({ label, required, placeholder, icon: Icon, badge, className = '', error, inputRef, ...rest }) {
  return (
    <label className={`block ${className}`}>
      {/* Без подписи — когда вопрос назван заголовком блока (SectionHead), а
          поле связано с ним через aria-labelledby. */}
      {(label || badge) && (
        <span className="mb-2 flex items-center justify-between gap-3 text-[13px] font-bold text-ink-2">
          <span>
            {label}
            {required && <span className="text-brand"> *</span>}
          </span>
          {badge && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/[0.08] px-2.5 py-1 text-[11px] font-bold text-brand">
              {badge}
            </span>
          )}
        </span>
      )}
      <span className="relative block">
        {Icon && <Icon size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" />}
        <input
          ref={inputRef}
          placeholder={placeholder}
          aria-invalid={error ? 'true' : undefined}
          className={`h-[52px] w-full rounded-xl border bg-white pr-4 text-[15px] font-medium text-ink shadow-sm outline-none transition-all placeholder:text-ink/35 hover:border-line-2 focus:border-brand focus:ring-4 focus:ring-brand/10 ${
            error ? 'border-danger' : 'border-line'
          } ${Icon ? 'pl-11' : 'pl-4'}`}
          {...rest}
        />
      </span>
      {error && (
        <span role="alert" className="mt-1.5 block text-[12px] font-semibold text-danger">
          {error}
        </span>
      )}
    </label>
  );
}

// Телефон — одна маска на весь кабинет (правка владельца 23.09): +7 встаёт
// сам, как в образце, номер оформляется по нему же и обрывается на 11 цифрах
// — считать цифры не нужно. «8 916…» по привычке тоже даёт верный номер.
// Пустое поле остаётся пустым: одинокое «+7» при уходе из поля стирается.
export function PhoneField({ value, onValue, label = 'Телефон', ...rest }) {
  return (
    <Field
      label={label}
      placeholder="+7 (___) ___-__-__"
      inputMode="tel"
      autoComplete="tel"
      {...rest}
      value={value}
      onFocus={(e) => {
        if (value) return;
        const el = e.target;
        onValue('+7 ');
        // курсор — за «+7 », иначе клик в начало поля ставил цифры перед кодом;
        // только пока ничего не набрано, чтобы не сдвинуть уже введённое
        requestAnimationFrame(() => {
          if (el.value === '+7 ') el.setSelectionRange(3, 3);
        });
      }}
      onChange={(e) => {
        const raw = e.target.value;
        const d = raw.replace(/\D/g, '');
        if (!d) return onValue('');
        // В поле был только «+7»: что бы ни набрали и где бы ни стоял курсор
        // (клик в начало поля оставлял его перед «+7»), это начало номера,
        // а семёрка — наш код страны. Иначе «9» перед «+7» давала +7 (97…).
        if (normalizePhone(value) === '7') {
          const k = d.indexOf('7');
          return onValue(formatPhone(`+7 ${k >= 0 ? d.slice(0, k) + d.slice(k + 1) : d}`));
        }
        onValue(formatPhone(raw));
      }}
      onBlur={() => {
        if (normalizePhone(value).length <= 1) onValue('');
      }}
    />
  );
}

// Сегмент «выбери один» со скользящей подложкой. value === null — ничего не
// выбрано: правило анкеты, выбор делает клиент, а не мы, и подложка в этом
// состоянии не показывается вовсе.
export function Segmented({ options, value, onChange, ariaLabelledby }) {
  const index = options.indexOf(value);
  return (
    <div className="flex max-w-[560px] rounded-xl bg-warm p-1" role="group" aria-labelledby={ariaLabelledby}>
      <div className="relative flex w-full">
        {index >= 0 && (
          <div
            className="absolute bottom-0 top-0 rounded-lg bg-brand shadow-sm transition-all duration-300"
            style={{ width: `${100 / options.length}%`, left: `${index * (100 / options.length)}%` }}
          />
        )}
        {options.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-pressed={value === item}
            className={`relative z-10 flex-1 rounded-lg px-3 py-3 text-sm font-bold transition-colors ${RING} ${
              // Невыбранный — не блёклый: на .55 он читался как «выключено»,
              // хотя ответа как раз ждут (макет поднял до .82).
              value === item ? 'text-white' : 'text-ink/80 hover:text-ink'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

// Шапка блока внутри карточки: иконка в квадрате, заголовок, подпись и —
// как у SectionHead — «Зачем это нужно» справа, объяснение под шапкой.
// Раньше у блоков «Реквизитов» разворот стоял внизу, под полями, а у
// вопросов шагов 2–3 — в шапке: один элемент в двух местах.
// Без строки-пояснения под заголовком — ни здесь, ни в SectionHead (владелец
// 23.09): она стояла у одних вопросов и не стояла у других, и шаг читался
// рваным. Заголовок понятен сам, объяснение — только в «Зачем это нужно».
export function BlockHead({ id, icon: Icon, title, why, whyOpen, onWhy }) {
  return (
    <div>
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between sm:gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/[0.08] text-brand">
            <Icon size={18} />
          </span>
          <div>
            <h2 id={id} className="text-lg font-bold tracking-tight">
              {title}
            </h2>
          </div>
        </div>
        {why && <WhyButton open={whyOpen} onClick={onWhy} />}
      </div>
      {why && whyOpen && <WhyPanel>{why}</WhyPanel>}
    </div>
  );
}

// Один вид «Зачем это нужно» на всю анкету: синяя строка с иконкой «i».
export function WhyButton({ open, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={`-my-1 flex min-h-6 shrink-0 items-center gap-1 rounded py-1 text-xs font-semibold text-brand transition-colors hover:text-ink ${RING}`}
    >
      <InfoIcon size={14} /> Зачем это нужно
    </button>
  );
}

function WhyPanel({ children }) {
  return <p className="mt-3 max-w-2xl rounded-xl bg-warm px-4 py-3 text-[13px] leading-5 text-ink/60">{children}</p>;
}

// Карточка-переключатель: одиночный выбор или множественный — решает
// вызывающий код через onClick, Tile только рисует. compact — для коротких
// пунктов без пояснения, чтобы не растягивать плитку пустотой.
// radio — выбор ровно одного: круглая отметка, как у роли на шаге 1.
// Квадратная галочка на одиночном выборе — то самое «радиобаттон намешан с
// чекбоксом» из ревью Ивана (п.9).
export function Tile({ title, description, selected, onClick, compact = false, radio = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      // Множественный выбор — чекбокс для экранного диктора, одиночный —
      // radio (разбор 25.09: плитки читались как безымянные кнопки).
      role={radio ? 'radio' : 'checkbox'}
      aria-checked={selected}
      className={`flex gap-3 rounded-xl border p-4 text-left transition-all ${RING} ${
        compact ? 'min-h-[58px] items-center' : 'min-h-[78px] items-start'
      } ${selected ? 'border-brand bg-brand/[0.05] ring-2 ring-brand/10' : 'border-line bg-white hover:border-line-2 hover:bg-warm'}`}
    >
      {/* Одна отметка на все карточки анкеты — квадрат с галочкой, и у выбора
          одного варианта тоже (владелец 23.09): круглая у платформы и роли
          рядом с квадратными читалась как расхождение. Что вариант один,
          говорит поведение и role="radio" для экранного диктора. */}
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${compact ? '' : 'mt-0.5'} ${
          selected ? 'border-brand bg-brand' : 'border-line-2 bg-white'
        }`}
      >
        {selected && <CheckIcon size={13} className="text-white" />}
      </span>
      <span>
        <span className="block text-sm font-bold text-ink">{title}</span>
        {description && <span className="mt-1 block text-xs leading-4 text-ink/60">{description}</span>}
      </span>
    </button>
  );
}

// Шапка вопроса: заголовок и подпись слева, «Зачем это нужно» справа.
// Объяснение раскрывается под шапкой — кнопка отвечает на вопрос, который
// человек задаёт именно здесь, а не уводит его в конец карточки.
// На телефоне «Зачем» всегда под заголовком, с sm — справа: рядом с
// заголовком на узком экране он ломал короткие заголовки на две строки
// («Платформа / сайта»), а «то справа, то снизу» смотрелось разнобоем.
export function SectionHead({ id, title, required, whyOpen, onWhy, why }) {
  return (
    <div>
      <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:justify-between sm:gap-4">
        <div>
          <h2 id={id} className="text-xl font-bold tracking-[-0.02em]">
            {title}
            {required && <span className="whitespace-nowrap text-brand"> *</span>}
          </h2>
        </div>
        {why && <WhyButton open={whyOpen} onClick={onWhy} />}
      </div>
      {why && whyOpen && <WhyPanel>{why}</WhyPanel>}
    </div>
  );
}
