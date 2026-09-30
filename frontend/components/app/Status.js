// Статус — один на кабинет (дизайн-система, 30.09): цвет, текст и иконка вместе.
// Раньше было три системы: полоса с иконкой в карточках «Моих сайтов», таблетка
// без иконки в таблице сайтов (шесть оттенков), своя таблетка в строках
// документов, в настройках и в поддержке. Цвет никогда не один: рядом всегда
// слово и значок — так статус различим и без цвета (DESIGN.md, Status).
//
// Тона:
//   ok     — работает, оплачено, готово;
//   info   — идёт, ничего не сломано (пробный период, счёт выставлен);
//   warn   — скоро нужно действие (последний день, код не найден);
//   danger — остановлено, просрочено;
//   muted  — спокойное «не активно» (без продления, анкета не закончена).
// Текст — всегда *-ink своего тона на его оттенке 10% (Tint-Not-Fill Rule).

import { ClockIcon, OkIcon, WarnIcon } from './AppIcons';

export const TONES = {
  ok: { tint: 'bg-ok/10 text-ok-ink', border: 'border-ok/25', Icon: OkIcon },
  info: { tint: 'bg-brand/[0.07] text-brand', border: 'border-brand/20', Icon: ClockIcon },
  warn: { tint: 'bg-warn/10 text-warn-ink', border: 'border-warn/30', Icon: WarnIcon },
  danger: { tint: 'bg-danger/10 text-danger-ink', border: 'border-danger/25', Icon: WarnIcon },
  muted: { tint: 'bg-warm text-ink/70', border: 'border-line', Icon: ClockIcon },
};

// Таблетка статуса: в таблице, в строке документа, в настройках, в поддержке.
export function StatusPill({ tone = 'ok', children, className = '' }) {
  const { tint, Icon } = TONES[tone] || TONES.muted;
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold leading-4 ${tint} ${className}`}>
      <Icon size={13} className="shrink-0" aria-hidden="true" />
      {children}
    </span>
  );
}

// Полоса статуса во всю ширину карточки («Мои сайты»): тот же тон, с рамкой.
export function statusBar(tone) {
  const t = TONES[tone] || TONES.muted;
  return { cls: `${t.border} ${t.tint}`, Icon: t.Icon };
}
