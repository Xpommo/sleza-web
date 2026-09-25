'use client';

// Почта для запросов о персональных данных — правится в кабинете, окном
// поверх «Документов», как реквизиты (владелец 23.09: «правку почты я бы
// разрешил»). Почта стоит и в политике, и в согласии — правка выпускает
// новые версии обоих документов.

import { useRef, useState } from 'react';
import { CloseIcon, MailIcon } from '../../../../components/app/AppIcons';
import { EMAIL_RE } from '../../../../lib/validate';
import { Field } from '../../start/_shared/AnketaChrome';
import { loadAnketa } from '../../start/_shared/anketaState';
import { saveSiteFields, siteAnketa } from './sites';
import { RING, useDialog } from './SiteChrome';

export default function PdEmailModal({ onClose, onSaved }) {
  const dialog = useRef(null);
  useDialog(dialog, onClose);
  const [initial] = useState(() => siteAnketa(loadAnketa()).contacts?.pdContact || '');
  const [value, setValue] = useState(initial);
  const [error, setError] = useState(null);

  function save() {
    const v = value.trim();
    if (!EMAIL_RE.test(v)) {
      setError(v ? 'Нужен e-mail вида name@site.ru: на него клиенты пришлют отзыв согласия.' : 'Укажите e-mail: без него в политике и согласии не будет способа отозвать согласие.');
      return;
    }
    const changed = v !== initial;
    if (changed) {
      const a = siteAnketa(loadAnketa());
      const at = Date.now();
      const what = 'Изменился e-mail для запросов о персональных данных';
      saveSiteFields({
        contacts: { ...a.contacts, pdContact: v },
        docEdits: [...(a.docEdits || []), { at, doc: '03', what }, { at, doc: '12', what }],
      });
    }
    onSaved?.(changed);
    onClose();
  }

  return (
    <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="pd-title" className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 p-4 outline-none">
      <div className="my-10 w-full max-w-[480px] rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="pd-title" className="text-lg font-bold tracking-[-0.03em]">
              E-mail для запросов о персональных данных
            </h3>
            <p className="mt-2 text-[13px] leading-5 text-ink/60">
              Этот адрес стоит в политике и согласии. На него клиенты пишут, чтобы отозвать согласие или узнать, что вы о них храните. На запрос о данных нужно ответить в течение 10 рабочих дней, поэтому укажите e-mail, который читаете.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Закрыть" className={`-m-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink/60 transition hover:bg-warm hover:text-ink ${RING}`}>
            <CloseIcon size={18} />
          </button>
        </div>
        <div className="mt-5">
          <Field
            label="E-mail"
            required
            placeholder="pd@alfa-school.ru"
            icon={MailIcon}
            inputMode="email"
            autoComplete="off"
            name="pd-requests"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            error={error}
          />
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
