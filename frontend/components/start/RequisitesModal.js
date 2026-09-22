'use client';

import { useEffect, useState } from 'react';

const RING =
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 focus-visible:border-brand';

// Реквизиты — отдельным окном, а не строкой в общем сценарии: это единственное
// место во всём шаге «Готовим документы», где от клиента нужен ввод, а не
// просто чтение и «далее». Вынесено из линейного потока, чтобы не топить
// самим фактом ввода остальную анкету — закрыл и вернулся туда же, откуда ушёл.
//
// Полноценная страница реквизитов с выбором ИП/ООО/самозанятый/физлицо —
// отдельная задача следующим заходом (см. design-export/HANDOFF.md). Здесь —
// только быстрая проверка того, что подставилось из ЕГРЮЛ.
export default function RequisitesModal({ open, org, onClose, onSave }) {
  const [name, setName] = useState(org.name);
  const [inn, setInn] = useState(org.inn);

  useEffect(() => {
    if (open) { setName(org.name); setInn(org.inn); }
  }, [open, org]);

  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 sm:items-center">
      <div role="dialog" aria-modal="true" aria-label="Реквизиты"
        className="w-full max-w-[440px] rounded-lg border border-line-2 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[18px] font-extrabold tracking-[-0.02em]">Реквизиты</h2>
          <button type="button" onClick={onClose} aria-label="Закрыть"
            className={`rounded p-1 text-ink/40 transition-colors hover:text-ink ${RING}`}>✕</button>
        </div>
        <p className="mt-1.5 text-[13px] text-ink/60">
          Подставили из ЕГРЮЛ — проверьте и поправьте, если нужно. Это станет первым документом
          в разделе «Документы».
        </p>

        <div className="mt-4">
          <label className="mb-1 block text-[13px] font-bold" htmlFor="req-name">Наименование</label>
          <input id="req-name" value={name} onChange={e => setName(e.target.value)}
            className={`w-full rounded-lg border border-line-2 px-3.5 py-3 text-[15px] ${RING}`} />
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-[13px] font-bold" htmlFor="req-inn">ИНН</label>
          <input id="req-inn" value={inn} onChange={e => setInn(e.target.value)}
            className={`w-full rounded-lg border border-line-2 px-3.5 py-3 font-mono text-[15px] ${RING}`} />
        </div>

        <div className="mt-5 flex gap-3">
          <button type="button" onClick={() => onSave({ name, inn })}
            className={`flex-1 rounded-lg bg-ink px-4 py-3 text-[14px] font-bold text-white transition-colors hover:bg-brand ${RING}`}>
            Сохранить
          </button>
          <button type="button" onClick={onClose}
            className={`rounded-lg px-4 py-3 text-[14px] font-semibold text-ink/60 transition-colors hover:text-ink ${RING}`}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
