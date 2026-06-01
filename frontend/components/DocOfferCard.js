'use client';

import { useEffect } from 'react';
import { buildIntakePrefill } from '../lib/intakePrefill';
import { fireEvent } from '../lib/analytics';

// Price anchor — no real payment in Phase A (no ИП yet). Button leads to a заявка.
export const DOC_PRICE = '3 900 ₽';
const LAWYER_ANCHOR = 'от 30 000 ₽';

// Appears right after the verdict (peak of "боли"), before the PDF CTA, ONLY when
// there is something to fix. Pre-filled-count is the wedge: "мы уже заполнили за вас".
export default function DocOfferCard({ data, hostname, uuid, onOpenIntake }) {
  const prefill = buildIntakePrefill(data);
  const { known, total } = prefill.counts;

  useEffect(() => {
    fireEvent('doc_offer_shown', { scanUuid: uuid, hostname });
  }, [uuid, hostname]);

  const open = () => {
    fireEvent('doc_offer_clicked', { scanUuid: uuid, hostname });
    onOpenIntake?.();
  };

  return (
    <div className="rounded-[10px] border-2 border-brand/30 bg-brand/[0.03] px-5 sm:px-6 py-6 sm:py-7">
      <div className="label-micro mb-1.5 text-brand">закрыть найденное</div>
      <div className="text-[19px] sm:text-[20px] font-bold tracking-tight leading-snug mb-1.5">
        Соберём пакет документов под ваш сайт
      </div>
      <div className="text-[13.5px] text-ink/65 leading-relaxed mb-4 max-w-[56ch]">
        Политика конфиденциальности, отдельное согласие на обработку ПД
        (обязательно с 01.09.2025) и cookie-политика — под то, что вы реально
        собираете. Готовим по вашим данным, с участием юристов.
      </div>

      {/* Effort-reduction anchor: scan already filled half the form */}
      <div className="flex items-center gap-2.5 mb-5 rounded-lg bg-white border border-line px-3.5 py-2.5">
        <span className="w-6 h-6 rounded-full bg-ok/15 text-ok flex items-center justify-center text-[13px] font-bold shrink-0">✓</span>
        <span className="text-[13px] text-ink/75">
          Мы уже заполнили <b className="text-ink">{known} из {total}</b> пунктов анкеты
          по результатам скана — осталось дополнить.
        </span>
      </div>

      {/* Price anchor with contrast */}
      <div className="flex flex-wrap items-end gap-x-3 gap-y-1 mb-4">
        <span className="text-[13px] text-ink/40 line-through">юрист {LAWYER_ANCHOR}</span>
        <span className="font-extrabold text-[26px] tracking-tight text-ink leading-none">{DOC_PRICE}</span>
        <span className="text-[12px] text-ink/45">за пакет</span>
      </div>

      <button
        onClick={open}
        className="w-full sm:w-auto bg-ink hover:bg-brand text-white rounded-lg px-6 py-3 text-[14px] font-bold transition-colors inline-flex items-center justify-center gap-2"
      >
        Сформировать документы под вас →
      </button>
      <div className="mt-2.5 text-[11px] text-ink/35 leading-snug">
        Оплата не сейчас — оставьте заявку, соберём пакет и пришлём. Результат
        готовится по предоставленным вами данным.
      </div>
    </div>
  );
}
