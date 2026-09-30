'use client';

// Каталог компонентов кабинета. Всё на странице — те же компоненты и классы,
// что на экранах: поменяли здесь — поменялось везде. Короткие правила «когда /
// когда нет» повторяют DESIGN.md, раздел Components.

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, CloseIcon, CopyIcon, OkIcon } from '../../../components/app/AppIcons';
import { Button, CLOSE_BTN, RING, TEXT_LINK, btn } from '../../../components/app/Button';
import { CARD } from '../../../components/app/Card';
import { IconAction } from '../../../components/app/DocRows';
import { StatusPill, TONES, statusBar } from '../../../components/app/Status';
import { SKINS, Switch, ThemeSwitch } from '../../../components/app/WidgetPreviews';
import { Field, Segmented, Tile, WhyButton } from '../start/_shared/AnketaChrome';
import { useDialog } from '../site/_shared/SiteChrome';

const COLORS = [
  ['Ink', 'ink', '#111110', 'текст и заголовки; «вы здесь» в меню'],
  ['Soft Ink', 'ink-2', '#2a2825', 'подписи полей'],
  ['Muted Ink', 'ink/60', 'Ink 60%', 'второстепенный текст; не бледнее'],
  ['Desk', 'warm', '#f4f1ec', 'фон страницы, дорожка сегментов'],
  ['Sheet', 'white', '#ffffff', 'карточки, поля, окна'],
  ['Hairline', 'line', '#e8e4dd', 'рамки и разделители'],
  ['Crease', 'line-2', '#dcd6cc', 'рамка при наведении'],
  ['Seal Blue', 'brand', '#2a3bf0', 'следующее действие и выбор'],
  ['Blue hover', 'brand-hover', '#1c2ab8', 'наведение на синюю кнопку'],
  ['Ledger Green', 'ok', '#1a7a52', 'работает, оплачено'],
  ['Amber', 'warn', '#b87900', 'скоро нужно действие'],
  ['Rust', 'danger', '#d63816', 'ошибка, остановлено'],
];

const TYPE = [
  ['Заголовок экрана', 'text-[28px] font-bold leading-9 tracking-[-0.045em] sm:text-[36px]', '28 / 36px, один на экран'],
  ['Вопрос анкеты', 'text-xl font-bold tracking-[-0.02em]', '20px'],
  ['Заголовок карточки', 'text-lg font-bold tracking-[-0.02em]', '18px'],
  ['Вводная под заголовком', 'text-[15px] leading-6 text-ink/60', '15 / 24px'],
  ['Кнопки, пункты меню, строки таблиц', 'text-sm font-bold', '14px'],
  ['Подсказка, текст «Зачем»', 'text-[13px] leading-5 text-ink/60', '13 / 20px'],
  ['Подпись над таблицей', 'text-[12px] font-semibold text-ink/60', '12px, без капса'],
  ['Дата, версия, ошибка', 'text-[12px] text-ink/60', '11–12px'],
  ['alfa-school.ru · 152-ФЗ', 'font-mono text-[13px] text-ink/70', 'моно — только данные'],
];

function Section({ title, when, whenNot, children }) {
  return (
    <section className={`${CARD} p-6 sm:p-7`}>
      <h2 className="text-lg font-bold tracking-[-0.02em]">{title}</h2>
      {(when || whenNot) && (
        <dl className="mt-3 grid gap-2 text-[13px] leading-5 sm:grid-cols-2">
          {when && (
            <div>
              <dt className="font-semibold text-ok-ink">Когда</dt>
              <dd className="text-ink/70">{when}</dd>
            </div>
          )}
          {whenNot && (
            <div>
              <dt className="font-semibold text-danger-ink">Когда нет</dt>
              <dd className="text-ink/70">{whenNot}</dd>
            </div>
          )}
        </dl>
      )}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function DemoDialog({ onClose }) {
  const ref = useRef(null);
  useDialog(ref, onClose);
  return (
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="kit-dlg" className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 p-4 outline-none sm:items-center">
      <div className={`${CARD} w-full max-w-[480px] p-6 shadow-xl sm:p-7`}>
        <div className="flex items-start justify-between gap-4">
          <h2 id="kit-dlg" className="text-lg font-bold tracking-[-0.03em]">Пример окна</h2>
          <button type="button" onClick={onClose} aria-label="Закрыть" className={CLOSE_BTN}>
            <CloseIcon size={18} />
          </button>
        </div>
        <p className="mt-3 text-sm leading-6 text-ink/70">
          Под окном страница недоступна: диктор её не читает, Tab туда не уходит, прокрутка стоит. Escape закрывает окно, фокус возвращается на кнопку.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button type="button" onClick={onClose} className={btn({ size: 'lg' })}>Понятно</button>
          <button type="button" onClick={onClose} className={btn({ variant: 'quiet', size: 'sm' })}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

export default function KitClient() {
  const [seg, setSeg] = useState('Картой');
  const [tile, setTile] = useState('Тильда');
  const [multi, setMulti] = useState(['Имя', 'Телефон']);
  const [on, setOn] = useState(true);
  const [skin, setSkin] = useState('Чернила');
  const [why, setWhy] = useState(false);
  const [dlg, setDlg] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <div className="min-h-screen min-h-dvh bg-warm text-ink">
      <main id="content" className="mx-auto grid max-w-5xl gap-6 px-5 py-8 sm:px-8 sm:py-12">
        <header>
          <Link href="/app/sites" className={`tap mb-6 inline-flex items-center gap-2 rounded text-sm font-semibold text-ink/60 hover:text-ink ${RING}`}>
            <ArrowLeftIcon size={16} /> Мои сайты
          </Link>
          <h1 className="text-[28px] font-bold tracking-[-0.045em] sm:text-[36px]">Компоненты кабинета</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-6 text-ink/60">
            Живые образцы из тех же файлов, что экраны. Правила — в DESIGN.md. Новый экран собирается только из этих частей.
          </p>
        </header>

        <Section title="Цвета">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {COLORS.map(([name, token, hex, role]) => (
              <li key={token} className="flex items-center gap-3">
                <span className="h-10 w-10 shrink-0 rounded-lg ring-1 ring-inset ring-ink/10" style={{ background: token === 'ink/60' ? 'rgba(17,17,16,.6)' : hex }} />
                <span className="min-w-0 text-[13px] leading-5">
                  <b className="font-semibold">{name}</b> <span className="font-mono text-[12px] text-ink/60">{hex}</span>
                  <span className="block text-ink/60">{role}</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Текст" when="Размер — по роли из этой шкалы." whenNot="Капс, разрядка, полупиксельные размеры (12.5, 13.5), моно для слов.">
          <ul className="grid gap-4">
            {TYPE.map(([sample, cls, note]) => (
              <li key={sample} className="flex flex-col gap-1 border-b border-line pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <span className={cls}>{sample}</span>
                <span className="shrink-0 font-mono text-[12px] text-ink/60">{note}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          title="Кнопки"
          when="Главная — одно следующее действие на экране. Вторая — рядом с главной. «Ведущая дальше» — вторая, которая сама продвигает дело. Тихая — «Отмена», «Позже»."
          whenNot="Две синие на одном экране. Кнопка, собранная вручную классами."
        >
          <div className="grid gap-5">
            {[
              ['primary', 'Главная'],
              ['secondary', 'Вторая'],
              ['next', 'Ведущая дальше'],
              ['quiet', 'Тихая'],
            ].map(([variant, label]) => (
              <div key={variant}>
                <p className="mb-2 text-[12px] font-semibold text-ink/60">{label}</p>
                <div className="flex flex-wrap items-center gap-3">
                  {[['xl', 52], ['lg', 48], ['md', 44], ['sm', 40], ['xs', 36]].map(([size, h]) => (
                    <Button key={size} variant={variant} size={size}>
                      {size} · {h}
                    </Button>
                  ))}
                  <Button variant={variant} size="md" disabled>
                    нельзя
                  </Button>
                </div>
              </div>
            ))}
            <p className="text-[13px] leading-5 text-ink/60">
              Размеры: xl 52px — «Назад / Далее» анкеты; lg 48 — главное в окне; md 44 — в карточке; sm 40 — над списком; xs 36 — в строке. На телефоне у sm и xs поле нажатия 44×44. Нажатие — сдвиг на 1px.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button type="button" className={TEXT_LINK}>Все документы →</button>
              <button type="button" aria-label="Закрыть" className={CLOSE_BTN}>
                <CloseIcon size={18} />
              </button>
              <IconAction label="Скопировать ссылку" icon={copied ? OkIcon : CopyIcon} done={copied ? 'Скопировано' : null} onClick={() => setCopied(!copied)} />
              <IconAction label="Скопировать ссылку" icon={CopyIcon} disabled why="Появится после установки кода" />
            </div>
          </div>
        </Section>

        <Section title="Статусы" when="Состояние сайта, документа, обращения — всегда словом и значком." whenNot="Цвет без слова; красный для «скоро» (для этого янтарный).">
          <div className="flex flex-wrap gap-2">
            {Object.keys(TONES).map((tone) => (
              <StatusPill key={tone} tone={tone}>
                {{ ok: 'Оплачено до 30.09.2027', info: 'Бесплатно до 04.10', warn: 'Код не найден', danger: 'Остановлена', muted: 'Без продления' }[tone]}
              </StatusPill>
            ))}
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {['ok', 'info', 'warn', 'muted'].map((tone) => {
              const { cls, Icon } = statusBar(tone);
              return (
                <div key={tone} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-bold ${cls}`}>
                  <Icon size={16} /> {{ ok: 'Документы актуальны', info: 'Пробный период', warn: 'Документы собраны', muted: 'Без продления' }[tone]}
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Поля и выбор" when="Один вариант — сегменты (коротко) или круглые плитки; несколько — квадратные плитки; да/нет в настройках — переключатель." whenNot="Выбор за человека заранее; подсказка под вопросом, повторяющая «Зачем».">
          <div className="grid gap-6 lg:grid-cols-2">
            <Field label="Адрес сайта" required placeholder="site.ru" />
            <Field label="ИНН" required placeholder="10 или 12 цифр" error="ИНН — 10 цифр у компании или 12 у ИП." defaultValue="77012" />
            <div>
              <p id="kit-seg" className="mb-2 text-[13px] font-bold text-ink-2">Как оплачиваете?</p>
              <Segmented options={['Картой', 'По счёту']} value={seg} onChange={setSeg} ariaLabelledby="kit-seg" />
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold">Куки-баннер: показывать посетителям</span>
              <Switch checked={on} onChange={setOn} label="Куки-баннер: показывать посетителям" />
            </div>
            <div role="radiogroup" aria-label="Платформа" className="grid gap-2 sm:grid-cols-2">
              {['Тильда', 'Битрикс'].map((t) => (
                <Tile key={t} radio title={t} selected={tile === t} onClick={() => setTile(t)} compact />
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {['Имя', 'Телефон', 'E-mail'].map((t) => (
                <Tile key={t} title={t} selected={multi.includes(t)} onClick={() => setMulti(multi.includes(t) ? multi.filter((x) => x !== t) : [...multi, t])} compact />
              ))}
            </div>
            <div>
              <WhyButton open={why} onClick={() => setWhy(!why)} />
              {why && <p className="mt-2 rounded-xl bg-warm px-4 py-3 text-[13px] leading-5 text-ink/70">Одно предложение: зачем вопрос и что будет с ответом.</p>}
            </div>
            <div>
              <p id="kit-skin" className="mb-2 text-[13px] font-bold text-ink-2">Тема виджета</p>
              <ThemeSwitch value={skin} onChange={setSkin} labelledby="kit-skin" />
              <p className="mt-2 font-mono text-[12px] text-ink/60">{SKINS[skin].bg}</p>
            </div>
          </div>
        </Section>

        <Section title="Карточка и окно" when="Карточка — раздел или блок (p-6 sm:p-7; в сетке p-5 sm:p-6). Окно — короткое решение поверх страницы." whenNot="Карточка в карточке; окно для длинной формы, которую можно показать на месте.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={`${CARD} p-5 sm:p-6`}>
              <p className="text-[13px] text-ink/60">Подписка</p>
              <p className="mt-1 text-[28px] font-bold tracking-[-0.04em]">до 30.09.2027</p>
              <p className="mt-1 text-[13px] text-ink/60">12 000 ₽ в год</p>
            </div>
            <div className={`${CARD} flex flex-col items-start justify-between gap-4 p-5 sm:p-6`}>
              <p className="text-sm leading-6 text-ink/70">Окно гасит страницу под собой и возвращает фокус на кнопку.</p>
              <button type="button" onClick={() => setDlg(true)} aria-haspopup="dialog" className={btn({ variant: 'secondary', size: 'md' })}>
                Открыть пример окна
              </button>
            </div>
          </div>
        </Section>
      </main>
      {dlg && <DemoDialog onClose={() => setDlg(false)} />}
    </div>
  );
}
