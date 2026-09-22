'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckIcon } from '../../../components/app/AppIcons';
import { AuthButton, BrandMark, MailCodeLogin, MaxIcon, RING, TelegramIcon } from '../../../components/app/AuthBits';
import { signIn } from '../start/_shared/anketaState';

// Что продукт делает — теми же словами, что и в утверждённом макете.
// Это не перечень документов: список названий ничего не обещает, а эти
// пять строк называют работу, которую мы берём на себя.
const BENEFITS = [
  ['Собираем документы под вашу компанию', 'Заполните анкету о сайте и компании — остальное сделаем по вашим данным и вашей сфере деятельности.'],
  ['Ставим виджет на сайт', 'Одна строка кода: показывает cookie-баннер, ставит внизу страниц подвал со ссылками на документы и реквизиты, следит, чтобы эти ссылки работали.'],
  ['Маркируем упоминания по реестрам', 'Виджет сверяется с реестрами иностранных агентов, экстремистских и террористических организаций и сам маркирует такие упоминания на ваших страницах.'],
  ['Следим, что всё на месте', 'Проверяем виджет и документы на сайте сами — вам этого делать не нужно.'],
  ['Переписываем документы при изменении закона', 'Пришлём письмо, когда обновим.'],
];

// Два отдельных согласия, а не одно на всё: объединять согласие на
// обработку данных с принятием оферты нельзя — это та самая связка,
// которую мы сами называем нарушением ч.1 ст.9 152-ФЗ.
// Галочка — отдельная кнопка, текст со ссылкой рядом: ссылку нельзя класть
// внутрь кнопки, иначе клики конфликтуют и согласие не ставится.
function Consent({ checked, onToggle, label, children }) {
  return (
    <div className="flex items-start gap-3 text-[12px] leading-5 text-ink/60">
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
  const [mailOpen, setMailOpen] = useState(false);

  function consentsOk() {
    if (!pd || !terms) {
      setError(
        !pd && !terms
          ? 'Отметьте оба пункта — без согласия на обработку данных и принятия оферты зарегистрировать аккаунт нельзя.'
          : !pd
            ? 'Нужно согласие на обработку персональных данных — без него аккаунт не создать.'
            : 'Нужно принять условия оферты — это договор с сервисом.',
      );
      return false;
    }
    setError(null);
    return true;
  }

  function start(via, email) {
    if (!consentsOk()) return;
    signIn(via, email);
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
            один пакет документов и одну строку кода.
          </p>

          {/* Без линий между пунктами: это один перечень, а линейки дробили
              его на пять плашек (п.12 ревью Ивана — «три полоски»). Пункты
              разделяет воздух: внутри пункта тесно, между пунктами свободно. */}
          <ul className="mt-10 space-y-6">
            {BENEFITS.map(([title, text]) => (
              <li key={title} className="flex gap-4">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft/20 text-brand-soft">
                  <CheckIcon size={12} />
                </span>
                <div>
                  <p className="text-sm font-bold">{title}</p>
                  <p className="mt-1 text-[13px] leading-5 text-white/55">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-12 lg:px-[6vw]">
        <div className="w-full max-w-[430px]">
          <div className="mb-10 lg:hidden">
            <BrandMark />
          </div>

          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-brand">Добро пожаловать</p>
          <h2 className="text-[38px] font-bold tracking-[-0.045em] text-ink">Регистрация</h2>
          <p className="mt-3 text-[15px] leading-6 text-ink/60">
            Заведём кабинет — дальше вопросы о сайте и компании, и документы под ваш сайт будут готовы.
          </p>

          {/* Ошибка — над кнопками входа, хотя галочки под ними (правка
              владельца 8.09): человек жмёт кнопку и смотрит на неё, а не вниз. */}
          {error && (
            <p role="alert" className="mt-6 rounded-xl bg-danger/[0.07] px-4 py-3 text-[13px] font-semibold leading-5 text-danger">
              {error}
            </p>
          )}
          <div className="mt-8 space-y-3">
            <AuthButton icon={<TelegramIcon />} onClick={() => start('Telegram')}>
              Через Telegram
            </AuthButton>
            <AuthButton icon={<MaxIcon />} onClick={() => start('MAX')}>
              Через MAX
            </AuthButton>
            {/* Почта подтверждается кодом прямо здесь, без отдельного экрана
                (решение владельца 22.09): код и есть вход, второго
                подтверждения на шаге «Ваш профиль» нет. Согласия проверяются
                до отправки письма — без них аккаунт не создать. */}
            <MailCodeLogin
              open={mailOpen}
              onOpen={() => setMailOpen(true)}
              onClose={() => setMailOpen(false)}
              gate={consentsOk}
              submitLabel="Создать аккаунт →"
              onDone={(email) => start('почта', email)}
            />
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

          <p className="mt-6 text-center text-[12px] text-ink/60">
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
