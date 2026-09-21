'use client';

import Link from 'next/link';
import FlashlightIcon from '../../../../components/FlashlightIcon';
import { ArrowLeftIcon, CheckIcon, CloseIcon, InfoIcon } from '../../../../components/app/AppIcons';
import { CURRENT_USER } from '../../../../lib/appMock';

// Общий каркас всех шести шагов анкеты «Слеза Белый Сайт». Названия шагов
// согласованы отдельно: каждое описывает содержимое, не процесс
// («Настройка»/«Проверка» отклонены разбором за то, что не говорят, что внутри).
export const STEPS = ['Ваш профиль', 'О сайте', 'Данные клиентов', 'Реквизиты', 'Пакет документов', 'Установка'];

export const RING = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 focus-visible:border-brand';

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <FlashlightIcon width={24} height={16} />
      <span className="text-[18px] font-bold tracking-[-0.03em] text-ink">Слеза Белый Сайт</span>
    </div>
  );
}

// current — индекс активного шага. Пройденные — зелёная галочка, активный —
// кольцо, остальные — предстоящие. «Пройден» и «открыт сейчас» намеренно
// разные состояния: активному шагу рано носить галочку, он ещё не заполнен.
export function StepList({ current }) {
  return (
    <div className="relative mt-4 pl-8">
      <div className="absolute left-[11px] top-0 h-full w-px bg-line" />
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div
            key={step}
            className={`relative flex items-center gap-3 py-3 text-[14px] ${
              active ? 'font-bold text-ink' : done ? 'font-bold text-ink/60' : 'font-medium text-ink/35'
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
          </div>
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

export function Sidebar({ open, onClose, current }) {
  return (
    <aside
      className={`${open ? 'left-0' : '-left-full'} fixed inset-y-0 z-30 flex w-[292px] shrink-0 flex-col border-r border-line bg-white px-5 py-7 transition-[left] lg:relative lg:left-0`}
    >
      <button
        onClick={onClose}
        className={`absolute right-4 top-4 rounded-md p-1 text-ink/40 lg:hidden ${RING}`}
        aria-label="Закрыть меню"
      >
        <CloseIcon size={20} />
      </button>
      <Logo />
      <Link
        href="/app/sites"
        className={`mt-12 flex w-fit items-center gap-2 rounded text-[15px] font-semibold text-ink/55 transition-colors hover:text-ink ${RING}`}
      >
        <ArrowLeftIcon size={17} /> Мои сайты
      </Link>
      <div className="mt-7 rounded-2xl bg-ink px-4 py-3.5 text-[15px] font-bold text-white shadow-sm">Подключение сайта</div>
      <StepList current={current} />
      <div className="mt-auto border-t border-line pt-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">
            {CURRENT_USER.name.slice(0, 1)}
          </div>
          <div>
            <p className="text-sm font-bold text-ink">{CURRENT_USER.name}</p>
            <p className="text-xs text-ink/50">{CURRENT_USER.email}</p>
          </div>
        </div>
      </div>
    </aside>
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
      {error && <span className="mt-1.5 block text-[12.5px] font-semibold text-danger">{error}</span>}
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
              value === item ? 'text-white' : 'text-ink/55 hover:text-ink'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

// Шапка блока внутри карточки: иконка в квадрате, заголовок, подпись.
export function BlockHead({ id, icon: Icon, title, hint, tone = 'brand' }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          tone === 'plain' ? 'bg-white text-brand shadow-sm' : 'bg-brand/[0.08] text-brand'
        }`}
      >
        <Icon size={18} />
      </span>
      <div>
        <h2 id={id} className="text-lg font-bold tracking-tight">
          {title}
        </h2>
        {hint && <p className="mt-1 text-sm text-ink/55">{hint}</p>}
      </div>
    </div>
  );
}

// Карточка-переключатель: одиночный выбор или множественный — решает
// вызывающий код через onClick, Tile только рисует. compact — для коротких
// пунктов без пояснения, чтобы не растягивать плитку пустотой.
export function Tile({ title, description, selected, onClick, compact = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex gap-3 rounded-xl border p-4 text-left transition-all ${RING} ${
        compact ? 'min-h-[58px] items-center' : 'min-h-[78px] items-start'
      } ${selected ? 'border-brand bg-brand/[0.05] ring-2 ring-brand/10' : 'border-line bg-white hover:border-line-2 hover:bg-warm'}`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${compact ? '' : 'mt-0.5'} ${
          selected ? 'border-brand bg-brand' : 'border-line-2 bg-white'
        }`}
      >
        {selected && <CheckIcon size={13} className="text-white" />}
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
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex items-center gap-1 rounded text-xs font-semibold text-brand transition-colors hover:text-ink ${RING}`}
      >
        <InfoIcon size={14} /> Зачем это нужно
      </button>
      {open && <p className="mt-3 max-w-2xl rounded-xl bg-warm px-4 py-3 text-[13px] leading-5 text-ink/60">{children}</p>}
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
            {title} {required && <span className="text-brand">*</span>}
          </h2>
          {hint && <p className="mt-1 text-sm text-ink/55">{hint}</p>}
        </div>
        {why && (
          <button
            type="button"
            onClick={onWhy}
            aria-expanded={whyOpen}
            className={`flex shrink-0 items-center gap-1 rounded text-xs font-semibold text-brand transition-colors hover:text-ink ${RING}`}
          >
            <InfoIcon size={14} /> Зачем это нужно
          </button>
        )}
      </div>
      {why && whyOpen && (
        <p className="mt-3 max-w-2xl rounded-xl bg-warm px-4 py-3 text-[13px] leading-5 text-ink/60">{why}</p>
      )}
    </div>
  );
}
