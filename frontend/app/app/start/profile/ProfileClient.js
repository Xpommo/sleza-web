'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ShieldCheckIcon,
  UserIcon,
  PhoneIcon,
  MailIcon,
  BurgerIcon,
} from '../../../../components/app/AppIcons';
import { CURRENT_USER } from '../../../../lib/appMock';
import { validateEmail } from '../../../../lib/validate';
import { RING, Logo, Progress, Sidebar, Field } from '../_shared/AnketaChrome';
import { loadAnketa, markStepDone, saveAnketa } from '../_shared/anketaState';

const ROLES = ['Директор / собственник', 'Сотрудник', 'Подрядчик'];

// Способы входа — те же две строки, что в «Настройках». На шаге 1 список
// умеет только привязать: отвязать способ, которым человек прямо сейчас
// вошёл, посреди анкеты — значит оборвать себе доступ.
const MESSENGERS = [
  {
    name: 'Telegram',
    connected: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="12" fill="#2AABEE" />
        <path d="M5.5 11.8l11-4.3c.5-.2 1 .1.8.9l-1.9 8.9c-.1.6-.5.7-1 .4l-2.7-2-1.3 1.3c-.2.2-.3.3-.6.3l.2-2.8 5.1-4.6c.2-.2 0-.3-.3-.1l-6.3 4-2.7-.8c-.6-.2-.6-.6.1-.9z" fill="#fff" />
      </svg>
    ),
  },
  {
    name: 'MAX',
    connected: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="12" fill="#5B57F5" />
        <path d="M6.4 17V7.4h2.3l3.3 5.2 3.3-5.2h2.3V17h-2.2v-5.8l-2.7 4.2h-1.4l-2.7-4.2V17H6.4z" fill="#fff" />
      </svg>
    ),
  },
];

export default function ProfileClient() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // «Ничего не выбрано на старте» — намеренно. Раньше здесь был зашит
  // предвыбор «Директор / собственник»: подрядчик, пролиставший шаг без
  // осознанного выбора, размечался директором и получал на шаге установки
  // предложение «Поручу другому», бессмысленное для него самого. Гейт
  // «Далее» ниже об этом и просит явно.
  const [role, setRole] = useState(null);
  const [roleError, setRoleError] = useState(null);

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState(null);
  // Телефон — необязательный и без проверки формата: в утверждённой анкете
  // у него нет ни маски, ни ошибки, это запасной канал, а не гейт.
  const [phone, setPhone] = useState('');

  // Почта проверяется только на формат. Подтверждение кодом снято решением
  // владельца: письма сюда идут формальные (обновление документов, изменение
  // закона), отдельный барьер на входе они не окупают.
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(null);

  const [whyOpen, setWhyOpen] = useState(false);
  const [authListOpen, setAuthListOpen] = useState(false);
  const [restored, setRestored] = useState(false);

  // Возврат на шаг («Назад», F5, «Продолжить анкету» из списка сайтов)
  // показывает то, что уже ответили: ответы лежат в анкете, и терять их
  // между экранами нельзя. Читаем после монтирования — страница статическая,
  // и первая отрисовка должна совпасть с серверной.
  useEffect(() => {
    const a = loadAnketa();
    if (a.role) setRole(a.role);
    if (a.personName) setName(a.personName);
    if (a.personPhone) setPhone(a.personPhone);
    if (a.personEmail) setEmail(a.personEmail);
    setRestored(true);
  }, []);

  // Черновик пишется на каждое изменение, а не только по «Далее»: иначе
  // «Назад» и F5 теряют всё, что набрано на этом шаге. Пишем только после
  // восстановления — иначе пустые значения первой отрисовки затрут анкету.
  useEffect(() => {
    if (restored) saveAnketa({ role, personName: name, personPhone: phone, personEmail: email });
  }, [restored, role, name, phone, email]);

  function pickRole(item) {
    setRole(item);
    setRoleError(null);
  }

  function handleNext() {
    let ok = true;

    if (!role) {
      setRoleError('Выберите роль.');
      ok = false;
    }

    if (!name.trim()) {
      setNameError('Укажите имя — так будем обращаться в письмах.');
      ok = false;
    } else {
      setNameError(null);
    }

    if (validateEmail(email)) {
      setEmailError('Нужна почта вида name@site.ru — сюда будем писать об обновлениях документов.');
      ok = false;
    } else {
      setEmailError(null);
    }

    if (!ok) return;
    // Роль нужна на шаге установки: подрядчику незачем предлагать
    // «поручить другому» — он и есть тот, кому поручают.
    saveAnketa({ role, personName: name, personPhone: phone, personEmail: email });
    markStepDone(1);
    router.push('/app/start/site');
  }

  return (
    <div className="min-h-screen bg-warm text-ink">
      <div className="flex min-h-screen">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} current={0} />
        {menuOpen && (
          <button
            aria-label="Закрыть меню"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-20 bg-ink/20 lg:hidden"
          />
        )}
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1000px] px-5 py-5 sm:px-8 sm:py-8 lg:px-14 lg:py-10">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Logo />
              <button
                onClick={() => setMenuOpen(true)}
                className={`rounded-lg border border-line bg-white p-2 ${RING}`}
                aria-label="Открыть меню"
              >
                <BurgerIcon size={20} />
              </button>
            </div>

            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-brand">Шаг 1 из 6</p>
                <h1 className="text-3xl font-bold tracking-[-0.04em] sm:text-[40px]">Ваш профиль</h1>
                <p className="mt-3 max-w-2xl text-[15px] leading-6 text-ink/60 sm:text-[17px]">
                  Шесть шагов, на выходе — пакет документов и строка кода для сайта. Начнём с вас.
                </p>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-line bg-white px-3 py-2 text-xs font-semibold text-ink/55 shadow-sm sm:flex">
                <ShieldCheckIcon size={16} className="text-brand" /> Защищённая форма
              </div>
            </div>

            <Progress current={0} />

            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">
                  {CURRENT_USER.name.slice(0, 1)}
                </div>
                <div>
                  <p className="font-bold">{CURRENT_USER.name}</p>
                  <p className="text-sm text-ink/55">вход через Telegram</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAuthListOpen(!authListOpen)}
                aria-expanded={authListOpen}
                className={`hidden items-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm font-bold shadow-sm transition-colors hover:border-brand sm:flex ${RING}`}
              >
                Добавить вход через MAX
                <ChevronDownIcon size={16} className={authListOpen ? 'rotate-180' : ''} />
              </button>
            </div>

            {authListOpen && (
              <div className="mb-6 rounded-2xl border border-line bg-white p-5 shadow-sm">
                <p className="text-[13px] leading-5 text-ink/55">
                  Вход в один тап и уведомления в мессенджер, а не только на почту. Отвязать можно в Настройках.
                </p>
                <div className="mt-4 divide-y divide-line">
                  {MESSENGERS.map((m) => (
                    <div key={m.name} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      {m.icon}
                      <span className="text-sm font-bold">{m.name}</span>
                      {m.connected ? (
                        <span className="ml-auto rounded-full bg-ok/10 px-2.5 py-1 text-xs font-bold text-ok">подключён</span>
                      ) : (
                        <button
                          type="button"
                          className={`ml-auto rounded-lg border border-line bg-white px-3.5 py-2 text-[13px] font-bold shadow-sm transition-colors hover:border-brand hover:text-brand ${RING}`}
                        >
                          Подключить
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-8">
              <div>
                <h2 id="h-role" className="text-xl font-bold tracking-[-0.025em]">
                  Ваша роль <span className="text-brand">*</span>
                </h2>
                <div className="mt-4 grid gap-2 sm:grid-cols-3" role="group" aria-labelledby="h-role">
                  {ROLES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => pickRole(item)}
                      aria-pressed={role === item}
                      className={`rounded-xl border px-4 py-3.5 text-left text-sm font-bold transition-all ${RING} ${
                        role === item
                          ? 'border-brand bg-brand/[0.06] text-brand ring-2 ring-brand/10'
                          : 'border-line text-ink/70 hover:border-line-2 hover:bg-warm'
                      }`}
                    >
                      <span
                        className={`mr-2 inline-flex h-4 w-4 align-[-3px] items-center justify-center rounded-full border ${
                          role === item ? 'border-brand bg-brand' : 'border-line-2'
                        }`}
                      >
                        {role === item && <CheckIcon size={10} className="text-white" />}
                      </span>
                      {item}
                    </button>
                  ))}
                </div>
                {roleError && <p className="mt-2 text-[12.5px] font-semibold text-danger">{roleError}</p>}
              </div>

              <div className="my-8 h-px bg-line" />

              <div>
                <h2 className="text-xl font-bold tracking-[-0.025em]">Ваши контакты</h2>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Как к вам обращаться"
                    required
                    placeholder="Кирилл"
                    icon={UserIcon}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setNameError(null);
                    }}
                    error={nameError}
                  />
                  <Field
                    label="Телефон на случай, если письма не дойдут"
                    placeholder="+7 (___) ___-__-__"
                    icon={PhoneIcon}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="tel"
                  />

                  <div className="sm:col-span-2">
                    <Field
                      label="Почта"
                      required
                      placeholder="kirill@alfa-school.ru"
                      icon={MailIcon}
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError(null);
                      }}
                      error={emailError}
                    />

                    <button
                      type="button"
                      onClick={() => setWhyOpen(!whyOpen)}
                      className={`mt-3 flex items-center gap-1 rounded text-[13px] font-semibold text-ink/55 transition-colors hover:text-ink ${RING}`}
                    >
                      Зачем это нужно <ChevronDownIcon size={15} className={whyOpen ? 'rotate-180' : ''} />
                    </button>
                    {whyOpen && (
                      <p className="mt-2 max-w-xl text-[13px] leading-5 text-ink/55">
                        Нужны, чтобы написать вам, когда обновим документы или изменится закон. На сайт и в
                        документы они не попадут — там будут контакты компании со шага «Реквизиты».
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-7 flex gap-3 border-t border-line pt-5">
                <button
                  type="button"
                  onClick={() => router.push('/app')}
                  className={`flex h-[52px] items-center justify-center gap-2 rounded-xl border border-line bg-white px-6 text-sm font-bold shadow-sm transition hover:border-line-2 ${RING}`}
                >
                  <ArrowLeftIcon size={16} /> Назад
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className={`flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#1a1acc] ${RING}`}
                >
                  Далее <ArrowRightIcon size={16} />
                </button>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
