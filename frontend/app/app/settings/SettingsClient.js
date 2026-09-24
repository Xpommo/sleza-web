'use client';

import { useEffect, useState } from 'react';
import { CloseIcon } from '../../../components/app/AppIcons';
import { MESSENGER_ICONS } from '../../../components/app/AuthBits';
import { CURRENT_USER } from '../../../lib/appMock';
import { EMAIL_RE, formatPhone, phoneIncomplete } from '../../../lib/validate';
import { Field, PhoneField } from '../start/_shared/AnketaChrome';
import { accountUser, loadAnketa, loadAuth, saveAnketa, setMessenger } from '../start/_shared/anketaState';
import { RING, SettingsSidebar } from '../site/_shared/SiteChrome';

// Настройки аккаунта (живой макет, s-settings). Два раздела — контакты и
// вход. Пароля нет: вход по коду из письма или через мессенджер (17.09).
// «Реквизиты владельца» здесь не живут с 9.09 — они принадлежат сайту и у
// второго сайта могут быть другими; почта для актов — в «Бухгалтерии».

const BTN_SECONDARY = `shrink-0 rounded-lg border border-line bg-white px-3.5 py-2 text-[13px] font-semibold text-ink/70 transition hover:border-line-2 hover:bg-warm hover:text-ink ${RING}`;

function Card({ children }) {
  return <div className="mt-4 rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(17,17,16,0.04)] sm:p-6">{children}</div>;
}

export default function SettingsClient() {
  const [user, setUser] = useState(CURRENT_USER);
  const [phone, setPhone] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [err, setErr] = useState({});
  const [messengers, setMessengers] = useState({});

  // Имя, почта и телефон — те же, что на шаге «Ваш профиль»: это один
  // человек и одни контакты, а не вторая копия.
  function sync() {
    setUser(accountUser(CURRENT_USER));
    setPhone(formatPhone(loadAnketa().personPhone || ''));
    setMessengers(loadAuth().messengers);
  }
  useEffect(sync, []);

  function openForm() {
    setForm({ name: user.name, email: user.email, phone });
    setErr({});
    setEditing(true);
  }

  function save() {
    const e = {};
    if (!form.name.trim()) e.name = 'Укажите имя — так будем обращаться в письмах.';
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Нужна почта вида name@site.ru — сюда будем писать об обновлениях документов.';
    if (phoneIncomplete(form.phone)) e.phone = phoneIncomplete(form.phone);
    setErr(e);
    if (Object.keys(e).length) return;
    saveAnketa({ personName: form.name.trim(), personEmail: form.email.trim(), personPhone: form.phone.trim() });
    sync();
    setEditing(false);
  }

  function toggleMessenger(name, on) {
    setMessenger(name, on);
    setMessengers(loadAuth().messengers);
  }

  const bind = (key) => ({
    value: form[key],
    onChange: (ev) => {
      setForm({ ...form, [key]: ev.target.value });
      setErr({ ...err, [key]: null });
    },
    error: err[key],
  });

  return (
    <main className="min-h-screen bg-warm text-ink lg:flex">
      <SettingsSidebar user={user} />

      <section className="min-w-0 flex-1 px-5 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12 xl:px-20">
        <div className="mx-auto max-w-3xl">
          <header>
            {/* Без поясняющей строки (владелец 24.09). Реквизиты компании
                правятся в «Документах» сайта — об этом отвечает FAQ «Поддержки». */}
            <h1 className="text-[28px] font-bold tracking-[-0.045em] sm:text-[36px] lg:sr-only">Настройки</h1>
          </header>

          <h2 className="mt-9 text-lg font-bold tracking-[-0.02em] lg:mt-0">Контакты</h2>
          <Card>
            {editing ? (
              <div className="space-y-4">
                <Field label="Имя" required autoComplete="name" {...bind('name')} />
                <Field label="Почта" required type="email" autoComplete="email" {...bind('email')} />
                {/* Формулировка та же, что на шаге «Ваш профиль», — иначе
                    название одного поля разъезжается между экранами. */}
                <div>
                  <PhoneField
                    label="Телефон на случай, если письма не дойдут"
                    value={form.phone}
                    onValue={(p) => {
                      setForm((f) => ({ ...f, phone: p }));
                      setErr((x) => ({ ...x, phone: null }));
                    }}
                    error={err.phone}
                  />
                  <p className="mt-2 text-[12px] text-ink/60">Необязательно — позвоним, только если письма перестанут доходить.</p>
                </div>
                <div className="flex flex-wrap gap-3 pt-1">
                  <button
                    type="button"
                    onClick={save}
                    className={`inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1a1acc] ${RING}`}
                  >
                    Сохранить
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className={`rounded-xl px-3 py-2.5 text-sm font-semibold text-ink/60 hover:text-ink ${RING}`}>
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  {/* До шага «Ваш профиль» имени (при входе по почте) или почты
                      (при входе через мессенджер) может ещё не быть. */}
                  <p className="text-[15px] font-bold">{user.name || 'Имя не указано'}</p>
                  {user.email ? (
                    <p className="mt-1 break-all font-mono text-[13px] text-ink/60">{user.email}</p>
                  ) : (
                    <p className="mt-1 text-[13px] text-ink/60">Почта не указана</p>
                  )}
                  <p className="mt-0.5 text-[13px] text-ink/60">{phone || 'Телефон не указан'}</p>
                </div>
                <button type="button" onClick={openForm} className={BTN_SECONDARY}>
                  Изменить
                </button>
              </div>
            )}
          </Card>

          {/* Мессенджер подсвечен намеренно: это не ещё одна настройка, а
              заметная выгода — вход в один тап и уведомления туда же, куда
              человек и так смотрит. Поэтому блок, а не строчка. */}
          <h2 className="mt-9 text-lg font-bold tracking-[-0.02em]">Вход</h2>
          <Card>
            <p className="text-[15px] font-bold">По коду из письма</p>
            {user.email ? (
              <>
                <p className="mt-1 break-all font-mono text-[13px] text-ink/60">{user.email}</p>
                <p className="mt-0.5 text-[13px] text-ink/60">Пароль не нужен — присылаем код на эту почту</p>
              </>
            ) : (
              <p className="mt-1 text-[13px] text-ink/60">Заработает, когда укажете почту в контактах</p>
            )}

            <div className="my-5 h-px bg-line" />

            <h3 className="text-[15px] font-bold">Мессенджеры</h3>
            <p className="mt-1 text-[13px] leading-5 text-ink/60">
              Вход в один тап и уведомления туда же — о продлении, оплате и статусе виджета. Можно подключить несколько, здесь
              же и отвязать.
            </p>
            {/* Список, а не «подключить один»: Telegram — для себя, MAX — для
                рабочих уведомлений. Каждая строка сама себе состояние. */}
            <div className="mt-4 divide-y divide-line rounded-xl border border-line">
              {['Telegram', 'MAX'].map((name) => {
                const Icon = MESSENGER_ICONS[name];
                const on = Boolean(messengers[name]);
                return (
                  <div key={name} className="flex min-h-[60px] items-center gap-3 px-4 py-2.5">
                    <Icon size={20} />
                    <span className="text-sm font-bold">{name}</span>
                    {on ? (
                      <>
                        <span className="ml-auto rounded-full bg-ok/10 px-2.5 py-1 text-[11px] font-bold text-ok">подключён</span>
                        <button
                          type="button"
                          onClick={() => toggleMessenger(name, false)}
                          title="Отвязать аккаунт"
                          aria-label={`Отвязать ${name}`}
                          className={`flex h-10 w-10 items-center justify-center rounded-lg text-ink/35 transition hover:bg-danger/10 hover:text-danger ${RING}`}
                        >
                          <CloseIcon size={16} />
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => toggleMessenger(name, true)} className={`ml-auto ${BTN_SECONDARY}`}>
                        Подключить
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
