'use client';

import { useEffect, useState } from 'react';
import { CheckIcon, ChevronDownIcon } from '../../../components/app/AppIcons';
import { CURRENT_USER } from '../../../lib/appMock';
import { accountUser, loadAnketa, saveAnketa } from '../start/_shared/anketaState';
import { AccountSidebar, RING } from '../site/_shared/SiteChrome';

// Ответы — про этот кабинет, а не про макет: где что лежит сейчас. Три
// ответа макета расходились с решением 18 сентября и с устройством кабинета
// (подписка «на каждый сайт», отмена в «Подписке», реквизиты в «Документах»),
// здесь они приведены к действительности.
const FAQ = [
  ['Как поменять способ оплаты?', 'В разделе «Подписка» в меню слева — у строки «Способ оплаты» нажмите «Изменить» и выберите карту или счёт.'],
  [
    'Что будет, если не оплатить вовремя?',
    'Виджет на сайте отключится, а обновление документов по закону остановится — так же, как при истечении пробного периода без оплаты. Оплатить можно в разделе «Подписка». Битой ссылки на сайте не появится: уже опубликованные страницы документов остаются доступными.',
  ],
  [
    'Как обновить реквизиты компании?',
    'В разделе «Документы» сайта, в строке «Реквизиты владельца», нажмите карандаш — поправите поля сами. Документ и подвал сайта обновятся вместе с ними. Реквизиты для счёта — отдельные, они в «Подписке».',
  ],
  ['Могу я добавить второй сайт?', 'Да — на «Мои сайты» нажмите «Добавить сайт». Документы и виджет у каждого сайта свои, счёт — один на все сайты аккаунта.'],
  [
    'Как отключить сайт?',
    'На «Обзоре» сайта, в блоке «Подписка», — «Отключить этот сайт». Отключается только он: виджет и документы работают до конца оплаченного периода, в следующий счёт сайт не войдёт.',
  ],
  [
    'Виджет не появился на сайте — что делать?',
    'Откройте раздел «Виджет» — там видно, что сейчас показывается посетителям. Если баннера и подвала нет, разверните «Показать код установки» и проверьте, что строка стоит внутри <head> и страницы опубликованы заново. Иногда страница сайта не успевает обновиться: изменения появляются с задержкой.',
  ],
];

function Faq({ q, a, open, onToggle, id }) {
  return (
    <div className="border-b border-line last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={id}
        className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-bold transition hover:bg-warm/60 sm:px-6 ${RING}`}
      >
        {q}
        <ChevronDownIcon size={16} className={`shrink-0 text-ink/40 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div
        id={id}
        aria-hidden={!open}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-5 text-[13px] leading-6 text-ink/65 sm:px-6">{a}</p>
        </div>
      </div>
    </div>
  );
}

export default function SupportClient() {
  const [user, setUser] = useState(CURRENT_USER);
  const [openQ, setOpenQ] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(null);

  useEffect(() => {
    setUser(accountUser(CURRENT_USER));
    setTickets(loadAnketa().tickets || []);
  }, []);

  // Пустое обращение не отправляется: раньше в макете оно показывало
  // «✓ Обращение отправлено», а в «Мои обращения» ничего не попадало.
  function send() {
    if (!text.trim()) {
      setError('Опишите, что случилось — иначе нам не с чем разбираться.');
      return;
    }
    const t = { no: 1043 + tickets.length, at: Date.now(), text: text.trim(), status: 'открыто' };
    const next = [t, ...tickets];
    saveAnketa({ tickets: next });
    setTickets(next);
    setSent(t.no);
    setText('');
  }

  return (
    <main className="min-h-screen bg-warm text-ink lg:flex">
      <AccountSidebar user={user} supportActive />

      <section className="min-w-0 flex-1 px-5 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12 xl:px-20">
        <div className="mx-auto max-w-3xl">
          <header>
            <h1 className="text-[28px] font-bold tracking-[-0.045em] sm:text-[36px]">Поддержка</h1>
            <p className="mt-3 text-[15px] leading-6 text-ink/65">Частые вопросы про личный кабинет — и форма, если нужен ответ от нас.</p>
          </header>

          <h2 className="mb-4 mt-9 text-lg font-bold tracking-[-0.02em]">Частые вопросы</h2>
          <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
            {FAQ.map(([q, a], i) => (
              <Faq key={q} id={`faq-${i}`} q={q} a={a} open={openQ === i} onToggle={() => setOpenQ(openQ === i ? null : i)} />
            ))}
          </div>

          {/* Ответ читается здесь, а не только в почте: письмо — уведомление
              «вам ответили», сам ответ — в кабинете. */}
          <h2 className="mb-4 mt-9 text-lg font-bold tracking-[-0.02em]">Мои обращения</h2>
          {tickets.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line-2 px-5 py-6 text-center text-[13px] text-ink/60">
              Обращений пока нет.
            </p>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <article key={t.no} className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-ink/60">
                      Заявка №{t.no} · {new Date(t.at).toLocaleDateString('ru-RU')}
                    </p>
                    <span className="rounded-full bg-warn/10 px-3 py-1 text-[11px] font-bold text-warn">{t.status}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{t.text}</p>
                </article>
              ))}
            </div>
          )}

          <section className="mt-9 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7">
            <h2 className="text-lg font-bold tracking-[-0.02em]">Написать в поддержку</h2>
            {sent ? (
              <div className="mt-4 flex items-start gap-3 rounded-xl bg-ok/[0.07] p-4">
                <CheckIcon size={18} className="mt-0.5 shrink-0 text-ok" />
                <div className="text-[13px] leading-5">
                  <p className="font-bold">Обращение отправлено</p>
                  <p className="mt-1 text-ink/60">Заявка №{sent} · уже в «Моих обращениях», ответ появится там же.</p>
                  <button type="button" onClick={() => setSent(null)} className={`mt-3 rounded font-semibold text-brand hover:text-ink ${RING}`}>
                    Написать ещё
                  </button>
                </div>
              </div>
            ) : (
              <>
                <label className="mt-4 block">
                  <span className="mb-2 block text-[13px] font-bold text-ink-2">Опишите, что случилось</span>
                  <textarea
                    rows={5}
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      setError(null);
                    }}
                    aria-invalid={error ? 'true' : undefined}
                    className={`w-full resize-y rounded-xl border bg-white px-4 py-3 text-[15px] leading-6 shadow-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10 ${error ? 'border-danger' : 'border-line'}`}
                  />
                  {error && <span className="mt-1.5 block text-[12px] font-semibold text-danger">{error}</span>}
                </label>
                <p className="mt-2 text-[13px] leading-5 text-ink/60">
                  Ответ придёт сюда же, в «Мои обращения» — на почту пришлём только уведомление, что вам ответили.
                </p>
                <button
                  type="button"
                  onClick={send}
                  className={`mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#1a1acc] ${RING}`}
                >
                  Отправить
                </button>
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
