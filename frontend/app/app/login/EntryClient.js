'use client';

// Вход и регистрация — одна страница (владелец 30.09, по замечанию тестировщика:
// «„Уже есть аккаунт? Войти“ перекидывает на немного другую, но по смыслу ту же
// страницу»). Пароля в продукте нет, поэтому «войти» и «зарегистрироваться» —
// одно действие: подтвердить, что это вы (код от бота или из письма). Код
// подтверждён, аккаунт есть — сразу в кабинет; аккаунта нет — один шаг «Создаём
// аккаунт» с двумя отдельными согласиями (152-ФЗ ст.9 и оферта). Галочки больше
// не стоят на первом экране у того, кто пришёл второй раз. /app/login и
// /app/register — одна и та же страница.
// Вопрос юристу №11: согласие после кода, а не до (сам код по просьбе человека —
// ст.6 ч.1 п.5 152-ФЗ, действие для заключения договора).

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckIcon } from '../../../components/app/AppIcons';
import { AuthMethods, BrandMark, MailCodeLogin, MaxIcon, MessengerCodeLogin, RING, TelegramIcon } from '../../../components/app/AuthBits';
import { MailIcon } from '../../../components/app/AppIcons';
import { loadAnketa, signIn } from '../start/_shared/anketaState';
import { btn } from '../../../components/app/Button';
import { announce } from '../../../lib/announce';

// Что человек получит и зачем — коротко, четырьмя ответами (текст владельца
// 29.09): регистрацию открывают и те, кто не читал лендинг, а прежние пять
// абзацев на ноутбуке не помещались без прокрутки. Не обещаем того, что не
// контролируем (владелец 25.09): ни «защищены от штрафов», ни «закрываем
// требования» — GA, ERID и ссылку на согласие в формах клиент делает сам.
// Маркировку по реестрам пока не показываем (владелец 29.09).
const BENEFITS = [
  ['Под ваш бизнес', 'Документы собираются по вашим ответам: чем занимаетесь, какие данные собираете, какие счётчики и формы стоят на сайте.'],
  ['Не устаревают', 'Меняется закон — обновляем документы на сайте и пишем вам, что изменилось. Скачанный файл так не умеет.'],
  ['Следим за сайтом', 'Проверяем, что виджет и документы на сайте на месте.'],
  ['10–15 минут на подключение', 'Анкета и одна строка кода, инструкция под вашу платформу.'],
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
        className={`tap flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${RING} ${
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

// Прототип: аккаунт «есть», если в анкете уже есть след — чем входили, почта,
// сайт (пресеты панели «Макет» тоже). В продукте это ответ сервера после кода.
function hasAccount() {
  const a = loadAnketa();
  return Boolean(a.authVia || a.personEmail || a.domain || a.stepsDone);
}

export default function EntryClient() {
  const router = useRouter();
  const [pd, setPd] = useState(false);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState(null);
  // Раскрыт один способ за раз: Telegram, MAX или почта.
  const [openVia, setOpenVia] = useState(null);
  // Код подтверждён, аккаунта нет — шаг «Создаём аккаунт».
  const [pending, setPending] = useState(null);
  const newHead = useRef(null);

  useEffect(() => {
    if (!pending) return;
    newHead.current?.focus();
    announce('Код подтверждён. Создаём аккаунт.');
  }, [pending]);

  function consentsOk() {
    if (!pd || !terms) {
      setError(
        !pd && !terms
          ? 'Отметьте оба пункта: без согласия на обработку данных и принятия оферты зарегистрировать аккаунт нельзя.'
          : !pd
            ? 'Отметьте согласие на обработку персональных данных: без него аккаунт не создать.'
            : 'Отметьте, что принимаете условия оферты: это договор с сервисом.',
      );
      // Фокус — на галочку, которой не хватает; ошибка — над кнопкой
      // «Создать аккаунт» (правило владельца 8.09: смотрят на кнопку).
      document.getElementById(!pd ? 'consent-pd' : 'consent-terms')?.focus();
      return false;
    }
    setError(null);
    return true;
  }

  function enter(via, email) {
    if (hasAccount()) {
      signIn(via, email);
      router.push('/app/sites');
      return;
    }
    setPending({ via, email });
  }

  function create() {
    if (!consentsOk()) return;
    signIn(pending.via, pending.email);
    router.push('/app/sites');
  }

  return (
    <main className="flex min-h-screen min-h-dvh flex-col bg-paper lg:grid lg:grid-cols-2">
      {/* На телефоне сначала форма, панель с преимуществами под ней (владелец
          26.09: кнопки входа были на полтора экрана ниже первого). Порядок в
          разметке прежний — меняется только показ, на компьютере всё как было. */}
      <section className="relative order-2 overflow-hidden bg-ink px-7 py-9 text-white sm:px-12 lg:order-none lg:flex lg:min-h-screen min-h-dvh lg:flex-col lg:justify-between lg:px-[7vw] lg:py-12">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[440px] w-[440px] rounded-full bg-brand/20 blur-3xl" />
        {/* На телефоне знак уже стоит над формой — второй раз не повторяем. */}
        <div className="hidden lg:block">
          <BrandMark dark />
        </div>

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
          {/* «7 федеральных законах» — список владельца (29.09): 114-ФЗ, 149-ФЗ, 152-ФЗ,
              38-ФЗ, 436-ФЗ, 3-ФЗ (наркотические средства), Закон «О защите прав
              потребителей». Полные названия — в HANDOFF. */}
          <p className="mt-5 text-[15px] leading-6 text-white/65">
            Требования к сайтам описаны в 7 федеральных законах. Мы готовим документы под ваш бизнес и обновляем их, пока
            действует подписка.
          </p>

          {/* Список с галочками (владелец 29.09: карточки 2×2 не подошли).
              Без линий между пунктами: это один перечень (п.12 ревью Ивана —
              «три полоски»). Пункты разделяет воздух. */}
          <ul className="mt-9 space-y-5">
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

      <section className="order-1 flex items-start justify-center px-7 py-9 sm:px-12 lg:order-none lg:min-h-screen min-h-dvh lg:items-center lg:px-[6vw] lg:py-12">
        <div className="w-full max-w-[430px]">
          {/* Только заголовок и кнопки (владелец 25.09): без «Добро пожаловать»,
              без строки о цене («лишнее очень», цена — на шаге «Установка») и
              без «Заведём кабинет. Дальше вопросы о сайте и компании…»: она
              обещала не тот порядок шагов (первым идёт профиль), а что будет
              дальше, говорят левая панель и вводные следующих экранов. */}
          {/* Знак продукта над формой — только на телефоне: там форма теперь
              первая, а тёмная панель со знаком ушла вниз. */}
          <div className="mb-9 lg:hidden">
            <BrandMark />
          </div>
          <h2 className="text-[28px] font-bold tracking-[-0.045em] text-ink sm:text-[36px]">Вход в кабинет</h2>
          {!pending && <p className="mt-3 text-[15px] leading-6 text-ink/60">Пароль не нужен. Если вы здесь впервые, аккаунт создадим после кода.</p>}
          {pending ? (
            <section aria-labelledby="new-account" className="mt-8">
              <h3 id="new-account" ref={newHead} tabIndex={-1} className="text-lg font-bold tracking-[-0.02em] outline-none">
                Создаём аккаунт
              </h3>
              <p className="mt-1 text-[13px] leading-5 text-ink/60">
                {pending.via === 'почта' ? `E-mail ${pending.email} подтверждён.` : `Вход через ${pending.via} подтверждён.`} Осталось два согласия.
              </p>
              <div className="mt-6 space-y-3.5">
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
              {error && (
                <p role="alert" className="mt-6 rounded-xl bg-danger/[0.07] px-4 py-3 text-[13px] font-semibold leading-5 text-danger-ink">
                  {error}
                </p>
              )}
              <button type="button" onClick={create} className={btn({ size: 'lg', full: true, className: 'mt-6' })}>
                Создать аккаунт
              </button>
              <button
                type="button"
                onClick={() => {
                  setPending(null);
                  setOpenVia(null);
                  setError(null);
                }}
                className={btn({ variant: 'quiet', size: 'sm', className: 'mt-2' })}
              >
                Другой способ входа
              </button>
            </section>
          ) : (
          <div className="mt-8">
            {/* Мессенджер подтверждается кодом от нашего бота прямо здесь, как
                почта (владелец 29.09, по макету Ивана). Согласия проверяются
                до того, как блок раскроется, и ещё раз перед созданием. Почта
                подтверждается кодом прямо здесь, без отдельного экрана (решение
                владельца 22.09): код и есть вход, второго подтверждения на шаге
                «Ваш профиль» нет. Раскрыт один способ, остальные — «таблетками»
                под ним (AuthMethods). */}
            <AuthMethods
              openId={openVia}
              onOpen={setOpenVia}
              methods={[
                ...[['Telegram', TelegramIcon], ['MAX', MaxIcon]].map(([via, Icon]) => ({
                  id: via,
                  label: via,
                  icon: <Icon size={20} />,
                  node: (
                    <MessengerCodeLogin
                      via={via}
                      icon={<Icon />}
                      open={openVia === via}
                      onOpen={() => setOpenVia(via)}
                      onClose={() => setOpenVia(null)}
                      onDone={() => enter(via)}
                    />
                  ),
                })),
                {
                  id: 'почта',
                  label: 'e-mail',
                  icon: <MailIcon size={18} className="text-ink/60" />,
                  node: (
                    <MailCodeLogin
                      open={openVia === 'почта'}
                      onOpen={() => setOpenVia('почта')}
                      onClose={() => setOpenVia(null)}
                      submitLabel="Войти →"
                      onDone={(email) => enter('почта', email)}
                    />
                  ),
                },
              ]}
            />
          </div>

          )}
          {/* Своих политики и оферты у продукта пока нет — ссылки в «#»
              (открытый вопрос владельцу, HANDOFF). */}
          <p className="mt-10 border-t border-line pt-6 text-center text-[12px] text-ink/60">
            <Link href="#" className="hover:text-ink">
              Политика обработки персональных данных
            </Link>{' '}
            ·{' '}
            <Link href="#" className="hover:text-ink">
              Оферта
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
