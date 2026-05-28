'use client';

import Link from 'next/link';
import { useState, useCallback, useEffect } from 'react';

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// ── Client-side validation (mirrors backend validateLead.js) ─────────────────

const EMAIL_RE = /^[a-zA-Z0-9]([a-zA-Z0-9.+_-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

const COMPANY_JUNK = new Set([
  'test', 'тест', 'aaa', 'ааа', 'bbb', 'ббб', 'ccc', 'ввв',
  'asdf', 'qwerty', 'йцукен', 'фыва', 'zxcv', 'null', 'none',
  'company', 'компания', 'фирма', 'org', 'organization',
  'no', 'нет', 'na', 'n/a', 'xxx', 'yyy', 'zzz',
]);

function checkEmail(email) {
  const v = email.trim();
  if (!v) return 'Введите email';
  if (v.indexOf('..') !== -1 || v.startsWith('.') || v.split('@')[0]?.endsWith('.'))
    return 'Некорректный email';
  if (!EMAIL_RE.test(v)) return 'Некорректный email — проверьте формат';
  return null;
}

function checkCompany(company) {
  const v = company.trim();
  if (!v) return 'Введите название компании';
  if (v.length < 2) return 'Слишком короткое';
  const letters = v.match(/[a-zA-Zа-яёА-ЯЁ]/g) || [];
  if (letters.length < 2) return 'Введите корректное название';
  if (new Set(v.toLowerCase().replace(/\s/g, '')).size <= 1) return 'Введите корректное название';
  if (COMPANY_JUNK.has(v.toLowerCase())) return 'Введите реальное название компании';
  return null;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ShareModal({ open, onClose, uuid, mode, defaultEmail = '' }) {
  const [email,        setEmail]        = useState(defaultEmail);
  const [company,      setCompany]      = useState('');
  const [emailErr,     setEmailErr]     = useState('');
  const [companyErr,   setCompanyErr]   = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [compTouched,  setCompTouched]  = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [done,            setDone]            = useState(false);
  const [submitError,     setSubmitError]     = useState('');
  const [consentChecked,  setConsentChecked]  = useState(false);

  useEffect(() => {
    if (defaultEmail) setEmail(defaultEmail);
  }, [defaultEmail]);

  if (!open) return null;

  const reset = () => {
    setEmail(''); setCompany('');
    setEmailErr(''); setCompanyErr('');
    setEmailTouched(false); setCompTouched(false);
    setDone(false); setSubmitError(''); setConsentChecked(false);
  };
  const close = () => { reset(); onClose(); };

  const handleEmail = (v) => {
    setEmail(v);
    if (emailTouched) setEmailErr(checkEmail(v) || '');
  };

  const handleCompany = (v) => {
    setCompany(v);
    if (compTouched) setCompanyErr(checkCompany(v) || '');
  };

  const emailOk   = !checkEmail(email);
  const companyOk = !checkCompany(company);
  const canSubmit = emailOk && companyOk && consentChecked && !loading;

  const submit = async () => {
    // Show all errors on submit
    setEmailTouched(true);
    setCompTouched(true);
    const eErr = checkEmail(email);
    const cErr = checkCompany(company);
    setEmailErr(eErr || '');
    setCompanyErr(cErr || '');
    if (eErr || cErr) return;

    setLoading(true);
    setSubmitError('');
    try {
      const res = await fetch(`${BASE}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), company: company.trim(), uuid }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSubmitError(body.error || 'Ошибка. Попробуйте ещё раз.');
        return;
      }
      if (mode === 'share') {
        const url = `${window.location.origin}?report=${uuid}`;
        await navigator.clipboard.writeText(url).catch(() => {});
      } else {
        window.location.href = `${BASE}/api/results/${uuid}/pdf`;
      }
      setDone(true);
    } catch {
      setSubmitError('Ошибка сети. Попробуйте ещё раз.');
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

              {/* Email field */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Email *</label>
                <input
                  type="email"
                  className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none transition-colors ${
                    emailTouched && emailErr
                      ? 'border-red-400 focus:border-red-400 bg-red-50'
                      : emailTouched && emailOk
                        ? 'border-green-400 focus:border-green-400'
                        : 'border-gray-200 focus:border-blue-400'
                  }`}
                  value={email}
                  onChange={e => handleEmail(e.target.value)}
                  onBlur={() => { setEmailTouched(true); setEmailErr(checkEmail(email) || ''); }}
                  placeholder="you@company.ru"
                  autoFocus
                />
                {emailTouched && emailErr && (
                  <p className="text-xs text-red-500 mt-1">{emailErr}</p>
                )}
              </div>

              {/* Company field */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Компания *</label>
                <input
                  type="text"
                  className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none transition-colors ${
                    compTouched && companyErr
                      ? 'border-red-400 focus:border-red-400 bg-red-50'
                      : compTouched && companyOk
                        ? 'border-green-400 focus:border-green-400'
                        : 'border-gray-200 focus:border-blue-400'
                  }`}
                  value={company}
                  onChange={e => handleCompany(e.target.value)}
                  onBlur={() => { setCompTouched(true); setCompanyErr(checkCompany(company) || ''); }}
                  placeholder="ООО Пример"
                  onKeyDown={e => e.key === 'Enter' && submit()}
                />
                {compTouched && companyErr && (
                  <p className="text-xs text-red-500 mt-1">{companyErr}</p>
                )}
              </div>

              {/* Consent checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={e => setConsentChecked(e.target.checked)}
                  className="mt-0.5 shrink-0 accent-blue-600"
                />
                <span className="text-xs text-gray-500 leading-relaxed">
                  Я даю согласие на{' '}
                  <Link href="/privacy" target="_blank" className="text-blue-600 hover:underline">
                    обработку персональных данных
                  </Link>{' '}
                  в соответствии с политикой конфиденциальности
                </span>
              </label>

              {submitError && <p className="text-xs text-red-500">{submitError}</p>}

              <button
                onClick={submit}
                disabled={!canSubmit}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
              >
                {loading ? 'Проверка…' : mode === 'share' ? 'Получить ссылку' : 'Скачать PDF'}
              </button>

              {(!emailOk || !companyOk) && (emailTouched || compTouched) && (
                <p className="text-xs text-center text-gray-400">
                  Заполните все поля корректно чтобы продолжить
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
