'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, InfoIcon } from '../../../../components/app/AppIcons';
import { CURRENT_USER } from '../../../../lib/appMock';
import { accountUser, loadAnketa } from './anketaState';
import { SidebarShell, TearMark, useBottomBar } from '../../site/_shared/SiteChrome';

// Общий каркас всех шести шагов анкеты «Слеза Белый Сайт». Названия шагов
// согласованы отдельно: каждое описывает содержимое, не процесс
// («Настройка»/«Проверка» отклонены разбором за то, что не говорят, что внутри).
export const STEPS = ['Ваш профиль', 'О сайте', 'Данные клиентов', 'Реквизиты', 'Пакет документов', 'Установка'];

export const RING = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 focus-visible:border-brand';

// Знак — тот же, что в кабинете и на входе: раньше анкета носила фонарик
// сканера, и переход «Мои сайты → анкета» выглядел как переход в другой сервис.
export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <TearMark />
      <span className="text-[17px] font-bold tracking-[-0.035em] text-ink">Слеза Белый Сайт</span>
    </div>
  );
}

export const STEP_URLS = ['profile', 'site', 'clients', 'requisites', 'documents', 'code'].map((x) => `/app/start/${x}`);

// current — индекс активного шага. Пройденные — зелёная галочка, активный —
// кольцо, остальные — предстоящие. «Пройден» и «открыт сейчас» намеренно
// разные состояния: активному шагу рано носить галочку, он ещё не заполнен.
export function StepList({ current, onPick }) {
  return (
    <div className="relative mt-4 pl-8">
      <div className="absolute left-[11px] top-0 h-full w-px bg-line" />
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          // Пройденный шаг — ссылка: вернуться и поправить ответ. Будущий —
          // нет: перепрыгнуть через незаполненную анкету нельзя (макет).
          <Link
            key={step}
            href={STEP_URLS[i]}
            onClick={(e) => {
              if (!done) e.preventDefault();
              else onPick?.();
            }}
            aria-disabled={!done && !active}
            aria-current={active ? 'step' : undefined}
            tabIndex={done ? undefined : -1}
            className={`relative flex items-center gap-3 rounded-lg py-3 text-[14px] ${RING} ${
              active ? 'font-bold text-ink' : done ? 'font-bold text-ink/60 hover:text-ink' : 'pointer-events-none font-medium text-ink/35'
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
              <span className="z-10 h-2.5 w-2.5 rounded-full border-2 border-line-2 bg-white" />
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
export function Progress({ current }) {
  return (
    <div className="mb-8 flex items-center gap-2 sm:gap-3" aria-label="Прогресс заполнения">
      {STEPS.map((step, i) => (
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
            <span className={`hidden text-[11px] font-bold xl:block ${i === current ? 'text-brand' : 'text-ink/35'}`}>
              {i + 1}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// Сайдбар анкеты — тот же каркас, что у кабинета (SidebarShell): знак,
// «← Мои сайты», внизу «Поддержка» и аккаунт. Внутри — шаги подключения.
export function Sidebar({ current, bottomBar }) {
  // Тот, кто представился на шаге 1, а не мок аккаунта: иначе в углу анкеты
  // стоял чужой человек, хотя имя и почту уже назвали.
  const [user, setUser] = useState(CURRENT_USER);
  useEffect(() => setUser(accountUser(CURRENT_USER)), [current]);
  return (
    <SidebarShell user={user} bottomBar={bottomBar}>
      <Link
        href="/app/sites"
        className={`mt-10 flex w-fit items-center gap-2 rounded text-sm font-semibold text-ink/55 transition hover:text-ink ${RING}`}
      >
        <ArrowLeftIcon size={16} /> Мои сайты
      </Link>
      <div className="mt-7 border-t border-line pt-6">
        <p className="mb-1 px-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink/45">Подключение сайта</p>
        <StepList current={current} />
      </div>
    </SidebarShell>
  );
}

// Панель анкеты на телефоне (живой макет, #funnelbar): «Назад», номер шага
// с листом шагов и «Далее». Кнопки не дублируют логику, а нажимают
// настоящие кнопки шага ([data-funnel-back] / [data-funnel-next]) — все
// проверки остаются единственными, в своих гейтах.
function FunnelBar({ current, nextLabel }) {
  const [sheet, setSheet] = useState(false);
  const [done, setDone] = useState(0);
  useBottomBar();
  useEffect(() => setDone(loadAnketa().stepsDone || 0), [sheet]);
  const press = (sel) => document.querySelector(sel)?.click();
  const side = `flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold transition active:scale-95 ${RING}`;
  return (
    <>
      {sheet && <div className="fixed inset-0 z-40 bg-ink/20 lg:hidden" aria-hidden="true" onClick={() => setSheet(false)} />}
      {sheet && (
        <div className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-50 rounded-2xl border border-line bg-white p-4 shadow-xl lg:hidden">
          <p className="px-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink/45">Шаги анкеты</p>
          <div className="-mt-2">
            <StepList current={current} onPick={() => setSheet(false)} />
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
          <div className="h-full bg-brand transition-all" style={{ width: `${((current + (done > current ? 1 : 0)) / STEPS.length) * 100}%` }} />
        </div>
        <div className="flex items-stretch px-2">
          <button type="button" onClick={() => press('[data-funnel-back]')} className={`${side} text-ink/55`}>
            <ArrowLeftIcon size={18} />
            Назад
          </button>
          <button type="button" onClick={() => setSheet(!sheet)} aria-expanded={sheet} className={`${side} text-ink/70`}>
            <span className="flex h-8 min-w-[48px] items-center justify-center rounded-full bg-ink px-3 text-[13px] font-bold text-white">
              {current + 1} из {STEPS.length}
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
export function AnketaFrame({ current, title, lead, nextLabel = 'Далее', children }) {
  return (
    <div className="min-h-screen bg-warm text-ink lg:flex">
      <Sidebar current={current} bottomBar={<FunnelBar current={current} nextLabel={nextLabel} />} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1000px] px-5 py-8 sm:px-8 sm:py-10 lg:px-14 lg:py-12">
          <header className="mb-8">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-brand">
              Шаг {current + 1} из {STEPS.length}
            </p>
            <h1 className="text-[28px] font-bold tracking-[-0.045em] sm:text-[36px]">{title}</h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-6 text-ink/60">{lead}</p>
          </header>
          <div className="hidden sm:block">
            <Progress current={current} />
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
      <span className="mb-2 flex items-center justify-between gap-3 text-[13px] font-bold text-ink-2">
        <span>
          {label}
          {required && <span className="text-brand"> *</span>}
        </span>
        {badge && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/[0.08] px-2.5 py-1 text-[10px] font-bold text-brand">
            {badge}
          </span>
        )}
      </span>
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
      {error && <span className="mt-1.5 block text-[12px] font-semibold text-danger">{error}</span>}
    </label>
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
export function BlockHead({ id, icon: Icon, title, hint, why, whyOpen, onWhy }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/[0.08] text-brand">
            <Icon size={18} />
          </span>
          <div>
            <h2 id={id} className="text-lg font-bold tracking-tight">
              {title}
            </h2>
            {hint && <p className="mt-1 text-sm text-ink/55">{hint}</p>}
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
      className={`flex shrink-0 items-center gap-1 rounded text-xs font-semibold text-brand transition-colors hover:text-ink ${RING}`}
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
      role={radio ? 'radio' : undefined}
      aria-checked={radio ? selected : undefined}
      aria-pressed={radio ? undefined : selected}
      className={`flex gap-3 rounded-xl border p-4 text-left transition-all ${RING} ${
        compact ? 'min-h-[58px] items-center' : 'min-h-[78px] items-start'
      } ${selected ? 'border-brand bg-brand/[0.05] ring-2 ring-brand/10' : 'border-line bg-white hover:border-line-2 hover:bg-warm'}`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center border ${radio ? 'rounded-full' : 'rounded-md'} ${compact ? '' : 'mt-0.5'} ${
          selected ? 'border-brand bg-brand' : 'border-line-2 bg-white'
        }`}
      >
        {selected && (radio ? <span className="h-2 w-2 rounded-full bg-white" /> : <CheckIcon size={13} className="text-white" />)}
      </span>
      <span>
        <span className="block text-sm font-bold text-ink">{title}</span>
        {description && <span className="mt-1 block text-xs leading-4 text-ink/50">{description}</span>}
      </span>
    </button>
  );
}

// Разворот под полем — для вопросов, у которых нет собственной шапки-секции
// (адрес, сфера): там заголовок принадлежит самому полю.
export function WhyToggle({ open, onToggle, children }) {
  return (
    <div className="mt-3">
      <WhyButton open={open} onClick={onToggle} />
      {open && <WhyPanel>{children}</WhyPanel>}
    </div>
  );
}

// Шапка вопроса: заголовок и подпись слева, «Зачем это нужно» справа.
// Объяснение раскрывается под шапкой — кнопка отвечает на вопрос, который
// человек задаёт именно здесь, а не уводит его в конец карточки.
export function SectionHead({ id, title, required, hint, whyOpen, onWhy, why }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id={id} className="text-xl font-bold tracking-[-0.02em]">
            {title}
            {required && <span className="whitespace-nowrap text-brand"> *</span>}
          </h2>
          {hint && <p className="mt-1 text-sm text-ink/55">{hint}</p>}
        </div>
        {why && <WhyButton open={whyOpen} onClick={onWhy} />}
      </div>
      {why && whyOpen && <WhyPanel>{why}</WhyPanel>}
    </div>
  );
}
