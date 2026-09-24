'use client';

// «Отключить сайт» — в «Подписке», в меню «⋯» строки сайта: сайт работает до
// конца оплаченного срока или пробного периода, дальше не продлевается.
// Выключенное автопродление — не это (владелец 24.09): оно значит «продлевать
// вручную», и окна у него нет. Два шага, как решено 10.09: сначала «Может,
// получится помочь?» — ровно один раз, с честно названной кнопкой, потом
// последствия.

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
            {step === 1 ? 'Может, получится помочь?' : `Отключить ${site.domain}?`}
          </h3>
          <button type="button" onClick={onClose} aria-label="Закрыть" className={`rounded p-1 text-ink/40 hover:text-ink ${RING}`}>
            <CloseIcon size={18} />
          </button>
        </div>
        {step === 1 ? (
          <>
            <p className="mt-3 text-[13px] leading-5 text-ink/65">
              Если виджет мешает вёрстке или документы не подходят под ваш случай — напишите, разберёмся.
              {paid ? ` Отключить успеете всегда: сайт оплачен до ${paidUntil}.` : ''}
            </p>
            {/* Кто пришёл сюда, чтобы не было автоматических списаний, —
                уходить для этого не нужно. */}
            <p className="mt-2 text-[13px] leading-5 text-ink/65">
              Не хотите автоматических списаний — выключите автопродление: сайт останется в подписке, продлите его вручную.
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
              <li>· Виджет исчезнет с {site.domain} — куки-баннер и подвал со ссылками</li>
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
                Не отключать
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
