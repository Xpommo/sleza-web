'use client';

import { useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FlashlightIcon from '../../../components/FlashlightIcon';
import {
  TelegramIcon, VkIcon, MaxIcon,
  EyeIcon, EyeOffIcon, AlertIcon,
} from '../../../components/auth/AuthIcons';
import { validateEmail, validatePhone, formatPhone } from '../../../lib/validate';

// Экран входа — макет. Формы и валидация живые, но сессия не создаётся.
//
// Вход намеренно «тихий»: ни маркетингового блока, ни подзаголовка. Сюда приходит
// человек, у которого уже есть аккаунт, — ему нужно быстро попасть внутрь, а не читать
// о пользе сервиса. Блок пользы принадлежит экрану регистрации.
//
// Стили только из токенов globals.css — никаких сторонних палитр и брендовых цветов.

const FIELD_BASE =
  'w-full rounded-lg border-[1.5px] bg-white px-4 py-3.5 text-[16px] text-ink ' +
  'placeholder:text-ink/25 transition-colors focus:outline-none';
const FIELD_OK =
  'border-line-2 focus:border-brand focus:shadow-[0_0_0_4px_rgba(31,31,230,0.08)]';
const FIELD_ERR =
  'border-danger bg-[var(--danger-tint)] focus:border-danger focus:shadow-[0_0_0_4px_rgba(214,56,22,0.10)]';

const RING =
  'focus-visible:outline-none focus-visible:border-brand ' +
  'focus-visible:shadow-[0_0_0_4px_rgba(31,31,230,0.08)]';

const PROVIDERS = [
  { id: 'telegram', label: 'Telegram', Icon: TelegramIcon },
  { id: 'vk',       label: 'ВК',       Icon: VkIcon },
  { id: 'max',      label: 'MAX',      Icon: MaxIcon },
];

function FieldError({ id, message }) {
  // Контейнер живёт всегда — тогда появление текста озвучивается скринридером.
  return (
    <div aria-live="polite" className="min-h-[18px]">
      {message && (
        <p id={id} className="flex items-center gap-1.5 pt-1.5 text-[12px] text-danger">
          <AlertIcon />
          {message}
        </p>
      )}
    </div>
  );
}

export default function LoginClient() {
  const [mode, setMode]         = useState('email');   // email | phone
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [touched, setTouched]   = useState({ login: false, password: false });
  const [loading, setLoading]   = useState(false);
  const [notice, setNotice]     = useState('');

  const router = useRouter();
  const loginRef = useRef(null);
  const passRef  = useRef(null);
  const uid = useId();
  const loginId   = `${uid}-login`;
  const passId    = `${uid}-pass`;
  const loginErrId = `${uid}-login-err`;
  const passErrId  = `${uid}-pass-err`;

  const isEmail   = mode === 'email';
  const loginErr  = isEmail ? validateEmail(email) : validatePhone(phone);
  const passErr   = password ? null : 'Введите пароль';
  const showLoginErr = touched.login && loginErr;
  const showPassErr  = touched.password && passErr;

  const demo = (text) => { setNotice(text); setLoading(false); };

  // Сессии нет — это прототип. Показываем состояние загрузки и уходим на панель проектов,
  // чтобы по макету можно было ходить как по продукту.
  const enter = () => {
    setNotice('');
    setLoading(true);
    setTimeout(() => router.push('/app'), 600);
  };

  const switchMode = (next) => {
    if (next === mode) return;
    setMode(next);
    setTouched(t => ({ ...t, login: false }));   // не ругаемся на поле, которое ещё не заполняли
    setNotice('');
  };

  const submit = (e) => {
    e.preventDefault();
    setTouched({ login: true, password: true });
    setNotice('');
    if (loginErr)     { loginRef.current?.focus(); return; }
    if (passErr)      { passRef.current?.focus();  return; }
    enter();
  };

  return (
    // Одна центрированная колонка вместо сплит-экрана: на входе продавать нечего.
    <div className="min-h-screen">
      {/* pb с запасом: снизу висит глобальный CookieBanner, он не должен накрывать подвал */}
      <main className="flex min-h-screen items-center justify-center px-6 pb-40 pt-12">
        <div className="w-full max-w-[400px]">

          {/* шапка */}
          <div className="mb-8">
            <div className="mb-7 flex items-center gap-2.5">
              <Link
                href="/"
                className={`inline-flex items-center gap-2 rounded ${RING}`}
              >
                <FlashlightIcon width={26} height={17} />
                <span className="text-[15px] font-extrabold tracking-[-0.02em]">ШтрафКонтроль</span>
              </Link>
              <span className="rounded-full border border-line-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink/45">
                макет
              </span>
            </div>
            <h1 className="text-[30px] font-extrabold leading-tight tracking-[-0.035em] sm:text-[34px]">
              Вход в кабинет
            </h1>
          </div>

          {/* переключатель способа ввода */}
          <div
            role="group"
            aria-label="Способ входа"
            className="mb-5 inline-flex gap-1 rounded-lg border border-line-2 bg-white p-1"
          >
            {[['email', 'Почта'], ['phone', 'Телефон']].map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => switchMode(value)}
                className={`rounded-[6px] px-4 py-2.5 text-[13px] font-semibold transition-colors ${RING} ${
                  mode === value ? 'bg-ink text-white' : 'text-ink/60 hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} noValidate>
            {/* логин: почта или телефон */}
            <div>
              <label htmlFor={loginId} className="mb-1.5 block text-[13px] font-semibold text-ink">
                {isEmail ? 'Email' : 'Телефон'}
              </label>
              {isEmail ? (
                <input
                  id={loginId}
                  ref={loginRef}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  spellCheck={false}
                  placeholder="you@company.ru"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, login: true }))}
                  aria-invalid={!!showLoginErr}
                  aria-describedby={showLoginErr ? loginErrId : undefined}
                  className={`${FIELD_BASE} ${showLoginErr ? FIELD_ERR : FIELD_OK}`}
                />
              ) : (
                <input
                  id={loginId}
                  ref={loginRef}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+7 (999) 123-45-67"
                  value={phone}
                  onChange={e => setPhone(formatPhone(e.target.value))}
                  onBlur={() => setTouched(t => ({ ...t, login: true }))}
                  aria-invalid={!!showLoginErr}
                  aria-describedby={showLoginErr ? loginErrId : undefined}
                  className={`${FIELD_BASE} ${showLoginErr ? FIELD_ERR : FIELD_OK}`}
                />
              )}
              <FieldError id={loginErrId} message={showLoginErr ? loginErr : null} />
            </div>

            {/* пароль */}
            <div className="mt-4">
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <label htmlFor={passId} className="text-[13px] font-semibold text-ink">
                  Пароль
                </label>
                <button
                  type="button"
                  onClick={() => demo('Восстановление пароля появится вместе с авторизацией.')}
                  className={`rounded text-[12px] text-ink/55 transition-colors hover:text-brand ${RING}`}
                >
                  Забыли пароль?
                </button>
              </div>
              <div className="relative">
                <input
                  id={passId}
                  ref={passRef}
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, password: true }))}
                  aria-invalid={!!showPassErr}
                  aria-describedby={showPassErr ? passErrId : undefined}
                  className={`${FIELD_BASE} pr-14 ${showPassErr ? FIELD_ERR : FIELD_OK}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  aria-pressed={showPass}
                  aria-label={showPass ? 'Скрыть пароль' : 'Показать пароль'}
                  className={`absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-lg text-ink/45 transition-colors hover:text-ink ${RING}`}
                >
                  {showPass ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <FieldError id={passErrId} message={showPassErr ? passErr : null} />
            </div>

            {/* запомнить — по умолчанию выключено */}
            <label className="mt-3 flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="h-4 w-4 shrink-0 accent-brand"
              />
              <span className="text-[13px] text-ink/65">Запомнить меня на этом устройстве</span>
            </label>

            {/* основное действие */}
            <button
              type="submit"
              disabled={loading}
              className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ink py-4 text-[14px] font-bold text-white transition-colors hover:bg-brand disabled:cursor-progress disabled:opacity-60 ${RING}`}
            >
              {loading ? 'Входим…' : <>Войти <span aria-hidden="true">→</span></>}
            </button>
          </form>

          {/* сообщение о том, что это макет */}
          <div aria-live="polite">
            {notice && (
              <p
                role="status"
                className="mt-4 rounded-lg border border-brand/20 bg-[var(--brand-tint)] px-3.5 py-3 text-[13px] leading-snug text-ink/75"
              >
                {notice}
              </p>
            )}
          </div>

          {/* альтернативные способы */}
          <div className="my-7 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink/45">
              или войти через
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>

          {/* Один ряд вместо трёх строк: это альтернатива, а не равноправный путь.
              Подписи оставлены — MAX новый, по одному знаку его не узнают. */}
          <div className="grid grid-cols-3 gap-2">
            {PROVIDERS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={enter}
                className={`inline-flex flex-col items-center justify-center gap-1.5 rounded-lg border border-line-2 bg-white px-2 py-3 text-[12.5px] font-semibold text-ink transition-colors hover:border-ink/30 ${RING}`}
              >
                <Icon className="text-ink/70" />
                {label}
              </button>
            ))}
          </div>

          {/* регистрация */}
          <p className="mt-7 text-center text-[13px] text-ink/65">
            Нет аккаунта?{' '}
            <button
              type="button"
              onClick={() => demo('Регистрация появится вместе с авторизацией.')}
              className={`rounded font-semibold text-brand transition-colors hover:underline ${RING}`}
            >
              Создать
            </button>
          </p>

          {/* правовой подвал — вход это точка сбора ПДн */}
          <p className="mt-8 border-t border-line pt-5 text-center text-[12px] leading-relaxed text-ink/55">
            <Link href="/privacy" className={`rounded transition-colors hover:text-brand ${RING}`}>
              Политика конфиденциальности
            </Link>
            <span className="mx-2 text-ink/25">·</span>
            <button
              type="button"
              onClick={() => demo('Оферта готовится — появится до первой оплаты.')}
              className={`rounded transition-colors hover:text-brand ${RING}`}
            >
              Оферта
            </button>
          </p>
        </div>
      </main>

    </div>
  );
}
