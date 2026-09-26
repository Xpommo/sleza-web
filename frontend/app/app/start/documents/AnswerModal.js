'use client';

// Правка одного ответа прямо из пакета документов (владелец 24.09): «Изменить»
// у документа открывает ровно тот вопрос, из которого взяты его данные, а не
// весь шаг анкеты. Сохранили — превью документа обновилось на месте.
// Варианты и правила — те же, что в анкете (lib/anketaOptions): иначе ответ,
// поправленный здесь, расходился бы с тем, что спрашивает шаг.

import { useRef, useState } from 'react';
import { CloseIcon } from '../../../../components/app/AppIcons';
import { ANALYTICS, PD_FIELDS, PURPOSES, PURPOSE_MAP, purposeLabel } from '../../../../lib/anketaOptions';
import { useDialog } from '../../site/_shared/SiteChrome';
import { Field, RING, Segmented, Tile } from '../_shared/AnketaChrome';
import { loadAnketa, saveAnketa } from '../_shared/anketaState';

export const QUESTION_TITLES = {
  requisites: 'Реквизиты владельца',
  analytics: 'Счётчики на сайте',
  purposes: 'Цели сбора контактов',
  pdFields: 'Данные, которые вы собираете',
  promo: 'Рассылки, SMS и звонки клиентам об акциях',
};

const toggle = (list, value) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

export default function AnswerModal({ kind, onClose, onSaved }) {
  const dialog = useRef(null);
  useDialog(dialog, onClose);
  const [a] = useState(loadAnketa);
  const allowed = PURPOSE_MAP[a.sphere] || PURPOSE_MAP.other;

  const [analytics, setAnalytics] = useState(a.analytics || []);
  const [analyticsOther, setAnalyticsOther] = useState(a.analyticsOther || '');
  const [purposes, setPurposes] = useState((a.purposes || []).filter((v) => allowed.includes(v)));
  const [fields, setFields] = useState(a.pdFields || []);
  const [promo, setPromo] = useState(typeof a.callsBase === 'boolean' ? (a.callsBase ? 'Есть' : 'Нет') : null);
  const [error, setError] = useState(null);
  const [otherError, setOtherError] = useState(null);

  function pickAnalytics(value) {
    const exclusive = ANALYTICS.find((o) => o.value === value)?.exclusive;
    setAnalytics((prev) => (exclusive ? (prev.includes(value) ? [] : [value]) : toggle(prev.filter((v) => !ANALYTICS.find((o) => o.value === v)?.exclusive), value)));
    setError(null);
  }

  function save() {
    let patch;
    if (kind === 'analytics') {
      if (!analytics.length) return setError('Отметьте счётчики или «Ничего из этого нет»: от этого зависит политика обработки куки.');
      if (analytics.includes('other') && !analyticsOther.trim()) return setOtherError('Напишите, какой счётчик стоит: его нужно указать в политике обработки куки.');
      patch = { analytics, analyticsOther: analytics.includes('other') ? analyticsOther.trim() : '' };
    } else if (kind === 'purposes') {
      if (!purposes.length) return setError('Отметьте хотя бы одну цель: без неё согласие не составить.');
      patch = { purposes };
    } else if (kind === 'pdFields') {
      if (!fields.length) return setError('Отметьте хотя бы одно: без состава данных политику и согласие составить нельзя.');
      patch = { pdFields: fields };
    } else if (kind === 'promo') {
      if (!promo) return setError('Выберите «Есть» или «Нет».');
      patch = { callsBase: promo === 'Есть' };
    }
    // Сайт уже работает: поправленный ответ выпускает новую версию затронутых
    // документов, и она видна в «Истории изменений» (как правка реквизитов).
    const cur = loadAnketa();
    const changed = Object.keys(patch).some((k) => JSON.stringify(patch[k]) !== JSON.stringify(cur[k]));
    const DOCS = { analytics: ['02'], purposes: ['03', '12'], pdFields: ['12', '13'], promo: ['03', '12', '13'] };
    if (cur.installed && changed) {
      const at = Date.now();
      patch.docEdits = [...(cur.docEdits || []), ...DOCS[kind].map((doc) => ({ at, doc, what: `Изменён ответ «${QUESTION_TITLES[kind]}»` }))];
    }
    saveAnketa(patch);
    onSaved?.();
    onClose();
  }

  return (
    <div
      ref={dialog}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="answer-title"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 p-4 outline-none"
    >
      <div className="my-10 w-full max-w-[560px] rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <h3 id="answer-title" className="text-lg font-bold tracking-[-0.02em]">
            {QUESTION_TITLES[kind]}
          </h3>
          <button type="button" onClick={onClose} aria-label="Закрыть" className={`-m-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink/60 transition hover:bg-warm hover:text-ink ${RING}`}>
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="mt-5">
          {kind === 'analytics' && (
            <>
              <div className="grid gap-3 sm:grid-cols-2" role="group" aria-labelledby="answer-title">
                {ANALYTICS.map((o) => (
                  <Tile key={o.value} title={o.label} compact selected={analytics.includes(o.value)} onClick={() => pickAnalytics(o.value)} />
                ))}
              </div>
              {analytics.includes('other') && (
                <Field
                  className="mt-4"
                  label="Какой счётчик?" required
                  placeholder="Например: Top.Mail.Ru"
                  value={analyticsOther}
                  onChange={(e) => {
                    setAnalyticsOther(e.target.value);
                    setOtherError(null);
                  }}
                  error={otherError}
                />
              )}
            </>
          )}

          {kind === 'purposes' && (
            <div className="grid gap-3 sm:grid-cols-2" role="group" aria-labelledby="answer-title">
              {PURPOSES.filter((p) => allowed.includes(p.value)).map((p) => (
                <Tile
                  key={p.value}
                  title={purposeLabel(p.value, a.sphere)}
                  compact
                  selected={purposes.includes(p.value)}
                  onClick={() => {
                    setPurposes(toggle(purposes, p.value));
                    setError(null);
                  }}
                />
              ))}
            </div>
          )}

          {kind === 'pdFields' && (
            <div className="grid gap-3 sm:grid-cols-2" role="group" aria-labelledby="answer-title">
              {PD_FIELDS.map((f) => (
                <Tile
                  key={f.value}
                  title={f.label}
                  compact
                  selected={fields.includes(f.value)}
                  onClick={() => {
                    setFields(toggle(fields, f.value));
                    setError(null);
                  }}
                />
              ))}
            </div>
          )}

          {kind === 'promo' && (
            <>
              <Segmented
                options={['Есть', 'Нет']}
                value={promo}
                onChange={(v) => {
                  setPromo(v);
                  setError(null);
                }}
                ariaLabelledby="answer-title"
              />
              {promo === 'Нет' && (
                <p className="mt-3 text-[13px] leading-5 text-ink/60">
                  Звонок или сообщение клиенту о новинке тоже считается рекламой, даже от менеджера: если такое бывает, выберите «Есть».
                  Согласие на рекламу в пакете будет при любом ответе.
                </p>
              )}
            </>
          )}

          {error && (
            <p role="alert" className="mt-3 text-[12px] font-semibold text-danger">
              {error}
            </p>
          )}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3">
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
