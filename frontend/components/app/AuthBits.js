'use client';

// Общие части входа и регистрации: знак, кнопки провайдеров и вход по коду
// из письма. Регистрация и вход — один механизм, один вид (правило живого
// макета): код из письма и там и там раскрывается на месте, под кнопкой
// «Через e-mail», а не отдельным экраном.

import { Fragment, useEffect, useRef, useState } from 'react';
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

// Заглушка QR-кода: настоящей ссылки на бота в макете нет. Узор постоянный
// (не случайный на каждую отрисовку) — иначе сервер и браузер нарисовали бы
// разное. Три угловых квадрата — чтобы с первого взгляда читался как QR.
const QR_N = 21;
function qrCell(x, y) {
  const inFinder = (fx, fy) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7;
  for (const [fx, fy] of [[0, 0], [QR_N - 7, 0], [0, QR_N - 7]]) {
    if (inFinder(fx, fy)) {
      const dx = x - fx;
      const dy = y - fy;
      const ring = dx === 0 || dy === 0 || dx === 6 || dy === 6;
      const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
      return ring || core;
    }
  }
  return (x * 7 + y * 13 + x * y * 3) % 5 < 2;
}
function QrStub({ label }) {
  const cells = [];
  for (let y = 0; y < QR_N; y++) for (let x = 0; x < QR_N; x++) if (qrCell(x, y)) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
  return (
    <span className="shrink-0 rounded-lg border border-line bg-white p-2">
      <svg width="104" height="104" viewBox={`0 0 ${QR_N} ${QR_N}`} role="img" aria-label={label} className="text-ink" fill="currentColor" shapeRendering="crispEdges">
        {cells}
      </svg>
    </span>
  );
}

// Шесть клеток кода (по образцу СеоПапы, владелец 29.09): поле ввода одно, а
// клетки — только его вид. Так работают вставка кода целиком, подсказка кода
// из уведомления на телефоне (one-time-code) и экранный диктор — у шести
// отдельных полей всё это ломается. Шестая цифра — сразу onComplete.
function CodeCells({ id, label, value, onChange, onComplete, inputRef, error }) {
  const [focused, setFocused] = useState(false);
  const at = Math.min(value.length, 5);
  return (
    <div>
      <div className="relative mx-auto flex w-fit items-center gap-1.5 sm:gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Fragment key={i}>
            {i === 3 && <span aria-hidden="true" className="h-0.5 w-3 rounded bg-ink/30" />}
            <span
              aria-hidden="true"
              className={`flex h-12 w-10 items-center justify-center rounded-xl border bg-white font-mono text-[20px] font-bold text-ink transition sm:h-14 sm:w-11 ${
                error ? 'border-danger' : focused && i === at ? 'border-brand ring-4 ring-brand/10' : 'border-line'
              }`}
            >
              {value[i] || ''}
            </span>
          </Fragment>
        ))}
        <input
          id={id}
          ref={inputRef}
          aria-label={label}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 6);
            onChange(v);
            if (v.length === 6) onComplete(v);
          }}
          className="absolute inset-0 h-full w-full cursor-text opacity-0"
        />
      </div>
      {error && (
        <p id={`${id}-err`} className="mt-2 text-center text-[12px] font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

// Адрес бота — заглушка: настоящего бота ещё нет, в макете он не открывается.
const BOT = '@sleza_belyisait_bot';

// «Через Telegram» / «Через MAX», раскрытое на месте, как «Через e-mail»
// (владелец 29.09, по макету Ивана, оформление — по СеоПапе): наш бот
// присылает шесть цифр, их вводят здесь же, вход — сам после шестой. Бота не
// ищут: имя названо и нажимается, кнопка ведёт прямо в него; у кого мессенджер
// только на телефоне — QR по ссылке (на телефоне ссылки нет, QR там бесполезен).
// Один способ для обоих мессенджеров, и бот сразу — канал для сообщений о
// законе и продлении. В прототипе бот не открывается, код — любые шесть цифр.
// gate() — галочки согласий на регистрации.
// link — тот же блок для привязки второго мессенджера на «Вашем профиле» и в
// «Настройках» (владелец 29.09: «так же через бота»).
export function MessengerCodeLogin({ via, icon, open, onOpen, onClose, gate = () => true, onDone, register = false, link: linking = false }) {
  const [code, setCode] = useState('');
  const [err, setErr] = useState(null);
  const [asked, setAsked] = useState(false);
  const [qr, setQr] = useState(false);
  const [checking, setChecking] = useState(false);
  const [resent, setResent] = useState(false);
  const codeRef = useRef(null);
  const id = `code-${via.toLowerCase()}`;
  // Тот же блок переключили на другой мессенджер — начатый код к нему не относится.
  useEffect(() => {
    setCode('');
    setErr(null);
    setAsked(false);
    setQr(false);
    setChecking(false);
  }, [via]);

  if (!open) {
    return (
      <AuthButton icon={icon} onClick={() => gate() && onOpen()}>
        Через {via}
      </AuthButton>
    );
  }

  function openBot() {
    setAsked(true);
    setErr(null);
    setTimeout(() => codeRef.current?.focus(), 0);
  }

  function submit(v = code) {
    if (!/^\d{6}$/.test(v)) {
      setErr(v ? `Код из ${via} — шесть цифр. Проверьте, не пропущена ли цифра.` : `Укажите код из ${via}.`);
      codeRef.current?.focus();
      return;
    }
    if (!gate()) return;
    setChecking(true);
    setTimeout(onDone, 400);
  }

  function resend() {
    setCode('');
    setErr(null);
    setResent(true);
    codeRef.current?.focus();
    setTimeout(() => setResent(false), 2500);
  }

  const link = `rounded font-bold text-brand hover:text-ink ${RING}`;

  return (
    <div className={`p-5 ${BUTTON_BOX}`}>
      <div className="flex items-center gap-3 text-[15px] font-semibold text-ink">
        {icon}
        {linking ? `Подключить ${via}` : `Через ${via}`}
        <button
          type="button"
          onClick={() => {
            setErr(null);
            onClose();
          }}
          aria-label={linking ? `Отменить подключение ${via}` : register ? `Свернуть регистрацию через ${via}` : `Свернуть вход через ${via}`}
          className={`-my-2 -mr-2 ml-auto tap flex h-10 w-10 items-center justify-center rounded-lg text-ink/60 transition hover:bg-warm hover:text-ink ${RING}`}
        >
          <CloseIcon size={16} />
        </button>
      </div>

      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        noValidate
      >
        <p className="text-center text-[14px] leading-6 text-ink/70">
          Напишите в {via}{' '}
          <button type="button" onClick={openBot} className={`${link} font-semibold`}>
            {BOT}
          </button>{' '}
          «/start» и введите код{register || linking ? '' : ' для входа'}:
        </p>
        <div className="mt-4">
          <CodeCells
            id={id}
            label={`Код из ${via}`}
            value={code}
            onChange={(v) => {
              setCode(v);
              setErr(null);
            }}
            onComplete={submit}
            inputRef={codeRef}
            error={err}
          />
        </div>
        {checking ? (
          <p role="status" className="mt-4 text-center text-[13px] font-semibold text-ink/70">
            Проверяем код…
          </p>
        ) : (
          <button
            type="button"
            onClick={openBot}
            className={`mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white shadow-sm transition hover:bg-brand-hover ${RING}`}
          >
            Открыть {via}
          </button>
        )}
        {asked && !checking && (
          <p role="status" className="mt-2 text-center text-[12px] text-ink/60">
            Бот прислал код в {via}. Код действует 10 минут.
          </p>
        )}
        {qr && (
          <div className="mt-4 hidden flex-col items-center gap-2 sm:flex">
            <QrStub label={`QR-код: бот ${BOT} в ${via}`} />
            <p className="text-center text-[12px] text-ink/60">Наведите камеру телефона: откроется наш бот, нажмите в нём «Старт».</p>
          </div>
        )}
        <p className="mt-4 hidden text-center text-[12px] text-ink/60 sm:block">
          {via} только на телефоне?{' '}
          <button type="button" onClick={() => setQr(!qr)} aria-expanded={qr} className={link}>
            {qr ? 'Скрыть QR-код' : 'Показать QR-код'}
          </button>
        </p>
        <p className="mt-2 text-center text-[12px] text-ink/60">
          Не пришёл код?{' '}
          <button type="button" onClick={resend} className={link}>
            {resent ? 'Отправили ещё раз' : 'Отправить снова'}
          </button>
        </p>
      </form>
    </div>
  );
}

// Способы входа (владелец 29.09): пока ни один не выбран — три большие кнопки;
// выбран — его блок, а остальные ужимаются в «таблетки» под ним: «Или через:
// (М) MAX · (✉) e-mail». Иконка со словом, а не голые круги: значок MAX пока
// мало кто узнаёт в лицо. Под блоком, а не над: альтернативы не спорят с главным.
// Смена — без анимации (владелец 29.09: плавную высоту и растворение
// посмотрел — не нужно). methods: [{ id, label, icon, gate?, node }] — node сам
// рисует и закрытую кнопку, и раскрытый блок.
export function AuthMethods({ methods, openId, onOpen }) {
  const cur = openId && methods.find((m) => m.id === openId);
  if (!cur) {
    return (
      <div className="space-y-3">
        {methods.map((m) => (
          <Fragment key={m.id}>{m.node}</Fragment>
        ))}
      </div>
    );
  }
  return (
    <div>
      {cur.node}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <span className="text-[12px] text-ink/60">Или через:</span>
        {methods
          .filter((m) => m.id !== openId)
          .map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => (m.gate ? m.gate() : true) && onOpen(m.id)}
              aria-label={`Через ${m.label}`}
              className={`inline-flex h-11 items-center gap-2 rounded-full border border-line bg-white pl-2 pr-4 text-[13px] font-semibold text-ink transition hover:border-line-2 hover:bg-warm sm:h-10 ${RING}`}
            >
              <span className="flex h-6 w-6 items-center justify-center">{m.icon}</span>
              {m.label}
            </button>
          ))}
      </div>
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
          className={`-my-2 -mr-2 ml-auto tap flex h-10 w-10 items-center justify-center rounded-lg text-ink/60 transition hover:bg-warm hover:text-ink ${RING}`}
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
