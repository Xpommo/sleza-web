'use client';

import { useState } from 'react';

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function ShareModal({ open, onClose, uuid, mode }) {
  const [email,   setEmail]   = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState('');

  if (!open) return null;

  const reset = () => { setEmail(''); setCompany(''); setDone(false); setError(''); };
  const close = () => { reset(); onClose(); };

  const submit = async () => {
    if (!email.trim())   { setError('Введите email'); return; }
    if (!company.trim()) { setError('Введите название компании'); return; }
    setLoading(true);
    setError('');
    try {
      await fetch(`${BASE}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), company: company.trim(), uuid }),
      });
      if (mode === 'share') {
        const url = `${window.location.origin}?report=${uuid}`;
        await navigator.clipboard.writeText(url).catch(() => {});
      } else {
        window.location.href = `${BASE}/api/results/${uuid}/pdf`;
      }
      setDone(true);
    } catch {
      setError('Ошибка. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}?report=${uuid}`;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-800">
            {mode === 'share' ? '🔗 Поделиться отчётом' : '📄 Скачать PDF'}
          </h2>
          <button onClick={close} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {done ? (
          <div className="text-center py-2">
            {mode === 'share' ? (
              <>
                <div className="text-green-600 text-sm mb-3">✓ Ссылка скопирована в буфер обмена</div>
                <div className="text-xs text-gray-500 font-mono bg-gray-50 border border-gray-200 rounded-lg p-3 break-all">{shareUrl}</div>
                <p className="text-xs text-gray-400 mt-2">Действительна 24 часа</p>
              </>
            ) : (
              <div className="text-green-600 text-sm">✓ PDF загружается…</div>
            )}
            <button onClick={close} className="mt-4 text-xs text-gray-400 hover:text-gray-600">Закрыть</button>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-4">
              Оставьте контакт — мы поможем с устранением нарушений
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Email *</label>
                <input
                  type="email"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:border-blue-400 outline-none"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.ru"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Компания *</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:border-blue-400 outline-none"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="ООО Пример"
                  onKeyDown={e => e.key === 'Enter' && submit()}
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                onClick={submit}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
              >
                {loading ? 'Отправка…' : mode === 'share' ? 'Получить ссылку' : 'Скачать PDF'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
