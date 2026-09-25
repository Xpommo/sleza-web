'use client';

// «Реквизиты для счёта» — отдельный плательщик, когда счёт оплачивает не та
// компания, чьи реквизиты стоят в подвале сайта. Девять полей, как в живом
// макете (modal-req-invoice); с реквизитами владельца из анкеты не связаны
// и их не меняют — это разные сущности (правка макета 26.08).

import { useRef, useState } from 'react';
import { CloseIcon } from '../../../components/app/AppIcons';
import { Field, PhoneField } from '../start/_shared/AnketaChrome';
import { RING, useDialog } from '../site/_shared/SiteChrome';
import { phoneIncomplete } from '../../../lib/validate';

export const EMPTY_PAYER = { name: '', inn: '', ogrn: '', email: '', phone: '', account: '', bank: '', bik: '', corr: '' };

// Без наименования, ИНН и почты счёт не выставить и не доставить — эти три
// проверяем, как и раньше. Банковские поля в счёте не обязательны.
function validate(v) {
  const e = {};
  if (!v.name.trim()) e.name = 'Укажите, кто оплачивает счёт.';
  if (!/^\d{10}(\d{2})?$/.test(v.inn)) e.inn = 'ИНН — 10 или 12 цифр.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) e.email = 'Нужен e-mail вида name@site.ru: на него придёт счёт.';
  if (phoneIncomplete(v.phone)) e.phone = phoneIncomplete(v.phone);
  return e;
}

export function payerSummary(p) {
  return [p.inn && `ИНН ${p.inn}`, p.email, p.phone, p.account && `счёт …${p.account.slice(-4)}`].filter(Boolean).join(' · ');
}

export default function InvoicePayerModal({ initial, onClose, onSave }) {
  const dialog = useRef(null);
  useDialog(dialog, onClose);
  const [v, setV] = useState({ ...EMPTY_PAYER, ...initial });
  const [err, setErr] = useState({});

  const bind = (key, digits) => ({
    value: v[key],
    onChange: (e) => {
      setV({ ...v, [key]: digits ? e.target.value.replace(/\D/g, '').slice(0, digits) : e.target.value });
      setErr({ ...err, [key]: null });
    },
    error: err[key],
  });

  function save() {
    const e = validate(v);
    setErr(e);
    if (Object.keys(e).length) return;
    onSave({ ...v, name: v.name.trim() });
  }

  return (
    <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="payer-title" className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 p-4 outline-none">
      <div className="my-10 w-full max-w-[560px] rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <h3 id="payer-title" className="text-lg font-bold tracking-[-0.03em]">
            Реквизиты для счёта
          </h3>
          <button type="button" onClick={onClose} aria-label="Закрыть" className={`-m-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink/60 transition hover:bg-warm hover:text-ink ${RING}`}>
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <Field label="Наименование плательщика" required placeholder="ООО «Ромашка»" {...bind('name')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ИНН" required inputMode="numeric" placeholder="10 или 12 цифр" {...bind('inn', 12)} />
            <Field label="ОГРН" inputMode="numeric" placeholder="13 или 15 цифр" {...bind('ogrn', 15)} />
          </div>
          <div className="h-px bg-line" />
          <Field label="Email для счёта" required type="email" placeholder="buh@romashka.ru" {...bind('email')} />
          <PhoneField
            value={v.phone}
            onValue={(p) => {
              setV((x) => ({ ...x, phone: p }));
              setErr((x) => ({ ...x, phone: null }));
            }}
            error={err.phone}
          />
          <Field label="Расчётный счёт" inputMode="numeric" placeholder="40702810..." {...bind('account', 20)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Банк" placeholder="ПАО «Сбербанк»" {...bind('bank')} />
            <Field label="БИК" inputMode="numeric" placeholder="9 цифр" {...bind('bik', 9)} />
          </div>
          <Field label="Корр. счёт" inputMode="numeric" placeholder="30101810..." {...bind('corr', 20)} />
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={save}
            className={`inline-flex h-12 items-center justify-center rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-sm transition hover:bg-brand-hover ${RING}`}
          >
            Сохранить
          </button>
          <button type="button" onClick={onClose} className={`rounded-xl px-3 py-3 text-sm font-semibold text-ink/60 hover:text-ink ${RING}`}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
