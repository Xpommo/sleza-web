'use client';

// Отключение сайта — в «Подписке», в его строке (решение владельца 23.09:
// одно место; раньше кнопка жила на «Обзоре» сайта). Два шага, как решено
// 10.09: сначала «Может, получится помочь?» — ровно один раз, с честно
// названной кнопкой «Всё равно отключить», потом последствия.

import { useRouter } from 'next/navigation';
import { CloseIcon } from '../../../components/app/AppIcons';
import { RING } from '../site/_shared/SiteChrome';

const BTN = `rounded-xl border border-line bg-white px-5 py-3 text-sm font-bold text-ink transition hover:border-line-2 hover:bg-warm ${RING}`;

export default function SiteOffModal({ site, step, paidUntil, onStep, onClose, onConfirm }) {
  const router = useRouter();
  const paid = site.kind === 'paid';
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="off-title" className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 p-4">
      <div className="mt-16 w-full max-w-[460px] rounded-2xl border border-line bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h3 id="off-title" className="text-lg font-bold tracking-[-0.03em]">
            {step === 1 ? 'Может, получится помочь?' : `Отключить ${site.domain}?`}
          </h3>
          <button type="button" onClick={onClose} aria-label="Закрыть" className={`rounded p-1 text-ink/40 hover:text-ink ${RING}`}>
            <CloseIcon size={18} />
          </button>
        </div>
        {step === 1 ? (
          <>
            <p className="mt-3 text-[13px] leading-5 text-ink/65">
              Если виджет мешает вёрстке, документы не подходят под ваш случай или счёт пришёл не тот — напишите, разберёмся.
              {paid ? ` Отключить успеете всегда: сайт работает до ${paidUntil}.` : ''}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => router.push('/app/support')} className={BTN}>
                Написать в поддержку
              </button>
              <button type="button" onClick={() => onStep(2)} className={`rounded-xl px-3 py-3 text-sm font-semibold text-ink/60 hover:text-ink ${RING}`}>
                Всё равно отключить
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-[13px] leading-5 text-ink/65">
              Отключается только этот сайт — остальные сайты аккаунта продолжат работать, в счёт этот сайт не войдёт.
              {paid ? ` До ${paidUntil} всё работает как сейчас — этот период уже оплачен. После этой даты:` : ' Отключим сразу:'}
            </p>
            {/* Страница уже опубликованной политики остаётся доступной по
                ссылке всегда — иначе бывший клиент становится нарушителем из-за
                нерабочей ссылки на нашей стороне (решение 24.08). */}
            <ul className="mt-3 space-y-2 rounded-xl bg-danger/[0.06] p-4 text-[13px] leading-5 text-ink/75">
              <li>· Виджет исчезнет с {site.domain} — cookie-баннер и подвал со ссылками</li>
              <li>· Документы останутся в текущей версии: следить за изменениями закона и переписывать их мы перестанем</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onConfirm}
                className={`rounded-xl border border-danger/30 px-5 py-3 text-sm font-bold text-danger hover:bg-danger/[0.05] ${RING}`}
              >
                Да, отключить
              </button>
              <button type="button" onClick={onClose} className={BTN}>
                Оставить сайт
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
