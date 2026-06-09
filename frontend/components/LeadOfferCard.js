'use client';

import { useEffect, useState } from 'react';
import { buildIntakePrefill } from '../lib/intakePrefill';
import { fireEvent } from '../lib/analytics';

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
const EMAIL_RE = /^[a-zA-Z0-9]([a-zA-Z0-9.+_-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

export default function LeadOfferCard({ data, hostname, uuid, onEmailCaptured }) {
  const { known, total } = buildIntakePrefill(data).counts;

  const [email,   setEmail]   = useState('');
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    fireEvent('lead_offer_shown', { scanUuid: uuid, hostname });
  }, [uuid, hostname]);

  const emailErr = (() => {
    const v = email.trim();
    if (!v) return 'Введите email';
    if (!EMAIL_RE.test(v)) return 'Некорректный email';
    return null;
  })();

  const submit = async () => {
    setTouched(true);
    if (emailErr) return;
    if (!uuid) { setError('Отчёт ещё готовится — секунду…'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), uuid }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Ошибка. Попробуйте ещё раз.');
        return;
      }
      fireEvent('lead_submitted', { scanUuid: uuid, hostname });
      onEmailCaptured?.(email.trim());
      setDone(true);
    } catch {
      setError('Ошибка сети. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-[10px] border-2 border-ok/30 bg-ok/[0.04] px-5 sm:px-6 py-6">
        <div className="text-[16px] font-bold tracking-tight mb-1">✓ Получили — свяжемся в течение дня</div>
        <div className="text-[13px] text-ink/65 leading-relaxed">
          Напишем на <b className="text-ink">{email.trim()}</b>: что войдёт в пакет документов для{' '}
          <b className="text-ink">{hostname}</b>, сколько стоит и как начать.
          Живой человек, не автоответ.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[10px] border-2 border-brand/30 bg-brand/[0.03] px-5 sm:px-6 py-6 sm:py-7">
      <div className="label-micro mb-1.5 text-brand">что с этим делать</div>
      <div className="text-[19px] sm:text-[20px] font-bold tracking-tight leading-snug mb-1.5">
        Мы берём compliance на себя
      </div>
      <div className="text-[13.5px] text-ink/65 leading-relaxed mb-4 max-w-[56ch]">
        Готовим пакет документов под ваш сайт — Политику конфиденциальности,
        cookie-баннер, согласия на обработку. Размещаем у себя, обновляем
        при изменениях закона. Ресканы сайта — раз в квартал.
      </div>

      {/* Price anchor */}
      <div className="flex items-stretch gap-3 mb-5 text-[13px]">
        <div className="flex-1 rounded-lg bg-danger/[0.05] border border-danger/15 px-3.5 py-3">
          <div className="font-mono text-[9px] uppercase tracking-wider text-ink/35 mb-1">юристы разово</div>
          <div className="font-bold text-ink/70 line-through">75 000 – 200 000 ₽</div>
          <div className="text-[11px] text-ink/40 mt-0.5">документы устаревают при изменении закона</div>
        </div>
        <div className="flex-1 rounded-lg bg-ok/[0.07] border border-ok/25 px-3.5 py-3">
          <div className="font-mono text-[9px] uppercase tracking-wider text-ok/60 mb-1">подписка фонарик</div>
          <div className="font-bold text-ok">от 3 500 ₽/мес</div>
          <div className="text-[11px] text-ink/50 mt-0.5">документы живые, ресканы в подписке</div>
        </div>
      </div>

      {known > 0 && (
        <div className="flex items-center gap-2.5 mb-4 rounded-lg bg-white border border-line px-3.5 py-2.5">
          <span className="w-6 h-6 rounded-full bg-ok/15 text-ok flex items-center justify-center text-[13px] font-bold shrink-0">✓</span>
          <span className="text-[13px] text-ink/75">
            По скану уже знаем <b className="text-ink">{known} из {total}</b> вводных —
            пакет будет под ваш сайт, не шаблонный.
          </span>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="email"
          className={`flex-1 min-w-0 border rounded-lg px-3.5 py-3 text-[14px] text-ink focus:outline-none transition-colors ${
            touched && emailErr ? 'border-red-400 bg-red-50 focus:border-red-400' : 'border-line-2 focus:border-brand'
          }`}
          placeholder="your@email.ru"
          value={email}
          onChange={e => { setEmail(e.target.value); if (touched) setTouched(false); }}
          onBlur={() => setTouched(true)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          disabled={loading}
        />
        <button
          onClick={submit}
          disabled={loading}
          className="shrink-0 bg-ink hover:bg-brand disabled:opacity-50 text-white rounded-lg px-5 py-3 text-[14px] font-bold transition-colors"
        >
          {loading ? '…' : 'Узнать про пакет →'}
        </button>
      </div>
      {touched && emailErr && <p className="text-[11px] text-red-500 mt-1.5">{emailErr}</p>}
      {error && <p className="text-[11px] text-red-500 mt-1.5">{error}</p>}
      <div className="mt-2.5 text-[11px] text-ink/35 leading-snug">
        Без спама — напишем конкретно по вашему сайту: что войдёт, сколько стоит, как начать.
      </div>
    </div>
  );
}
