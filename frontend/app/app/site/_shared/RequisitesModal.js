'use client';

// «Реквизиты владельца» прямо в кабинете. Раньше «Изменить» уводило на шаг 4
// анкеты — с её сайдбаром, счётчиком «Шаг 4 из 6» и кнопкой «Далее», которая
// гнала дальше по анкете. Правка реквизитов — не повод проходить анкету.
//
// Форма собственности здесь не меняется: от неё зависит весь набор полей,
// это другой разговор, чем поправить адрес или счёт.

import { useRef, useState } from 'react';
import { CloseIcon } from '../../../../components/app/AppIcons';
import { Field, PhoneField } from '../../start/_shared/AnketaChrome';
import { loadAnketa } from '../../start/_shared/anketaState';
import { saveSiteFields, siteAnketa } from './sites';
import { digitsOnly, ownerLabels, validateRequisites } from '../../start/_shared/requisitesRules';
import { RING, useDialog } from './SiteChrome';

const KEYS = ['inn', 'name', 'ogrn', 'kpp', 'address', 'account', 'bank', 'bik', 'corr', 'companyMail', 'companyPhone'];

function fromAnketa(a) {
  return {
    owner: a.owner,
    inn: a.inn || '',
    name: a.companyName || '',
    ogrn: a.ogrn || '',
    kpp: a.kpp || '',
    address: a.address || '',
    account: a.bank?.account || '',
    bank: a.bank?.bank || '',
    bik: a.bank?.bik || '',
    corr: a.bank?.corr || '',
    companyMail: a.contacts?.companyMail || '',
    companyPhone: a.contacts?.companyPhone || '',
  };
}

export default function RequisitesModal({ onClose, onSaved }) {
  const dialog = useRef(null);
  useDialog(dialog, onClose);
  const [initial] = useState(() => fromAnketa(siteAnketa(loadAnketa())));
  const [v, setV] = useState(initial);
  const [err, setErr] = useState({});
  const L = ownerLabels(v.owner);

  const bind = (key, { digits } = {}) => ({
    value: v[key],
    onChange: (e) => {
      setV({ ...v, [key]: digits ? digitsOnly(e.target.value).slice(0, digits) : e.target.value });
      setErr({ ...err, [key]: null });
    },
    error: err[key],
  });

  function save() {
    const e = validateRequisites(v);
    setErr(e);
    if (Object.keys(e).length) return;
    const changed = KEYS.some((k) => v[k] !== initial[k]);
    if (changed) {
      // Реквизиты открытого сайта: у демо-сайта — в его строку, не в анкету
      // основного (sites.js).
      const a = siteAnketa(loadAnketa());
      saveSiteFields({
        inn: v.inn,
        companyName: v.name,
        ogrn: v.ogrn,
        kpp: v.kpp,
        address: v.address,
        bank: { ...a.bank, account: v.account, bank: v.bank, bik: v.bik, corr: v.corr },
        contacts: { ...a.contacts, companyMail: v.companyMail, companyPhone: v.companyPhone },
        // Реквизиты стоят в документе «Реквизиты владельца» — правка
        // выпускает его новую версию, и она видна в истории изменений.
        docEdits: [...(a.docEdits || []), { at: Date.now(), doc: '01', what: 'Изменились реквизиты' }],
      });
    }
    onSaved?.(changed);
    onClose();
  }

  return (
    <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="req-title" className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 p-4 outline-none">
      <div className="my-10 w-full max-w-[560px] rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="req-title" className="text-lg font-bold tracking-[-0.03em]">
              Реквизиты владельца
            </h3>
            <p className="mt-2 text-[13px] leading-5 text-ink/60">
              Попадают в документ «Реквизиты владельца» и в подвал сайта. Реквизиты для счёта — отдельные, они в
              «Подписке».
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Закрыть" className={`rounded p-1 text-ink/40 hover:text-ink ${RING}`}>
            <CloseIcon size={18} />
          </button>
        </div>

        <p className="mt-5 inline-flex rounded-full bg-warm px-3 py-1.5 text-[12px] font-bold text-ink/60">{v.owner}</p>

        <div className="mt-4 space-y-4">
          <Field label={L.name} required placeholder={L.namePlaceholder} {...bind('name')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ИНН" required inputMode="numeric" placeholder={`${L.innLength} цифр`} {...bind('inn', { digits: L.innLength })} />
            {L.ogrn && (
              <Field label={L.ogrn} required inputMode="numeric" placeholder={`${L.ogrnLength} цифр`} {...bind('ogrn', { digits: L.ogrnLength })} />
            )}
            {L.isOoo && <Field label="КПП" required inputMode="numeric" placeholder="9 цифр" {...bind('kpp', { digits: 9 })} />}
          </div>
          <Field label={L.address} required placeholder={L.addressPlaceholder} {...bind('address')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Почта компании" required type="email" placeholder="info@site.ru" {...bind('companyMail')} />
            <PhoneField
              label="Телефон компании"
              required
              value={v.companyPhone}
              onValue={(p) => {
                setV((x) => ({ ...x, companyPhone: p }));
                setErr((x) => ({ ...x, companyPhone: null }));
              }}
              error={err.companyPhone}
            />
          </div>
          <Field label="Расчётный счёт" required inputMode="numeric" placeholder="40702810..." {...bind('account', { digits: 20 })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Банк" required placeholder="ПАО «Сбербанк»" {...bind('bank')} />
            <Field label="БИК" required inputMode="numeric" placeholder="9 цифр" {...bind('bik', { digits: 9 })} />
          </div>
          <Field label="Корреспондентский счёт" required inputMode="numeric" placeholder="30101810..." {...bind('corr', { digits: 20 })} />
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={save}
            className={`inline-flex h-12 items-center justify-center rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#1a1acc] ${RING}`}
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
