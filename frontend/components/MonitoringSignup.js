'use client';

import { useState } from 'react';

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
const EMAIL_RE = /^[a-zA-Z0-9]([a-zA-Z0-9.+_-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

export default function MonitoringSignup({ hostname, uuid, hasViolations, onEmailCaptured }) {
  const [email,   setEmail]   = useState('');
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState('');

  const emailErr = (() => {
    const v = email.trim();
    if (!v) return 'Введите email';
    if (!EMAIL_RE.test(v)) return 'Некорректный email';
    return null;
  })();

  const submit = async () => {
    setTouched(true);
    if (emailErr) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), hostname, scan_uuid: uuid }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Ошибка. Попробуйте ещё раз.');
        return;
      }
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
      <p className="text-[12px] text-ok font-mono mt-3">
        ✓ Добавили в список. Напомним через 2 месяца.
      </p>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-line">
      <p className="text-[12px] text-ink/55 mb-2 leading-snug">
        {hasViolations
          ? 'Хотите чтобы мы напомнили когда ситуация изменится? Будем следить за сайтом и пришлём письмо если что-то поменяется.'
          : 'Законы меняются — оставьте email, напомним перепроверить через 2 месяца.'}
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          className={`flex-1 min-w-0 border rounded-lg px-3 py-2 text-[13px] text-ink focus:outline-none transition-colors ${
            touched && emailErr
              ? 'border-red-400 bg-red-50 focus:border-red-400'
              : 'border-line-2 focus:border-brand'
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
          className="shrink-0 bg-ink hover:bg-brand disabled:opacity-50 text-white text-[12px] font-bold rounded-lg px-4 py-2 transition-colors"
        >
          {loading ? '…' : hasViolations ? 'Следить →' : 'Напомнить →'}
        </button>
      </div>
      {touched && emailErr && <p className="text-[11px] text-red-500 mt-1">{emailErr}</p>}
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}
