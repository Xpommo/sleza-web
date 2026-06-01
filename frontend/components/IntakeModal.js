'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { buildIntakePrefill } from '../lib/intakePrefill';
import { fireEvent } from '../lib/analytics';
import { DOC_PRICE } from './DocOfferCard';

const EMAIL_RE = /^[a-zA-Z0-9]([a-zA-Z0-9.+_-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

// Self-declaration intake for the 152-ФЗ + cookie package. Pre-filled from the scan;
// the client confirms what we found and declares what we can't see. Liability framing:
// the client states the facts — we generate from their declaration.
export default function IntakeModal({ open, onClose, data, hostname, uuid, onSubmit }) {
  const prefill = useMemo(() => buildIntakePrefill(data), [data]);

  const [operator, setOperator] = useState({ name: '', inn: '', ogrn: '' });
  const [confirmed, setConfirmed] = useState({});       // known.id → bool
  const [answers, setAnswers] = useState({});            // ask.id → string[] | string
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  // Seed form state from prefill whenever the modal opens for a new scan.
  useEffect(() => {
    if (!open) return;
    setOperator({
      name: prefill.operator.name || '',
      inn:  prefill.operator.inn  || '',
      ogrn: prefill.operator.ogrn || '',
    });
    setConfirmed(Object.fromEntries(prefill.known.map(k => [k.id, k.value])));
    setAnswers({});
    setEmail(''); setConsent(false); setTouched(false); setDone(false); setError('');
    fireEvent('intake_opened', { scanUuid: uuid, hostname });
  }, [open, prefill, uuid, hostname]);

  if (!open) return null;

  const emailErr = !email.trim() ? 'Введите email' : !EMAIL_RE.test(email.trim()) ? 'Некорректный email' : null;
  const canSubmit = !emailErr && consent && !loading;

  const toggleMulti = (fieldId, option) => {
    setAnswers(prev => {
      const cur = Array.isArray(prev[fieldId]) ? prev[fieldId] : [];
      return { ...prev, [fieldId]: cur.includes(option) ? cur.filter(o => o !== option) : [...cur, option] };
    });
  };

  const submit = async () => {
    setTouched(true);
    if (emailErr || !consent) return;
    setLoading(true); setError('');
    const payload = {
      email: email.trim(),
      hostname,
      scan_uuid: uuid || null,
      intent: 'doc_152_cookie',
      price_shown: DOC_PRICE,
      intake: { operator, confirmed, answers },
    };
    try {
      await onSubmit?.(payload);
      fireEvent('intake_submitted', { scanUuid: uuid, hostname });
      setDone(true);
    } catch (e) {
      setError(e?.message || 'Не удалось отправить. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/45 flex items-start sm:items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-line-2 rounded-[14px] w-full max-w-lg my-4 shadow-xl">

        {/* header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-line sticky top-0 bg-white rounded-t-[14px]">
          <h2 className="text-[15px] font-bold tracking-tight">Анкета · пакет 152-ФЗ + cookie</h2>
          <button onClick={onClose} className="text-ink/35 hover:text-ink/70 text-lg leading-none">✕</button>
        </div>

        {done ? (
          <div className="px-5 sm:px-6 py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-ok/15 text-ok flex items-center justify-center text-[22px] font-bold mx-auto mb-3">✓</div>
            <div className="text-[16px] font-bold tracking-tight mb-1">Заявка принята</div>
            <p className="text-[13px] text-ink/55 leading-snug max-w-[40ch] mx-auto">
              Соберём пакет по вашим данным и пришлём на {email.trim()}. Свяжемся в течение рабочего дня.
            </p>
            <button onClick={onClose} className="mt-5 text-[12px] text-ink/40 hover:text-ink/70 font-mono">закрыть</button>
          </div>
        ) : (
          <div className="px-5 sm:px-6 py-5 space-y-6">

            {/* Operator */}
            <section>
              <div className="label-micro mb-2">оператор данных</div>
              <div className="grid sm:grid-cols-2 gap-2.5">
                <input className="border border-line-2 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-brand sm:col-span-2"
                  placeholder="Наименование (ООО / ИП / ФИО)" value={operator.name}
                  onChange={e => setOperator(o => ({ ...o, name: e.target.value }))} />
                <input className="border border-line-2 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-brand"
                  placeholder="ИНН" value={operator.inn}
                  onChange={e => setOperator(o => ({ ...o, inn: e.target.value }))} />
                <input className="border border-line-2 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-brand"
                  placeholder="ОГРН / ОГРНИП" value={operator.ogrn}
                  onChange={e => setOperator(o => ({ ...o, ogrn: e.target.value }))} />
              </div>
            </section>

            {/* Confirm — found by scan */}
            <section>
              <div className="label-micro mb-2">подтвердите — нашли на сайте</div>
              <div className="space-y-2">
                {prefill.known.map(k => (
                  <label key={k.id} className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" className="mt-0.5 shrink-0 accent-brand"
                      checked={!!confirmed[k.id]}
                      onChange={e => setConfirmed(c => ({ ...c, [k.id]: e.target.checked }))} />
                    <span className="text-[13px] text-ink/80 leading-snug">
                      {k.label}
                      {k.note && <span className="block text-[11px] text-ink/40">{k.note}</span>}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            {/* Ask — scan can't know */}
            <section>
              <div className="label-micro mb-2">уточните</div>
              <div className="space-y-4">
                {prefill.ask.map(f => (
                  <div key={f.id}>
                    <div className="text-[13px] font-medium text-ink/80 mb-1.5">{f.label}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {f.options.map(opt => {
                        const selected = f.type === 'multi'
                          ? (answers[f.id] || []).includes(opt)
                          : answers[f.id] === opt;
                        return (
                          <button key={opt} type="button"
                            onClick={() => f.type === 'multi' ? toggleMulti(f.id, opt) : setAnswers(a => ({ ...a, [f.id]: opt }))}
                            className={`text-[12.5px] rounded-full px-3 py-1.5 border transition-colors ${
                              selected ? 'bg-ink text-white border-ink' : 'bg-white text-ink/70 border-line-2 hover:border-ink/30'
                            }`}>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Contact + consent */}
            <section className="border-t border-line pt-5 space-y-3">
              <div>
                <label className="label-micro block mb-1.5">email для пакета *</label>
                <input type="email"
                  className={`w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none transition-colors ${
                    touched && emailErr ? 'border-red-400 bg-red-50 focus:border-red-400' : 'border-line-2 focus:border-brand'
                  }`}
                  placeholder="you@company.ru" value={email}
                  onChange={e => setEmail(e.target.value)}
                  onBlur={() => setTouched(true)} />
                {touched && emailErr && <p className="text-[11px] text-red-500 mt-1">{emailErr}</p>}
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 shrink-0 accent-brand" />
                <span className="text-[12px] text-ink/55 leading-relaxed">
                  Я подтверждаю достоверность указанных данных и даю согласие на{' '}
                  <Link href="/privacy" target="_blank" className="text-brand hover:underline">обработку персональных данных</Link>.
                </span>
              </label>

              {error && <p className="text-[12px] text-red-500">{error}</p>}

              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-[13px] text-ink/60">пакет · <b className="text-ink">{DOC_PRICE}</b></span>
                <button onClick={submit} disabled={!canSubmit}
                  className="bg-ink hover:bg-brand disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg px-5 py-2.5 text-[14px] font-bold transition-colors">
                  {loading ? 'Отправка…' : 'Оставить заявку'}
                </button>
              </div>
              <p className="text-[11px] text-ink/35 leading-snug">
                Оплата не списывается. Это заявка — соберём пакет по вашим данным и пришлём.
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
