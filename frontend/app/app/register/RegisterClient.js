'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckIcon } from '../../../components/app/AppIcons';
import { AuthButton, BrandMark, MailCodeLogin, MaxIcon, RING, TelegramIcon } from '../../../components/app/AuthBits';
import { signIn } from '../start/_shared/anketaState';

// Что продукт делает — текст владельца (25.09). Это не перечень документов:
// список названий ничего не обещает, а эти пять строк называют работу,
// которую мы берём на себя. Не обещаем того, что не контролируем (владелец
// 25.09): ни «защищены от штрафов», ни «сайт всегда соответствует ФЗ» —
// GA, ERID и ссылку на согласие в формах клиент делает сам.
const BENEFITS = [
  ['Создаём документы с учётом специфики вашего бизнеса', 'Ответьте на несколько вопросов о компании. На основе ваших ответов мы подготовим полный пакет документов, соответствующий вашей сфере деятельности.'],
  ['Установка за 1 минуту', 'Просто добавьте одну строку кода. Виджет автоматически разместит куки-баннер, подвал с реквизитами и документами, а также будет следить за актуальностью ссылок.'],
  ['Автоматическая маркировка по реестрам', 'Виджет в фоновом режиме сверяется с реестрами иноагентов, экстремистских и террористических организаций и сам помечает нужные упоминания на ваших страницах.'],
  ['Постоянный мониторинг', 'Мы автоматически проверяем наличие виджета и актуальность документов на вашем сайте. Вам не нужно об этом беспокоиться.'],
  ['Автообновление при смене законов', 'Если законодательство изменится, мы автоматически исправим документы и уведомим вас об этом. Документы на сайте всегда в актуальной редакции.'],
];

// Два отдельных согласия, а не одно на всё: объединять согласие на
// обработку данных с принятием оферты нельзя — это та самая связка,
// которую мы сами называем нарушением ч.1 ст.9 152-ФЗ.
// Галочка — отдельная кнопка, текст со ссылкой рядом: ссылку нельзя класть
// внутрь кнопки, иначе клики конфликтуют и согласие не ставится.
// Текст рядом тоже ставит галочку (аудит 24.09: цель была 18×18, клик по
// тексту ничего не делал), кроме самой ссылки. Имя для скринридера — из
// видимого текста (WCAG 2.5.3), маркер — квадрат 20px/6px, как в плитках.
function Consent({ id, checked, invalid, onToggle, children }) {
  return (
    <div className="flex items-start gap-3 text-[12px] leading-5 text-ink/60">
      <button
        id={id}
        type="button"
        onClick={onToggle}
        role="checkbox"
        aria-checked={checked}
        aria-labelledby={`${id}-text`}
        aria-invalid={invalid || undefined}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${RING} ${
          checked ? 'border-brand bg-brand text-white' : invalid ? 'border-danger bg-danger/[0.06]' : 'border-line-2 bg-white hover:border-brand/50'
        }`}
      >
        {checked && <CheckIcon size={12} />}
      </button>
      <span
        id={`${id}-text`}
        onClick={(e) => {
          if (!e.target.closest('a')) onToggle();
        }}
        className="cursor-pointer select-none py-px"
      >
        {children}
      </span>
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
          ? 'Отметьте оба пункта ниже: без согласия на обработку данных и принятия оферты зарегистрировать аккаунт нельзя.'
          : !pd
            ? 'Отметьте ниже согласие на обработку персональных данных: без него аккаунт не создать.'
            : 'Отметьте ниже, что принимаете условия оферты: это договор с сервисом.',
      );
      // Фокус — на галочку, которой не хватает: ошибка стоит над кнопками
      // входа (правка владельца 8.09), а сами галочки — под ними.
      document.getElementById(!pd ? 'consent-pd' : 'consent-terms')?.focus();
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
            на 1280×800 знак прилипал к заголовку (владелец 24.09, «поехал»). */}
        <div className="relative my-14 max-w-[560px] lg:my-auto lg:py-10">
          <h1 className="text-balance text-[28px] font-bold leading-[1.1] tracking-[-0.045em] sm:text-[36px]">
            Документы для сайта — готовим и держим в порядке
          </h1>
          {/* Утверждение о законодательстве, а не о нашей ответственности:
              «защита» и обещание исхода проверки здесь не употребляются.
              Сжато из тезиса владельца (25.09); было «Собираем их в один
              пакет», где «их» относилось к требованиям, а не к документам.
              Цифры 7 и 12 — из тезиса, под ними нужен список. */}
          <p className="mt-5 text-[15px] leading-6 text-white/65">
            Требования к сайтам описаны в 7 федеральных законах, за нарушения предусмотрено 12 составов КоАП. Мы готовим
            документы под ваш бизнес, подключаем их к сайту одной строкой кода и обновляем вслед за законом.
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

      <section className="flex items-start justify-center px-6 py-10 sm:px-12 lg:min-h-screen lg:items-center lg:px-[6vw] lg:py-12">
        <div className="w-full max-w-[430px]">
          {/* Только заголовок и кнопки (владелец 25.09): без «Добро пожаловать»,
              без строки о цене («лишнее очень», цена — на шаге «Установка») и
              без «Заведём кабинет. Дальше вопросы о сайте и компании…»: она
              обещала не тот порядок шагов (первым идёт профиль), а что будет
              дальше, говорят левая панель и вводные следующих экранов. */}
          <h2 className="text-[28px] font-bold tracking-[-0.045em] text-ink">Регистрация</h2>

          {/* Ошибка — над кнопками входа, хотя галочки под ними (правка
              владельца 8.09): человек жмёт кнопку и смотрит на неё, а не вниз. */}
          {error && (
            <p role="alert" className="mt-6 rounded-xl bg-danger/[0.07] px-4 py-3 text-[13px] font-semibold leading-5 text-danger-ink">
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
            <Consent id="consent-pd" checked={pd} invalid={Boolean(error) && !pd} onToggle={() => { setPd(!pd); setError(null); }}>
              Даю согласие на обработку моих персональных данных{' '}
              (<Link href="#" className="font-semibold text-brand hover:underline">политика</Link>)
            </Consent>
            <Consent id="consent-terms" checked={terms} invalid={Boolean(error) && !terms} onToggle={() => { setTerms(!terms); setError(null); }}>
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
