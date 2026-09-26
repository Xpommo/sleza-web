'use client';

// Общие части входа и регистрации: знак, кнопки провайдеров и вход по коду
// из письма. Регистрация и вход — один механизм, один вид (правило живого
// макета): код из письма и там и там раскрывается на месте, под кнопкой
// «Через e-mail», а не отдельным экраном.

import { useRef, useState } from 'react';
import { ChevronIcon, CloseIcon, MailIcon } from './AppIcons';
import { EMAIL_RE } from '../../lib/validate';

export const RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';

// Знак — капля: тот же контур, что носит виджет на сайтах клиентов.
export function TearMark({ size = 30, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M12 2c4 4.6 7 8.4 7 12.2A7 7 0 1 1 5 14.2C5 10.4 8 6.6 12 2Z" fill="currentColor" />
      <path d="M9.4 14.6a2.9 2.9 0 0 0 2.9 2.6" stroke="#fff" strokeOpacity=".55" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function BrandMark({ dark = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <TearMark size={28} className={dark ? 'text-brand-soft' : 'text-brand'} />
      <span className={`text-[17px] font-bold tracking-[-0.035em] ${dark ? 'text-white' : 'text-ink'}`}>
        Слеза Белый Сайт
      </span>
    </div>
  );
}

export function TelegramIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#2AABEE" />
      <path
        d="M5.5 11.8l11-4.3c.5-.2 1 .1.8.9l-1.9 8.9c-.1.6-.5.7-1 .4l-2.7-2-1.3 1.3c-.2.2-.3.3-.6.3l.2-2.8 5.1-4.6c.2-.2 0-.3-.3-.1l-6.3 4-2.7-.8c-.6-.2-.6-.6.1-.9z"
        fill="#fff"
      />
    </svg>
  );
}

export function MaxIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#5B57F5" />
      <path d="M6.4 17V7.4h2.3l3.3 5.2 3.3-5.2h2.3V17h-2.2v-5.8l-2.7 4.2h-1.4l-2.7-4.2V17H6.4z" fill="#fff" />
    </svg>
  );
}

export const MESSENGER_ICONS = { Telegram: TelegramIcon, MAX: MaxIcon };

// Лист на столе, без своей тени и подъёма: тень — только у плавающего
// (правило Float-Only, разбор 24.09).
const BUTTON_BOX = 'rounded-xl border border-line bg-white shadow-sm';

export function AuthButton({ icon, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex h-[58px] w-full items-center gap-3 px-5 text-[15px] font-semibold text-ink transition-colors duration-200 hover:border-line-2 hover:bg-warm ${BUTTON_BOX} ${RING}`}
    >
      {icon}
      {children}
      <ChevronIcon size={16} className="ml-auto text-ink/25 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function Input({ id, label, error, inputRef, className = '', ...rest }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13px] font-bold text-ink-2">
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`h-[50px] w-full rounded-xl border bg-white px-4 text-[15px] font-medium text-ink outline-none transition-all placeholder:text-ink/35 hover:border-line-2 focus:border-brand focus:ring-4 focus:ring-brand/10 ${
          error ? 'border-danger' : 'border-line'
        } ${className}`}
        {...rest}
      />
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-[12px] font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

// «Через e-mail», раскрытое на месте: почта → «Прислать код» → код из письма.
// Код в прототипе принимается любой из шести цифр — честная имитация, как у
// проверки скрипта на шаге установки. gate() — проверка перед отправкой кода
// (на регистрации это галочки согласий); вернула false — письмо не шлём.
// register — тот же блок на «Регистрации»: там не «вход», а подтверждение
// e-mail нового аккаунта (аудит 26.09: экран «Регистрация», кнопка «Создать
// аккаунт», а блок говорил «код для входа»).
export function MailCodeLogin({ open, onOpen, onClose, gate = () => true, submitLabel, onDone, defaultEmail = '', register = false }) {
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState(defaultEmail);
  const [code, setCode] = useState('');
  const [err, setErr] = useState(null);
  const [resent, setResent] = useState(false);
  const codeRef = useRef(null);
  const mailRef = useRef(null);

  if (!open) {
    return (
      <AuthButton icon={<MailIcon size={20} className="text-ink/60" />} onClick={onOpen}>
        Через e-mail
      </AuthButton>
    );
  }

  // Почта и согласия проверяются вместе: при пустой почте и без галочек
  // раньше говорили только про галочки (разбор 25.09).
  function send() {
    const mailOk = EMAIL_RE.test(email.trim());
    setErr(mailOk ? null : register ? 'Нужен e-mail вида name@site.ru: на него придёт код.' : 'Нужен e-mail вида name@site.ru: на него придёт код для входа.');
    if (!gate()) return;
    if (!mailOk) {
      mailRef.current?.focus();
      return;
    }
    setErr(null);
    setCode('');
    setStep('sent');
    setTimeout(() => codeRef.current?.focus(), 0);
  }

  function submit() {
    if (!/^\d{6}$/.test(code)) {
      setErr(code ? 'Код из письма — шесть цифр. Проверьте, не пропущена ли цифра.' : 'Укажите код из письма.');
      codeRef.current?.focus();
      return;
    }
    if (!gate()) return;
    onDone(email.trim());
  }

  function resend() {
    setCode('');
    setErr(null);
    setResent(true);
    codeRef.current?.focus();
    setTimeout(() => setResent(false), 2500);
  }

  return (
    <div className={`p-5 ${BUTTON_BOX}`}>
      <div className="flex items-center gap-3 text-[15px] font-semibold text-ink">
        <MailIcon size={20} className="text-ink/60" />
        Через e-mail
        <button
          type="button"
          onClick={() => {
            setStep('request');
            setErr(null);
            onClose();
          }}
          aria-label={register ? 'Свернуть регистрацию по e-mail' : 'Свернуть вход по e-mail'}
          className={`-my-2 -mr-2 ml-auto flex h-10 w-10 items-center justify-center rounded-lg text-ink/60 transition hover:bg-warm hover:text-ink ${RING}`}
        >
          <CloseIcon size={16} />
        </button>
      </div>

      {step === 'request' ? (
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          noValidate
        >
          <p className="mb-4 text-[13px] leading-5 text-ink/60">{register ? 'Пришлём код, чтобы подтвердить e-mail. Пароль не нужен.' : 'Пришлём код для входа. Пароль не нужен.'}</p>
          <Input
            id="mail-login-email"
            label="E-mail"
            type="email"
            autoComplete="email"
            placeholder="name@site.ru"
            autoFocus
            inputRef={mailRef}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErr(null);
            }}
            error={err}
          />
          <button
            type="submit"
            className={`mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-brand text-sm font-bold text-white shadow-sm transition hover:bg-brand-hover ${RING}`}
          >
            Прислать код
          </button>
        </form>
      ) : (
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          noValidate
        >
          <p className="mb-4 text-[13px] leading-5 text-ink/60">
            Отправили код на <b className="break-all font-bold text-ink">{email.trim()}</b>. Код действует 30 минут.
          </p>
          <Input
            id="mail-login-code"
            label="Код из письма"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="6 цифр"
            className="font-mono tracking-[0.3em]"
            inputRef={codeRef}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
              setErr(null);
            }}
            error={err}
          />
          <button
            type="submit"
            className={`mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-brand text-sm font-bold text-white shadow-sm transition hover:bg-brand-hover ${RING}`}
          >
            {submitLabel}
          </button>
          <p className="mt-4 text-[12px] text-ink/60">
            Не пришло письмо?{' '}
            <button type="button" onClick={resend} className={`rounded font-bold text-ink/60 hover:text-ink ${RING}`}>
              {resent ? 'Отправили ещё раз' : 'Отправить снова'}
            </button>{' '}
            <span className="whitespace-nowrap">
              ·{' '}
              <button
                type="button"
                onClick={() => {
                  setStep('request');
                  setErr(null);
                  setTimeout(() => mailRef.current?.focus(), 0);
                }}
                className={`rounded font-bold text-ink/60 hover:text-ink ${RING}`}
              >
                Изменить e-mail
              </button>
            </span>
          </p>
        </form>
      )}
    </div>
  );
}
