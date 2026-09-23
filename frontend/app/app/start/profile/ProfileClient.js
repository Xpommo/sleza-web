'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  UserIcon,
  PhoneIcon,
  MailIcon,
} from '../../../../components/app/AppIcons';
import { CURRENT_USER } from '../../../../lib/appMock';
import { validateEmail } from '../../../../lib/validate';
import { RING, AnketaFrame, Field, SectionHead } from '../_shared/AnketaChrome';
import { loadAnketa, loadAuth, markStepDone, saveAnketa, setMessenger, userLabel } from '../_shared/anketaState';

const ROLES = ['Директор / собственник', 'Сотрудник', 'Подрядчик'];

// Способы входа — те же две строки, что в «Настройках». На шаге 1 список
// умеет только привязать: отвязать способ, которым человек прямо сейчас
// вошёл, посреди анкеты — значит оборвать себе доступ.
const MESSENGERS = [
  {
    name: 'Telegram',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="12" fill="#2AABEE" />
        <path d="M5.5 11.8l11-4.3c.5-.2 1 .1.8.9l-1.9 8.9c-.1.6-.5.7-1 .4l-2.7-2-1.3 1.3c-.2.2-.3.3-.6.3l.2-2.8 5.1-4.6c.2-.2 0-.3-.3-.1l-6.3 4-2.7-.8c-.6-.2-.6-.6.1-.9z" fill="#fff" />
      </svg>
    ),
  },
  {
    name: 'MAX',
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
  // Чем человек вошёл — со входа или регистрации; этот способ уже привязан.
  const [auth, setAuth] = useState({ via: 'Telegram', messengers: { Telegram: true } });

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
    setAuth(loadAuth());
    setRestored(true);
  }, []);

  // Черновик пишется на каждое изменение, а не только по «Далее»: иначе
  // «Назад» и F5 теряют всё, что набрано на этом шаге. Пишем только после
  // восстановления — иначе пустые значения первой отрисовки затрут анкету.
  useEffect(() => {
    if (restored) saveAnketa({ role, personName: name, personPhone: phone, personEmail: email });
  }, [restored, role, name, phone, email]);

  const freeMessengers = MESSENGERS.map((m) => m.name).filter((n) => !auth.messengers[n]);
  // Кто вы — пока имя не введено, то, что мы уже знаем: имя приходит из
  // мессенджера, которым вошли; при входе по почте имени нет — показываем почту.
  const byMail = auth.via === 'почта';
  const who = userLabel({ name: name || (byMail ? '' : CURRENT_USER.name), email: byMail ? email : '' });

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
    <AnketaFrame current={0} title="Ваш профиль" lead={<>Шесть шагов, на выходе — пакет документов и строка кода для сайта. Начнём с вас.</>}>

            <div className="mb-6 flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">
                  {who.initial}
                </div>
                <div className="min-w-0">
                  <p className="break-all font-bold">{who.title}</p>
                  <p className="text-sm text-ink/60">{auth.via === 'почта' ? 'вход по коду из письма' : `вход через ${auth.via}`}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAuthListOpen(!authListOpen)}
                aria-expanded={authListOpen}
                disabled={freeMessengers.length === 0}
                className={`hidden items-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm font-bold shadow-sm transition-colors hover:border-brand disabled:cursor-default disabled:text-ink/45 disabled:hover:border-line sm:flex ${RING}`}
              >
                {freeMessengers.length ? `Добавить вход через ${freeMessengers.join(' или ')}` : 'Все способы входа привязаны'}
                <ChevronDownIcon size={16} className={authListOpen ? 'rotate-180' : ''} />
              </button>
            </div>

            {authListOpen && (
              <div className="mb-6 rounded-2xl border border-line bg-white p-5 shadow-sm">
                <p className="text-[13px] leading-5 text-ink/60">
                  Вход в один тап и уведомления в мессенджер, а не только на почту. Отвязать можно в Настройках.
                </p>
                <div className="mt-4 divide-y divide-line">
                  {MESSENGERS.map((m) => (
                    <div key={m.name} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      {m.icon}
                      <span className="text-sm font-bold">{m.name}</span>
                      {auth.messengers[m.name] ? (
                        <span className="ml-auto rounded-full bg-ok/10 px-2.5 py-1 text-xs font-bold text-ok">подключён</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setMessenger(m.name, true);
                            setAuth(loadAuth());
                          }}
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

            <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
              <div>
                <h2 id="h-role" className="text-xl font-bold tracking-[-0.025em]">
                  Ваша роль в компании <span className="text-brand">*</span>
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
                {roleError && <p className="mt-2 text-[12px] font-semibold text-danger">{roleError}</p>}
              </div>

              <div className="my-8 h-px bg-line" />

              <div>
                {/* «Куда вам писать», а не «Ваши контакты»: шаг и так называется
                    «Ваш профиль», дубль заголовка снят ещё в макете (FIXLOG). */}
                <SectionHead
                  title="Куда вам писать"
                  whyOpen={whyOpen}
                  onWhy={() => setWhyOpen(!whyOpen)}
                  why="Нужны, чтобы написать вам, когда обновим документы или изменится закон. На сайт и в документы они не попадут — там будут контакты компании со шага «Реквизиты»."
                />
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
                      /* Неверный формат подсвечиваем сразу при выходе из поля
                         (правка владельца 7.09); пустое — только на «Далее». */
                      onBlur={() => {
                        if (email.trim() && validateEmail(email)) setEmailError('Нужна почта вида name@site.ru — сюда будем писать об обновлениях документов.');
                      }}
                      error={emailError}
                    />

                  </div>
                </div>
              </div>
            </section>

            {/* На телефоне эту пару повторяет нижняя панель — докрутив до конца,
                человек видел одни и те же кнопки дважды (правка владельца). */}
            <div className="mt-7 hidden gap-3 border-t border-line pt-5 lg:flex">
              <button
                data-funnel-back
                type="button"
                onClick={() => router.push('/app/sites')}
                className={`flex h-[52px] items-center justify-center gap-2 rounded-xl border border-line bg-white px-6 text-sm font-bold shadow-sm transition hover:border-line-2 ${RING}`}
              >
                <ArrowLeftIcon size={16} /> Назад
              </button>
              <button
                data-funnel-next
                type="button"
                onClick={handleNext}
                className={`flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#1a1acc] ${RING}`}
              >
                Далее <ArrowRightIcon size={16} />
              </button>
            </div>
    </AnketaFrame>
  );
}
