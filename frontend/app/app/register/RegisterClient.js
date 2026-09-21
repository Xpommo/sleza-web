'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckIcon, ChevronIcon, MailIcon } from '../../../components/app/AppIcons';

const RING = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15';

// Что продукт делает — теми же словами, что и в утверждённом макете.
// Это не перечень документов: список названий ничего не обещает, а эти
// пять строк называют работу, которую мы берём на себя.
const BENEFITS = [
  ['Собираем документы под вашу компанию', 'Заполните анкету о сайте и компании — остальное сделаем по вашим данным и вашей сфере деятельности.'],
  ['Ставим виджет на сайт', 'Один скрипт: показывает cookie-баннер, ставит внизу страниц подвал со ссылками на документы и реквизиты, следит, чтобы эти ссылки работали.'],
  ['Маркируем упоминания по реестрам', 'Скрипт сверяется с реестрами иностранных агентов, экстремистских и террористических организаций и сам маркирует такие упоминания на ваших страницах.'],
  ['Следим, что всё на месте', 'Проверяем виджет и документы на сайте сами — вам этого делать не нужно.'],
  ['Переписываем документы при изменении закона', 'Пришлём письмо, когда обновим.'],
];

// Знак — капля: тот же контур, что носит виджет на сайтах клиентов.
function TearMark({ size = 30, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M12 2c4 4.6 7 8.4 7 12.2A7 7 0 1 1 5 14.2C5 10.4 8 6.6 12 2Z" fill="currentColor" />
      <path d="M9.4 14.6a2.9 2.9 0 0 0 2.9 2.6" stroke="#fff" strokeOpacity=".55" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function BrandMark({ dark = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <TearMark size={28} className={dark ? 'text-brand-soft' : 'text-brand'} />
      <span className={`text-[17px] font-bold tracking-[-0.035em] ${dark ? 'text-white' : 'text-ink'}`}>
        Слеза Белый Сайт
      </span>
    </div>
  );
}

function TelegramIcon({ size = 22 }) {
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

function MaxIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#5B57F5" />
      <path d="M6.4 17V7.4h2.3l3.3 5.2 3.3-5.2h2.3V17h-2.2v-5.8l-2.7 4.2h-1.4l-2.7-4.2V17H6.4z" fill="#fff" />
    </svg>
  );
}

function AuthButton({ icon, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex h-[58px] w-full items-center gap-3 rounded-xl border border-line bg-white px-5 text-[15px] font-semibold text-ink shadow-[0_5px_18px_-14px_rgba(17,17,16,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:border-line-2 hover:shadow-[0_14px_28px_-16px_rgba(17,17,16,0.4)] ${RING}`}
    >
      {icon}
      {children}
      <ChevronIcon size={16} className="ml-auto text-ink/25 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

// Два отдельных согласия, а не одно на всё: объединять согласие на
// обработку данных с принятием оферты нельзя — это та самая связка,
// которую мы сами называем нарушением ч.1 ст.9 152-ФЗ.
// Галочка — отдельная кнопка, текст со ссылкой рядом: ссылку нельзя класть
// внутрь кнопки, иначе клики конфликтуют и согласие не ставится.
function Consent({ checked, onToggle, label, children }) {
  return (
    <div className="flex items-start gap-3 text-[12.5px] leading-5 text-ink/60">
      <button
        type="button"
        onClick={onToggle}
        role="checkbox"
        aria-checked={checked}
        aria-label={label}
        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-all ${RING} ${
          checked ? 'border-brand bg-brand text-white' : 'border-line-2 bg-white hover:border-brand/50'
        }`}
      >
        {checked && <CheckIcon size={11} />}
      </button>
      <span>{children}</span>
    </div>
  );
}

export default function RegisterClient() {
  const router = useRouter();
  const [pd, setPd] = useState(false);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState(null);

  function start() {
    if (!pd || !terms) {
      setError(
        !pd && !terms
          ? 'Отметьте оба пункта — без согласия на обработку данных и принятия оферты зарегистрировать аккаунт нельзя.'
          : !pd
            ? 'Нужно согласие на обработку персональных данных — без него аккаунт не создать.'
            : 'Нужно принять условия оферты — это договор с сервисом.',
      );
      return;
    }
    setError(null);
    router.push('/app/sites');
  }

  return (
    <main className="min-h-screen bg-paper lg:grid lg:grid-cols-2">
      <section className="relative overflow-hidden bg-ink px-7 py-9 text-white sm:px-12 lg:flex lg:min-h-screen lg:flex-col lg:justify-between lg:px-[7vw] lg:py-12">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[440px] w-[440px] rounded-full bg-brand/20 blur-3xl" />
        <BrandMark dark />

        <div className="relative my-14 max-w-[560px] lg:my-0">
          <h1 className="text-[38px] font-bold leading-[1.06] tracking-[-0.045em] sm:text-[44px]">
            Документы для сайта — готовим и держим в порядке
          </h1>
          {/* Утверждение о законодательстве, а не о нашей ответственности:
              «защита» и обещание исхода проверки здесь не употребляются. */}
          <p className="mt-5 text-[15px] leading-6 text-white/65">
            Требования к сайту разбросаны по нескольким федеральным законам, и за каждое есть свой штраф. Собираем их в
            один пакет документов и один скрипт.
          </p>

          <div className="mt-10 border-t border-white/10">
            {BENEFITS.map(([title, text]) => (
              <div key={title} className="flex gap-4 border-b border-white/10 py-4">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft/20 text-brand-soft">
                  <CheckIcon size={12} />
                </span>
                <div>
                  <p className="text-[14.5px] font-bold">{title}</p>
                  <p className="mt-1 text-[13px] leading-5 text-white/55">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-12 lg:px-[6vw]">
        <div className="w-full max-w-[430px]">
          <div className="mb-10 lg:hidden">
            <BrandMark />
          </div>

          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-brand">Добро пожаловать</p>
          <h2 className="text-[38px] font-bold tracking-[-0.045em] text-ink">Регистрация</h2>
          <p className="mt-3 text-[15px] leading-6 text-ink/55">
            Заведём кабинет — дальше вопросы о сайте и компании, и документы под ваш сайт будут готовы.
          </p>

          <div className="mt-8 space-y-3">
            <AuthButton icon={<TelegramIcon />} onClick={start}>
              Через Telegram
            </AuthButton>
            <AuthButton icon={<MaxIcon />} onClick={start}>
              Через MAX
            </AuthButton>
            <AuthButton icon={<MailIcon size={20} className="text-ink/45" />} onClick={start}>
              Через почту
            </AuthButton>
          </div>

          <div className="my-8 h-px bg-line" />

          <div className="space-y-3.5">
            <Consent checked={pd} label="Согласие на обработку персональных данных" onToggle={() => { setPd(!pd); setError(null); }}>
              Даю согласие на обработку моих персональных данных —{' '}
              <Link href="#" className="font-semibold text-brand hover:underline">
                политика
              </Link>
            </Consent>
            <Consent checked={terms} label="Принятие условий оферты" onToggle={() => { setTerms(!terms); setError(null); }}>
              Принимаю{' '}
              <Link href="#" className="font-semibold text-brand hover:underline">
                условия оферты
              </Link>
            </Consent>
          </div>
          {error && <p className="mt-3 text-[12.5px] font-semibold text-danger">{error}</p>}

          <p className="mt-6 text-center text-[12.5px] text-ink/45">
            Уже есть аккаунт?{' '}
            <Link href="/app/login" className="font-semibold text-brand hover:underline">
              Войти
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
