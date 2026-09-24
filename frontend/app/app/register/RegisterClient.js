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
// Вместо перечня обещаний — сам результат: лист документа с данными
// компании, выделенными так же, как на шаге 5 (владелец 24.09: абзацы и
// списки белым по чёрному читались «портянкой»). Лист — картинка, а не текст
// для чтения: скринридеру — одна подпись.
function DocSheet() {
  const mark = 'rounded bg-brand/10 px-1 font-semibold text-ink';
  return (
    <div role="img" aria-label="Пример документа из пакета: политика обработки персональных данных с данными вашей компании" className="relative mt-12 hidden w-[400px] max-w-full lg:block">
      {/* Второй лист под первым — это пакет, а не один документ. */}
      <div className="absolute inset-0 translate-x-5 translate-y-4 rotate-[4deg] rounded-2xl bg-white/[0.08]" />
      <div className="relative -rotate-2 rounded-2xl bg-white p-6 text-ink shadow-[0_30px_60px_-24px_rgba(0,0,0,0.7)]">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/60">152-ФЗ · версия 2 · 24.09.2026</p>
        <p className="mt-2 text-lg font-bold leading-6 tracking-[-0.02em]">Политика обработки персональных данных</p>
        <div className="mt-4 space-y-1.5 text-[12px] leading-6 text-ink/60">
          <p>
            Оператор — <span className={mark}>ООО «Ваша компания»</span>
          </p>
          <p>
            Собираем: <span className={mark}>имя, телефон, почта</span>
          </p>
          <p>
            Цель: <span className={mark}>запись на занятие</span>
          </p>
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
          <span className="font-mono text-[11px] text-ink/60">ваш-сайт.ru/privacy</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ok/10 px-2.5 py-1 text-[11px] font-bold text-ok">
            <span className="h-1.5 w-1.5 rounded-full bg-ok" /> Действует
          </span>
        </div>
      </div>
    </div>
  );
}

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

        {/* my-auto — по центру свободного места под знаком: с justify-between
            блок прижимался к знаку, когда текст не помещался по высоте. */}
        <div className="relative my-14 max-w-[560px] lg:my-auto lg:py-10">
          <h1 className="text-balance text-[38px] font-bold leading-[1.06] tracking-[-0.045em] sm:text-[44px]">
            Документы для сайта — готовим и держим в порядке
          </h1>
          <p className="mt-5 max-w-[440px] text-[16px] leading-6 text-white/65">
            Ответьте на вопросы о сайте — документы и <span className="whitespace-nowrap">куки-баннер</span> соберём сами.
          </p>
          <DocSheet />
        </div>

      </section>

      <section className="flex items-start justify-center px-6 py-10 sm:px-12 lg:min-h-screen lg:items-center lg:px-[6vw] lg:py-12">
        <div className="w-full max-w-[430px]">

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
