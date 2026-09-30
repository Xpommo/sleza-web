// Одна кнопка на весь кабинет: вид × размер (дизайн-система, 30.09). Раньше
// кнопку собирали вручную — около 60 определений в 29 файлах: главная синяя была
// трёх высот, вторая — с тремя наведениями и тенью через раз. Теперь класс
// берётся только отсюда; новая кнопка — только через btn() или <Button>.
//
// Виды:
//   primary   — главное действие экрана, одно на вид (синяя заливка);
//   secondary — второе действие рядом с главным (белая, тонкая рамка);
//   next      — вторая, которая сама ведёт дальше («Сделано», «Скопировать»,
//               «Изменить»): при наведении рамка и текст синие (DESIGN.md);
//   quiet     — тихое действие текстом: «Отмена», «Поставлю позже».
// Размеры (высота подобрана к соседям, а не произвольно):
//   xl — 52px: «Назад / Далее» анкеты, рядом с полями той же высоты;
//   lg — 48px: главное действие окна или экрана;
//   md — 44px: действие внутри карточки;
//   sm — 40px: панель над списком или таблицей («Добавить сайт», «Пополнить»);
//   xs — 36px: действие в строке списка («Изменить», «Сделано»).
// На телефоне у sm и xs невидимое поле 44×44 (класс tap, globals.css).
// Отклик на нажатие — общий, в globals.css (.cabinet … :active).

import Link from 'next/link';

export const RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';

const SIZE = {
  xl: 'h-[52px] rounded-xl px-6 text-sm',
  lg: 'h-12 rounded-xl px-6 text-sm',
  md: 'h-11 rounded-xl px-5 text-sm',
  sm: 'tap h-10 rounded-xl px-5 text-sm',
  xs: 'tap h-9 rounded-xl px-4 text-[13px]',
};

const VARIANT = {
  primary: 'bg-brand font-bold text-white shadow-sm hover:bg-brand-hover disabled:hover:bg-brand',
  secondary: 'border border-line bg-white font-bold text-ink shadow-sm hover:border-line-2 hover:bg-warm disabled:hover:border-line disabled:hover:bg-white',
  next: 'border border-line bg-white font-bold text-ink shadow-sm hover:border-brand hover:text-brand disabled:hover:border-line disabled:hover:text-ink',
  quiet: 'font-semibold text-ink/60 hover:text-ink',
};

// Тихая кнопка — текст без рамки: поля по бокам меньше, чтобы слово стояло
// ровно под краем текста над ним.
const QUIET_PAD = { xl: 'px-3', lg: 'px-3', md: 'px-3', sm: 'px-3', xs: 'px-2' };

export function btn({ variant = 'primary', size = 'md', full = false, className = '' } = {}) {
  let s = SIZE[size];
  if (variant === 'quiet') s = s.replace(/\bpx-\d+\b/, QUIET_PAD[size]);
  return [
    'inline-flex items-center justify-center gap-2 transition disabled:cursor-not-allowed disabled:opacity-50',
    s,
    VARIANT[variant],
    full ? 'w-full' : '',
    RING,
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

// Кнопка-ссылка или кнопка — одна запись: <Button href="/app/sites">…</Button>.
export function Button({ variant, size, full, className, href, children, ...rest }) {
  const cls = btn({ variant, size, full, className });
  if (href) {
    return (
      <Link href={href} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}

// Крестик окна: квадрат 44px, отодвинутый отрицательным полем, чтобы шапка
// окна не росла (одинаковый во всех окнах кабинета).
export const CLOSE_BTN = `-m-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink/60 transition hover:bg-warm hover:text-ink ${RING}`;

// Действие-ссылка текстом в карточке: «Оплатить →», «Все документы →».
export const TEXT_LINK = `tap rounded text-sm font-semibold text-brand hover:underline ${RING}`;
