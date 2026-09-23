'use client';

// Выключение автопродления — в «Подписке», переключателем в строке сайта.
// Это и есть «отключить сайт» (партнёрская программа, 14.09): сайт работает
// до конца оплаченного срока или пробного периода, дальше не продлевается.
// Два шага, как решено 10.09: сначала «Может, получится помочь?» — ровно один
// раз, с честно названной кнопкой, потом последствия.

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CloseIcon } from '../../../components/app/AppIcons';
import { RING, useDialog } from '../site/_shared/SiteChrome';

const BTN = `rounded-xl border border-line bg-white px-5 py-3 text-sm font-bold text-ink transition hover:border-line-2 hover:bg-warm ${RING}`;

export default function SiteOffModal({ site, step, paidUntil, onStep, onClose, onConfirm }) {
  const dialog = useRef(null);
  useDialog(dialog, onClose, step);
  const router = useRouter();
  const paid = site.kind === 'paid';
  const trial = site.kind === 'trial';
  return (
    <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="off-title" className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 p-4 outline-none">
      <div className="mt-16 w-full max-w-[460px] rounded-2xl border border-line bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h3 id="off-title" className="text-lg font-bold tracking-[-0.03em]">
            {step === 1 ? 'Может, получится помочь?' : `Выключить автопродление ${site.domain}?`}
          </h3>
          <button type="button" onClick={onClose} aria-label="Закрыть" className={`rounded p-1 text-ink/40 hover:text-ink ${RING}`}>
            <CloseIcon size={18} />
          </button>
        </div>
        {step === 1 ? (
          <>
            <p className="mt-3 text-[13px] leading-5 text-ink/65">
              Если виджет мешает вёрстке или документы не подходят под ваш случай — напишите, разберёмся.
              {paid ? ` Выключить успеете всегда: сайт оплачен до ${paidUntil}.` : ''}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => router.push('/app/support')} className={BTN}>
                Написать в поддержку
              </button>
              <button type="button" onClick={() => onStep(2)} className={`rounded-xl px-3 py-3 text-sm font-semibold text-ink/60 hover:text-ink ${RING}`}>
                Всё равно выключить
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-[13px] leading-5 text-ink/65">
              Продлевать {site.domain} не будем, остальные сайты это не затронет.
              {paid
                ? ` До ${paidUntil} всё работает как сейчас — этот период оплачен. После этой даты:`
                : trial
                  ? ` До ${paidUntil} идёт пробный период. После него:`
                  : ' Пока год не оплачен, сайт не включится:'}
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
                Да, выключить
              </button>
              <button type="button" onClick={onClose} className={BTN}>
                Оставить автопродление
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
