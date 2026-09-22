import Link from 'next/link';
import FlashlightIcon from '../FlashlightIcon';
import { StatusBadge } from '../app/StatusBits';
import { DISCLAIMER } from '../../lib/appMock';

// Минимальный каркас пути клиента (шаги 1–4: что подготовим → уточнения →
// документы готовы → установка+оплата). Путь начинается не здесь: находки
// человек уже видел на странице проекта в кабинете (getProject('p1'), та же
// карточка, что и /app/project/p1) — сюда он попадает по кнопке «Подключить»,
// повторный показ находок был бы дублированием одного и того же экрана. Вход
// уже пройден на всём протяжении этих шагов — аккаунт существует до входа
// в воронку, не создаётся по ходу неё.
//
// Пакет и вопросы разнесены по разным экранам: на тесте с людьми, не знакомыми
// с сервисом, всё-в-одном не понял никто. Оплата — последний шаг целиком, а не
// отдельный экран перед установкой: код, инструкцию и проверку виджета видно
// и можно пройти бесплатно, платёж — последнее действие на этом же экране.
// Тот же приём, что раньше сработал с «оффером» (растворён в «ready»).
//
// Каркас — StartFrame, а не AppShell, на всех четырёх шагах, включая
// установку: оплата всё ещё живёт на этом экране, а это решение на один
// экран — боковая навигация только даёт лишний повод отвлечься и уйти.
//
// Логотип не ведёт на "/" — посреди прохождения анкеты уводить человека
// на маркетинговую главную было бы потерей контекста, а не навигацией.

const RING =
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 focus-visible:border-brand';

const TOTAL_STEPS = 4;

export default function StartFrame({ project, summary, step, back, children, showDisclaimer = true }) {
  return (
    <div className="min-h-screen bg-warm">
      <header className="sticky top-0 z-30 border-b border-line bg-paper">
        <div className="mx-auto flex max-w-[720px] items-center gap-3 px-5 py-3 sm:px-6">
          <span className="inline-flex items-center gap-2">
            <FlashlightIcon width={22} height={15} />
            <span className="text-[14px] font-extrabold tracking-[-0.02em]">ШтрафКонтроль</span>
          </span>
          {step != null && (
            <span className="ml-auto font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink/45">
              шаг {step} из {TOTAL_STEPS}
            </span>
          )}
        </div>
        {step != null && (
          <div className="h-[3px] w-full bg-line-2">
            <div
              className="h-full bg-ink transition-[width] duration-300"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        )}
      </header>

      <div className="mx-auto max-w-[720px] px-5 pb-40 pt-8 sm:px-6 sm:pt-10">
        {back && (
          <Link
            href={back.href}
            className={`mb-4 inline-flex items-center gap-1 rounded text-[12.5px] font-semibold text-ink/55 transition-colors hover:text-ink ${RING}`}
          >
            ← {back.label}
          </Link>
        )}

        {project && (
          <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="font-mono text-[15px] font-semibold tracking-[-0.01em]">{project.domain}</span>
            {summary && (
              <StatusBadge tone={summary.tone} label={summary.label} secondary={summary.secondary} />
            )}
          </div>
        )}

        {children}

        {showDisclaimer && (
          <p className="mt-10 text-[11.5px] leading-relaxed text-ink/55">{DISCLAIMER}</p>
        )}
      </div>
    </div>
  );
}

export { RING };
