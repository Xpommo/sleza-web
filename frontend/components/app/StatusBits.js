// Переиспользуемые кусочки статуса. Правило: цвет никогда не единственный сигнал —
// всегда цвет + иконка + слово. Каждый двенадцатый мужчина не различает красный
// и зелёный, а это ровно наша аудитория.

import { ViolationIcon, WarnIcon, OkIcon } from './AppIcons';
import { SEGMENT_LEGEND, checkSegments } from '../../lib/appMock';

export const TONE_TEXT = {
  danger: 'text-danger',
  warn:   'text-warn',
  ok:     'text-ok',
  brand:  'text-brand',
  muted:  'text-ink/55',
};

export const TONE_BG = {
  danger: 'bg-danger',
  warn:   'bg-warn',
  ok:     'bg-ok',
  brand:  'bg-brand',
  muted:  'bg-line-2',
};

const TONE_ICON = { danger: ViolationIcon, warn: WarnIcon, ok: OkIcon, brand: WarnIcon, muted: OkIcon };

// Кто закрывает находку — единый словарь, чтобы кабинет и путь клиента не разошлись.
export const OWNER_WORDING = { us: 'закроем сами', you: 'нужны вы' };

// Нейтральные бейджи: заливка — наша работа, обводка со стрелкой — работа клиента.
// Цвет тут не участвует — он занят под тяжесть находки (см. правило в CLAUDE.md/HANDOFF).
export function OwnerBadge({ byUs }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink/60 ${
      byUs ? 'bg-line' : 'border border-line-2 bg-white'
    }`}>
      {!byUs && <span aria-hidden="true">↗</span>}
      {byUs ? OWNER_WORDING.us : OWNER_WORDING.you}
    </span>
  );
}

// Сводка проекта: «2 нарушения · 2 замечания · риск до 300 000 ₽».
// secondary — замечания при наличии нарушений: тем же словарём, но спокойнее по весу,
// чтобы не спорить с главным статусом.
export function StatusBadge({ tone, label, secondary, size = 'md', extra }) {
  const Icon = TONE_ICON[tone] || OkIcon;
  const text = size === 'lg' ? 'text-[15px]' : 'text-[13px]';
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 font-semibold ${text} ${TONE_TEXT[tone]}`}>
      <span className="inline-flex items-center gap-1.5">
        <Icon size={size === 'lg' ? 17 : 15} />
        {label}
      </span>
      {secondary && <span className={`font-medium ${TONE_TEXT.warn}`}>· {secondary}</span>}
      {extra && <span className="font-medium text-ink/60">· {extra}</span>}
    </span>
  );
}

// Мелкий статус строкой: документы, дата проверки, оплата.
export function StatusLine({ tone, text, mono = true }) {
  const Icon = TONE_ICON[tone];
  const showIcon = tone === 'danger' || tone === 'warn';
  return (
    <span className={`inline-flex items-center gap-1.5 ${mono ? 'font-mono text-[11px]' : 'text-[12.5px]'} ${TONE_TEXT[tone]}`}>
      {showIcon && <Icon size={13} />}
      {text}
    </span>
  );
}

// Полоска шести проверок. Без легенды цветные сегменты ничего не сообщают,
// поэтому легенда идёт рядом, а не прячется в тултип.
export function ChecksStrip({ project, withLegend = true }) {
  const segments = checkSegments(project);
  return (
    <div>
      <div className="flex gap-1" title={segments.map(s => s.name).join(' · ')}>
        {segments.map(s => (
          <span
            key={s.name}
            title={s.name}
            className={`h-1.5 flex-1 rounded-full ${TONE_BG[s.tone]}`}
          />
        ))}
      </div>
      {withLegend && (
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[9.5px] uppercase tracking-[0.06em] text-ink/45">
          {SEGMENT_LEGEND.map(l => (
            <span key={l.text} className="inline-flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${TONE_BG[l.tone]}`} />
              {l.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
