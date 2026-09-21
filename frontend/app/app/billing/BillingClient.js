'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon, CheckIcon, ChevronDownIcon, CopyIcon } from '../../../components/app/AppIcons';
import { CURRENT_USER } from '../../../lib/appMock';
import { SITE_ID } from '../../../lib/docPackage';
import { Field, Segmented } from '../start/_shared/AnketaChrome';
import { accountUser, loadAnketa, saveAnketa } from '../start/_shared/anketaState';
import { AccountSidebar, RING } from '../site/_shared/SiteChrome';
import { PRICE_LABEL, TARIFFS, paidPeriod, subState } from '../site/_shared/subscription';

const STEP_URLS = ['profile', 'site', 'clients', 'requisites', 'documents', 'code'].map((s) => `/app/start/${s}`);

// Строка-сводка «решённого» с «Изменить» — тот же приём, что во всём
// кабинете: рабочее раскрыто, решённое свёрнуто в одну строку.
function SummaryRow({ label, value, note, onEdit, editing }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-line py-4 first:border-t-0 first:pt-0">
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-ink/45">{label}</p>
        <p className="mt-1 text-[15px] font-bold">{value}</p>
        {note && <p className="mt-0.5 text-[13px] text-ink/55">{note}</p>}
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-expanded={editing}
          className={`shrink-0 rounded text-sm font-semibold text-brand transition hover:text-ink ${RING}`}
        >
          {editing ? 'Свернуть' : 'Изменить'}
        </button>
      )}
    </div>
  );
}

function Card({ title, children, tone }) {
  return (
    <section
      className={`mt-6 rounded-2xl border p-6 shadow-sm sm:p-7 ${
        tone === 'warn' ? 'border-warn/30 bg-warn/[0.06]' : 'border-line bg-white'
      }`}
    >
      {title && <h2 className="mb-5 text-lg font-bold tracking-[-0.02em]">{title}</h2>}
      {children}
    </section>
  );
}

const PRIMARY = `inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#1a1acc] ${RING}`;

export default function BillingClient() {
  const router = useRouter();
  const [a, setA] = useState(null);
  const [user, setUser] = useState(CURRENT_USER);
  const [now, setNow] = useState(Date.now());

  const [tariffOpen, setTariffOpen] = useState(false);
  const [tariffPick, setTariffPick] = useState(TARIFFS[0]);
  const [methodOpen, setMethodOpen] = useState(false);
  const [method, setMethod] = useState('По счёту');

  const [cardNo, setCardNo] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardErr, setCardErr] = useState({});

  const [payerOpen, setPayerOpen] = useState(false);
  const [payerMode, setPayerMode] = useState('Как в анкете');
  const [payer, setPayer] = useState({ name: '', inn: '', email: '' });
  const [payerErr, setPayerErr] = useState({});

  const [whatOpen, setWhatOpen] = useState(false);
  const [actsEmail, setActsEmail] = useState('');
  const [actsEditing, setActsEditing] = useState(false);
  const [actsErr, setActsErr] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = loadAnketa();
    if (!saved.domain) {
      router.replace('/app/sites');
      return;
    }
    setA(saved);
    setUser(accountUser(CURRENT_USER));
    const b = saved.billing || {};
    if (b.tariff) setTariffPick(b.tariff);
    if (b.method) setMethod(b.method);
    if (b.actsEmail) setActsEmail(b.actsEmail);
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [router]);

  if (!a) return null;

  const b = a.billing || {};
  const state = subState(a, now);
  const tariff = b.tariff || TARIFFS[0];
  const period = b.paidAt ? paidPeriod(b.paidAt) : null;
  const req = a.contacts || {};
  const account = a.bank?.account || '';

  function saveBilling(patch) {
    saveAnketa({ billing: { ...loadAnketa().billing, ...patch } });
    setA(loadAnketa());
  }

  function pickTariff() {
    saveBilling({ tariff: tariffPick });
    setTariffOpen(false);
  }

  function pickMethod(m) {
    setMethod(m);
    saveBilling({ method: m });
  }

  // До оплаты привязка карты и есть оплата: списываем сразу.
  function payByCard() {
    const digits = cardNo.replace(/\D/g, '');
    const [mm, yy] = cardExp.split('/');
    const errs = {};
    if (digits.length !== 16) errs.no = 'Номер карты — 16 цифр.';
    if (!/^\d{2}\/\d{2}$/.test(cardExp) || +mm < 1 || +mm > 12) errs.exp = 'Срок действия — в формате ММ/ГГ.';
    if (!/^\d{3}$/.test(cardCvc)) errs.cvc = 'CVC — 3 цифры на обороте карты.';
    setCardErr(errs);
    if (Object.keys(errs).length) return;
    saveBilling({ method: 'Картой', card: { last4: digits.slice(-4), exp: `${mm}/${yy}` }, paidAt: Date.now(), invoice: null, cancelled: false });
    setCardNo('');
    setCardExp('');
    setCardCvc('');
  }

  function issueInvoice() {
    let p = null;
    if (payerMode === 'Другие реквизиты') {
      const errs = {};
      if (!payer.name.trim()) errs.name = 'Укажите, кто оплачивает счёт.';
      if (!/^\d{10}(\d{2})?$/.test(payer.inn)) errs.inn = 'ИНН — 10 или 12 цифр.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payer.email)) errs.email = 'Нужна почта вида name@site.ru — на неё придёт счёт.';
      setPayerErr(errs);
      if (Object.keys(errs).length) return;
      p = payer;
    }
    const year = new Date().getFullYear();
    saveBilling({ method: 'По счёту', invoice: { no: `${year}-0142`, at: Date.now(), payer: p } });
    setPayerOpen(false);
  }

  function saveActs() {
    if (actsEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(actsEmail)) {
      setActsErr('Нужна почта вида name@site.ru — на неё придут акты.');
      return;
    }
    setActsErr(null);
    saveBilling({ actsEmail });
    setActsEditing(false);
  }

  function copyInvoice() {
    navigator.clipboard?.writeText(`https://cdn.sleza.media/${SITE_ID}/invoice-${b.invoice.no}.pdf`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Лид зависит от состояния: до оплаты закрывающих документов ещё нет, а
  // до установки кода не работает ни виджет, ни документы. Счёт общий на
  // аккаунт — это сказано в каждом состоянии (макет, решение 18 сентября).
  const lead = {
    notstarted: 'Подписка начнётся, когда будет подключён первый сайт. Счёт и акты — общие на все сайты аккаунта.',
    trial: a.installed
      ? <>Виджет и документы уже работают на <b className="text-ink">{a.domain}</b> — оплата продлевает доступ после пробного периода. Счёт один на все сайты аккаунта.</>
      : <>Виджет и документы заработают на <b className="text-ink">{a.domain}</b>, как только там появится код. Оплата продлевает доступ после пробного периода. Счёт один на все сайты аккаунта.</>,
    expired: 'Пробный период закончился — оплата включит виджет и документы снова. Счёт один на все сайты аккаунта.',
    pending: 'Счёт выставлен. Отметим оплату, как только поступят деньги — обычно 1–3 рабочих дня. Счёт один на все сайты аккаунта.',
    paid: period && `Оплачено до ${period.to}. Тариф, способ оплаты и закрывающие документы — общие для всех сайтов аккаунта. Состояние каждого сайта — в его разделе.`,
  }[state];

  const payerNote = [a.inn && `ИНН ${a.inn}`, req.companyMail, req.companyPhone, account && `счёт …${account.slice(-4)}`]
    .filter(Boolean)
    .join(' · ');
  const invoiceOverdue = b.invoice && now - b.invoice.at > 3 * 24 * 3600 * 1000;

  // «Что входит»: рамка своя у каждого состояния — один список на три
  // разные ситуации врал в двух из них.
  const now1 = a.installed
    ? ['Уже работает — пробный период, 24 часа', ['Готовый пакет документов под ваш сайт', 'Виджет: cookie-баннер и подвал, из которого открываются документы и реквизиты', 'Документы по постоянным адресам — ссылки не ломаются']]
    : ['Включится с установкой кода — пробный период, 24 часа', ['Готовый пакет документов под ваш сайт', 'Виджет: cookie-баннер и подвал, из которого открываются документы и реквизиты', 'Документы по постоянным адресам — ссылки не ломаются']];
  const frames =
    state === 'paid'
      ? [['Что работает по подписке', ['Пакет документов под ваш сайт, собранный по вашим ответам', 'Виджет: cookie-баннер и подвал, из которого открываются документы и реквизиты', 'Маркировка упоминаний по реестрам на ваших страницах', 'Переписываем документы при изменении закона и присылаем письмо', 'Проверяем, что виджет и документы на сайте на месте']]]
      : state === 'expired'
      ? [
          ['Сейчас отключено', ['Виджет снят с сайта — cookie-баннер и подвал не показываются', 'Документы в кабинете открываются только на просмотр']],
          ['Оплата включит снова', ['Виджет и документы заработают как прежде', 'Следим за законом и обновляем документы сами', 'Уведомления, если что-то изменилось']],
        ]
      : [now1, ['Оплата продлевает', ['Доступ не прерывается после пробного периода', 'Следим за законом и обновляем документы сами', 'Уведомления, если что-то изменилось']]];

  const fold = (
    <>
      {/* «Что входит» — разворотом внизу: цена уже в строке тарифа,
          перечень нужен тому, кто сомневается, а не каждому. */}
      <div className="mt-6 border-t border-line pt-4">
        <button
          type="button"
          onClick={() => setWhatOpen(!whatOpen)}
          aria-expanded={whatOpen}
          className={`flex items-center gap-1.5 rounded text-sm font-semibold text-ink/60 hover:text-ink ${RING}`}
        >
          Что входит в подписку <ChevronDownIcon size={15} className={`transition-transform ${whatOpen ? 'rotate-180' : ''}`} />
        </button>
        {whatOpen && (
          <div className="mt-4 space-y-4 text-[13px] leading-5">
            {frames.map(([head, items]) => (
              <div key={head}>
                <p className="font-bold">{head}</p>
                <ul className="mt-1.5 space-y-1 text-ink/60">
                  {items.map((i) => (
                    <li key={i}>· {i}</li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="rounded-xl bg-warm p-4 text-ink/65">
              <b className="text-ink">Оплата раз в год — но это подписка, не разовая покупка:</b> меняется закон, вместе с
              ним должны меняться и документы. Разовый пакет устареет сам по себе, без предупреждения.
            </p>
          </div>
        )}
      </div>
    </>
  );

  return (
    <main className="min-h-screen bg-warm text-ink lg:flex">
      <AccountSidebar active="Подписка" user={user} />

      <section className="min-w-0 flex-1 px-5 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12 xl:px-20">
        <div className="mx-auto max-w-3xl">
          <header>
            <h1 className="text-[28px] font-bold tracking-[-0.045em] sm:text-[36px]">Подписка</h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-6 text-ink/65">{lead}</p>
          </header>

          {/* Пока анкета не пройдена, платить не за что: документов нет,
              виджет не установлен. Вместо оплаты — путь туда, где это появится. */}
          {state === 'notstarted' && (
            <Card title={(a.stepsDone || 0) >= 4 ? 'Документы собраны, скрипт не установлен' : 'Анкета не закончена'} tone="warn">
              <p className="text-sm leading-6 text-ink/65">
                {(a.stepsDone || 0) >= 4
                  ? 'Пакет готов. Подписка начнётся с пробного периода, когда код встанет на сайт.'
                  : 'Документы собираем по ответам анкеты.'}
              </p>
              <button type="button" onClick={() => router.push(STEP_URLS[Math.min(a.stepsDone || 0, 5)])} className={`mt-5 ${PRIMARY}`}>
                {(a.stepsDone || 0) >= 4 ? 'Поставить код на сайт' : 'Продолжить анкету'} <ArrowRightIcon size={16} />
              </button>
            </Card>
          )}

          {(state === 'trial' || state === 'expired' || state === 'pending') && (
            <Card title="Оплата">
              <SummaryRow
                label="Тариф"
                value={`${tariff} · ${PRICE_LABEL}/год`}
                onEdit={() => setTariffOpen(!tariffOpen)}
                editing={tariffOpen}
              />
              {/* Тариф не применяется по клику: случайное нажатие по соседней
                  кнопке меняло бы оплачиваемый тариф. Сначала выбор, потом
                  подтверждение. */}
              {tariffOpen && (
                <div className="mb-4 rounded-xl bg-warm p-4">
                  <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Тариф">
                    {TARIFFS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        role="radio"
                        aria-checked={tariffPick === t}
                        onClick={() => setTariffPick(t)}
                        className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${RING} ${
                          tariffPick === t ? 'border-brand bg-white ring-2 ring-brand/10' : 'border-line bg-white hover:border-line-2'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-[12.5px] text-ink/50">Состав тарифов ещё утверждается — цена пока одна.</p>
                  <div className="mt-4 flex gap-3">
                    <button type="button" onClick={pickTariff} className={`rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white ${RING}`}>
                      Выбрать этот тариф
                    </button>
                    <button type="button" onClick={() => setTariffOpen(false)} className={`rounded-xl px-3 py-2.5 text-sm font-semibold text-ink/55 hover:text-ink ${RING}`}>
                      Отмена
                    </button>
                  </div>
                </div>
              )}

              <SummaryRow
                label="Способ оплаты"
                value={method}
                note={method === 'По счёту' ? 'Счёт на почту, оплата переводом' : 'Спишем сразу после привязки карты'}
                onEdit={() => setMethodOpen(!methodOpen)}
                editing={methodOpen}
              />
              {methodOpen && (
                <div className="mb-4">
                  <Segmented options={['Картой', 'По счёту']} value={method} onChange={pickMethod} />
                </div>
              )}

              {method === 'Картой' && (
                <div className="border-t border-line pt-5">
                  <p className="mb-4 text-[13px] text-ink/55">Карта привяжется к сайту {a.domain} — он у вас один.</p>
                  <Field
                    label="Номер карты"
                    required
                    inputMode="numeric"
                    placeholder="0000 0000 0000 0000"
                    value={cardNo}
                    onChange={(e) => setCardNo(e.target.value.replace(/[^\d ]/g, '').slice(0, 19))}
                    error={cardErr.no}
                  />
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Срок действия"
                      required
                      inputMode="numeric"
                      placeholder="ММ/ГГ"
                      value={cardExp}
                      onChange={(e) => {
                        const d = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setCardExp(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
                      }}
                      error={cardErr.exp}
                    />
                    <Field
                      label="CVC"
                      required
                      inputMode="numeric"
                      placeholder="000"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      error={cardErr.cvc}
                    />
                  </div>
                  <button type="button" onClick={payByCard} className={`mt-6 w-full ${PRIMARY}`}>
                    Оплатить {PRICE_LABEL}
                  </button>
                  <p className="mt-3 text-center text-[12.5px] text-ink/50">Отвязать карту можно здесь же в любой момент.</p>
                </div>
              )}

              {method === 'По счёту' && !b.invoice && (
                <>
                  <SummaryRow
                    label="Реквизиты плательщика · из анкеты"
                    value={payerMode === 'Как в анкете' ? a.companyName || 'Реквизиты не заполнены' : payer.name || 'Другие реквизиты'}
                    note={payerMode === 'Как в анкете' ? payerNote : payer.inn && `ИНН ${payer.inn} · ${payer.email}`}
                    onEdit={() => setPayerOpen(!payerOpen)}
                    editing={payerOpen}
                  />
                  {payerOpen && (
                    <div className="mb-4 space-y-4">
                      <Segmented options={['Как в анкете', 'Другие реквизиты']} value={payerMode} onChange={setPayerMode} />
                      <p className="text-[13px] leading-5 text-ink/55">
                        {payerMode === 'Как в анкете'
                          ? 'Возьмём данные компании с шага «Реквизиты». В подвал сайта они и так идут — здесь они нужны только для счёта.'
                          : 'Нужно, когда счёт оплачивает другая компания — не та, чьи реквизиты стоят в подвале сайта.'}
                      </p>
                      {payerMode === 'Другие реквизиты' && (
                        <div className="space-y-4">
                          <Field label="Наименование плательщика" required placeholder="ООО «Ромашка»" value={payer.name} onChange={(e) => setPayer({ ...payer, name: e.target.value })} error={payerErr.name} />
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="ИНН" required inputMode="numeric" placeholder="10 или 12 цифр" value={payer.inn} onChange={(e) => setPayer({ ...payer, inn: e.target.value.replace(/\D/g, '').slice(0, 12) })} error={payerErr.inn} />
                            <Field label="Email для счёта" required type="email" placeholder="buh@romashka.ru" value={payer.email} onChange={(e) => setPayer({ ...payer, email: e.target.value })} error={payerErr.email} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <button type="button" onClick={issueInvoice} className={`mt-2 w-full ${PRIMARY}`}>
                    Выставить счёт на {PRICE_LABEL}
                  </button>
                </>
              )}

              {/* Выставленный счёт — результат, который можно переслать
                  бухгалтеру, а не мигнувшее «✓». */}
              {b.invoice && method === 'По счёту' && (
                <div className="border-t border-line pt-5">
                  <p className="text-[15px] font-bold">
                    Счёт № {b.invoice.no} · {PRICE_LABEL}
                  </p>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <div className="flex h-12 min-w-0 flex-1 items-center rounded-xl border border-line bg-warm px-4 font-mono text-[12.5px] text-ink/70">
                      <span className="truncate">
                        cdn.sleza.media/{SITE_ID}/invoice-{b.invoice.no}.pdf
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={copyInvoice}
                      className={`inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 text-sm font-bold transition hover:border-brand hover:text-brand ${RING}`}
                    >
                      {copied ? <CheckIcon size={16} className="text-ok" /> : <CopyIcon size={16} />}
                      {copied ? 'Скопировано' : 'Скопировать ссылку'}
                    </button>
                  </div>
                  <p className="mt-3 text-[13px] leading-5 text-ink/55">
                    Ссылка работает, пока счёт не оплачен — по ней счёт можно открыть, скачать и переслать бухгалтеру. Копия
                    ушла на почту для актов.
                  </p>
                  {invoiceOverdue && (
                    <div className="mt-4 rounded-xl bg-warn/10 p-4 text-[13px] leading-5 text-ink/70">
                      <p className="font-bold">Счёт выставлен больше 3 дней назад и всё ещё не оплачен.</p>
                      <p className="mt-1">Если перевод завис в банке — напишите в поддержку, поможем разобраться. Можно и оплатить другим способом.</p>
                    </div>
                  )}
                  <button type="button" onClick={() => pickMethod('Картой')} className={`mt-4 rounded text-sm font-semibold text-brand hover:text-ink ${RING}`}>
                    Оплатить картой вместо счёта →
                  </button>
                </div>
              )}

              {fold}
            </Card>
          )}

          {state === 'paid' && (
            <Card title="Оплата">
              <SummaryRow label="Статус" value="оплачено" />
              <SummaryRow label="Тариф" value={tariff} />
              <SummaryRow
                label="Продление"
                value={b.cancelled ? 'не будет — единственный сайт отключается' : `${period.renew} · ${PRICE_LABEL}`}
              />
              <SummaryRow
                label="Способ оплаты"
                value={b.card ? `Карта ···· ${b.card.last4}` : 'По счёту'}
                note={b.card ? `до ${b.card.exp} · привязана к ${a.domain}` : 'Счёт на почту, оплата переводом'}
              />
              {fold}
            </Card>
          )}

          {/* Почта для актов — отдельным разделом: бухгалтерский адрес
              относится к оплате, а не к настройкам аккаунта. */}
          {state !== 'notstarted' && (
            <Card title="Куда присылать акты">
              {actsEmail && !actsEditing ? (
                <SummaryRow label="Сюда придут чеки и акты" value={actsEmail} onEdit={() => setActsEditing(true)} editing={false} />
              ) : (
                <>
                  <Field
                    label="Почта"
                    type="email"
                    placeholder="buh@stroy-dom.ru"
                    value={actsEmail}
                    onChange={(e) => {
                      setActsEmail(e.target.value);
                      setActsErr(null);
                    }}
                    error={actsErr}
                  />
                  <p className="mt-2 text-[13px] text-ink/55">
                    Обычно это бухгалтерия. Если оставить пустым, будем присылать на почту аккаунта
                    {a.personEmail ? ` — ${a.personEmail}` : ''}. Необязательно.
                  </p>
                  <button type="button" onClick={saveActs} className={`mt-4 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white ${RING}`}>
                    Сохранить
                  </button>
                </>
              )}
            </Card>
          )}

          {/* Акт появляется только после оплаты: он закрывает оплаченный
              период, а не пробный и не выставленный счёт. */}
          {state === 'paid' && (
            <Card title="Акты">
              <p className="-mt-3 mb-4 text-[13px] text-ink/55">Закрывающие документы для бухгалтерии — один акт за оплаченный год.</p>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
                <div>
                  <p className="text-sm font-bold">Акт за {period.years}</p>
                  <p className="mt-0.5 text-[13px] text-ink/55">
                    {period.from} – {period.to} · {PRICE_LABEL}
                  </p>
                </div>
                <span className="rounded-full bg-ok/10 px-3 py-1.5 text-[11px] font-bold text-ok">
                  готов · отправлен на {actsEmail || a.personEmail || 'почту аккаунта'}
                </span>
              </div>
            </Card>
          )}

        </div>
      </section>

    </main>
  );
}
