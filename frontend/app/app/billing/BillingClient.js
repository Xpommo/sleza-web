'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon, CheckIcon, ChevronDownIcon, CopyIcon, ExternalIcon } from '../../../components/app/AppIcons';
import { IconAction } from '../../../components/app/DocRows';
import { CURRENT_USER } from '../../../lib/appMock';
import { Field, Segmented } from '../start/_shared/AnketaChrome';
import { accountUser, loadAnketa, saveAnketa } from '../start/_shared/anketaState';
import { SITE_ID, operatorName } from '../../../lib/docPackage';
import { AccountSidebar, RING } from '../site/_shared/SiteChrome';
import InvoicePayerModal, { payerSummary } from './InvoicePayerModal';
import SiteOffModal from './SiteOffModal';
import { accountSites, billableTotal, formatRub, setSiteCancelled, setSiteTariff } from '../site/_shared/sites';
import { PRICE, PRICE_LABEL, TARIFFS, TRIAL_DAYS, paidPeriod, subState, trialEnds } from '../site/_shared/subscription';

const STEP_URLS = ['profile', 'site', 'clients', 'requisites', 'documents', 'code'].map((s) => `/app/start/${s}`);

// Карточка и строка «подпись — значение — действие»: тот же приём, что в
// «Обзоре» и «Настройках». Раньше каждый факт («Статус», «Тариф»,
// «Продление», «Способ оплаты») стоял отдельной карточкой — экран выглядел
// нагромождённым и выбивался из остального кабинета (правка владельца 23.09).
function Panel({ title, children }) {
  return (
    <section className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7">
      <h2 className="mb-2 text-lg font-bold tracking-[-0.02em]">{title}</h2>
      <div>{children}</div>
    </section>
  );
}

// action — текстовая кнопка («Изменить»), раскрывает правку под строкой;
// actions — иконки (открыть / скопировать), как в «Документах».
function Row({ label, value, note, action, onAction, open, actions, children }) {
  return (
    <div className="border-t border-line py-4 first:border-t-0">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1 sm:flex sm:gap-4">
          <span className="block text-[12px] text-ink/60 sm:w-36 sm:shrink-0 sm:pt-0.5 sm:text-[13px]">{label}</span>
          <div className="mt-0.5 min-w-0 sm:mt-0">
            <p className="text-sm font-bold">{value}</p>
            {note && <p className="mt-0.5 break-words text-[12px] leading-4 text-ink/60">{note}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        {action && (
          <button
            type="button"
            onClick={onAction}
            aria-expanded={children ? open : undefined}
            className={`shrink-0 rounded-lg px-2 py-1 text-[13px] font-semibold text-ink/60 transition hover:bg-warm hover:text-ink ${RING}`}
          >
            {open ? 'Свернуть' : action}
          </button>
        )}
      </div>
      {open && children && <div className="mt-4 sm:pl-40">{children}</div>}
    </div>
  );
}

function plural(n, one, few, many) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

const TONE = {
  ok: 'bg-ok/10 text-ok',
  info: 'bg-brand/[0.07] text-brand',
  warn: 'bg-warn/10 text-warn',
  muted: 'bg-warm text-ink/60',
};

// Строка сайта: домен и компания, тариф, состояние и действия. Действия
// словами, а не спрятаны в «⋯»: назначение элемента должно читаться без
// клика (правило ревью Ивана).
function SiteRow({ site, paid, renew, tariffOpen, onTariff, onOff, onResume, children }) {
  const active = !site.cancelled && site.kind !== 'not-ready';
  return (
    <div className="border-t border-line py-4 first:border-t-0">
      <div className="grid gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,1fr)_120px_190px_220px] sm:items-center">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{site.domain}</p>
          {site.company && <p className="mt-0.5 truncate text-[12px] text-ink/60">{site.company}</p>}
        </div>
        <div>
          <p className="text-sm font-semibold">{site.tariff}</p>
          <p className="mt-0.5 text-[12px] text-ink/60">
            {site.nextTariff ? `с ${renew} — ${site.nextTariff}` : active ? `${formatRub(site.price)} в год` : '—'}
          </p>
        </div>
        <span className={`w-fit rounded-full px-3 py-1.5 text-[11px] font-bold ${TONE[site.tone]}`}>{site.label}</span>
        <div className="flex flex-wrap gap-1 sm:justify-end">
          {active && (
            <>
              <button type="button" onClick={onTariff} aria-expanded={tariffOpen} className={SITE_ACT}>
                {tariffOpen ? 'Свернуть' : 'Изменить тариф'}
              </button>
              <button type="button" onClick={onOff} className={`${SITE_ACT} hover:text-danger`}>
                Отключить
              </button>
            </>
          )}
          {site.cancelled && (
            <button type="button" onClick={onResume} className={`${SITE_ACT} text-brand`}>
              Вернуть в подписку
            </button>
          )}
        </div>
      </div>
      {tariffOpen && <div className="mt-4">{children}</div>}
    </div>
  );
}

const SITE_ACT = `rounded-lg px-2 py-1 text-[13px] font-semibold text-ink/60 transition hover:bg-warm hover:text-ink ${RING}`;
const BTN_OUTLINE = `rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-ink transition hover:border-line-2 hover:bg-warm ${RING}`;
const BTN_TEXT = `rounded-xl px-3 py-2.5 text-sm font-semibold text-ink/60 hover:text-ink ${RING}`;

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
// Главное действие экрана — крупнее остальных кнопок и во всю ширину.
const PRIMARY_WIDE = `flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 text-[15px] font-bold text-white shadow-sm transition hover:-translate-y-px hover:bg-[#1a1acc] hover:shadow-md active:translate-y-0 ${RING}`;

export default function BillingClient() {
  const router = useRouter();
  const [a, setA] = useState(null);
  const [user, setUser] = useState(CURRENT_USER);
  const [now, setNow] = useState(Date.now());

  // Строка сайта, у которой открыт выбор тарифа, и выбранный в нём тариф.
  const [tariffOpen, setTariffOpen] = useState(null);
  const [tariffPick, setTariffPick] = useState(TARIFFS[0]);
  const [off, setOff] = useState(null); // { site, step }
  const [methodOpen, setMethodOpen] = useState(false);
  const [method, setMethod] = useState('По счёту');

  const [cardNo, setCardNo] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardErr, setCardErr] = useState({});

  const [payerOpen, setPayerOpen] = useState(false);
  const [payerMode, setPayerMode] = useState('Как в анкете');
  // Отдельный плательщик — сохраняется в подписке, чтобы пережить F5 и не
  // вводиться заново к следующему счёту. null — ещё не заполнен.
  const [otherPayer, setOtherPayer] = useState(null);
  const [payerModal, setPayerModal] = useState(false);

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
    if (b.method) setMethod(b.method);
    if (b.actsEmail) setActsEmail(b.actsEmail);
    if (b.payerOther) setOtherPayer(b.payerOther);
    // Выбор плательщика после F5 — тот, на кого выставлен счёт; без счёта —
    // отдельные реквизиты, если их уже заполняли.
    if (b.invoice ? b.invoice.payer : b.payerOther) setPayerMode('Другие реквизиты');
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
  const sites = accountSites(a, now);
  const total = billableTotal(sites);
  const TOTAL_LABEL = formatRub(total.amount);

  function saveBilling(patch) {
    saveAnketa({ billing: { ...loadAnketa().billing, ...patch } });
    setA(loadAnketa());
  }

  function pickTariff(site) {
    setSiteTariff(site.key, tariffPick, state === 'paid');
    setA(loadAnketa());
    setTariffOpen(null);
  }

  function openTariff(site) {
    if (tariffOpen === site.key) {
      setTariffOpen(null);
      return;
    }
    setTariffPick(site.nextTariff || site.tariff);
    setTariffOpen(site.key);
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
    saveBilling({ method: 'Картой', card: { last4: digits.slice(-4), exp: `${mm}/${yy}` }, paidAt: Date.now(), paidAmount: total.amount, invoice: null });
    setCardNo('');
    setCardExp('');
    setCardCvc('');
  }

  function issueInvoice() {
    let p = null;
    if (payerMode === 'Другие реквизиты') {
      // Без реквизитов плательщика счёт не выставить — сразу открываем окно.
      if (!otherPayer) {
        setPayerOpen(true);
        setPayerModal(true);
        return;
      }
      p = otherPayer;
    }
    const year = new Date().getFullYear();
    // Переформированный счёт — новый документ с новым номером: старый уже
    // могли переслать бухгалтеру, два разных счёта под одним номером нельзя.
    const no = b.invoice ? `${year}-${String(Number(b.invoice.no.split('-')[1]) + 1).padStart(4, '0')}` : `${year}-0142`;
    saveBilling({ method: 'По счёту', invoice: { no, at: Date.now(), payer: p, amount: total.amount } });
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
    notstarted: 'Подписка начнётся с пробного периода, когда код встанет на первый сайт.',
    trial: `Пробный период — до ${a.trialStartedAt ? trialEnds(a) : ''}. Оплата продлевает доступ без перерыва.`,
    expired: 'Пробный период закончился — оплата включит виджет и документы снова.',
    pending: 'Счёт выставлен — отметим оплату, как только поступят деньги, обычно 1–3 рабочих дня.',
    paid: period && (total.count === 0 ? `Оплачено до ${period.to}, продления не будет — все сайты отключаются.` : `Оплачено до ${period.to}.`),
  }[state];

  const payerNote = [a.inn && `ИНН ${a.inn}`, req.companyMail, req.companyPhone, account && `счёт …${account.slice(-4)}`]
    .filter(Boolean)
    .join(' · ');
  const invoiceOverdue = b.invoice && now - b.invoice.at > 3 * 24 * 3600 * 1000;
  const currentPayer = payerMode === 'Как в анкете' ? null : otherPayer;
  // Счёт переформировывают, если сменился плательщик или сумма: отключили
  // сайт — в выставленном счёте он всё ещё есть.
  const invoiceAmount = b.invoice ? b.invoice.amount ?? total.amount : 0;
  const payerChanged = b.invoice && (JSON.stringify(b.invoice.payer || null) !== JSON.stringify(currentPayer) || invoiceAmount !== total.amount);

  // «Что входит»: рамка своя у каждого состояния — один список на три
  // разные ситуации врал в двух из них.
  const now1 = a.installed
    ? [`Уже работает — бесплатно до ${a.trialStartedAt ? trialEnds(a) : ''}`, ['Готовый пакет документов под ваш сайт', 'Виджет: cookie-баннер и подвал, из которого открываются документы и реквизиты', 'Документы по постоянным адресам — ссылки не ломаются']]
    : [`Включится, как только код встанет на сайт, — ${TRIAL_DAYS} дней бесплатно`, ['Готовый пакет документов под ваш сайт', 'Виджет: cookie-баннер и подвал, из которого открываются документы и реквизиты', 'Документы по постоянным адресам — ссылки не ломаются']];
  const frames =
    state === 'paid'
      ? [['Что работает по подписке', ['Пакет документов под ваш сайт, собранный по вашим ответам', 'Виджет: cookie-баннер и подвал, из которого открываются документы и реквизиты', 'Маркировка упоминаний по реестрам на ваших страницах', 'Переписываем документы при изменении закона и присылаем письмо', 'Проверяем, что виджет и документы на сайте на месте']]]
      : state === 'expired'
      ? [
          ['Сейчас отключено', ['Виджет снят с сайта — cookie-баннер и подвал не показываются', 'Документы в кабинете открываются только на просмотр']],
          ['Оплата включит снова', ['Виджет и документы заработают как прежде', 'Следим за законом и обновляем документы сами', 'Уведомления, если что-то изменилось']],
        ]
      : [now1, ['Оплата продлевает', ['Доступ не прерывается после пробного периода', 'Следим за законом и обновляем документы сами', 'Уведомления, если что-то изменилось']]];

  // «Что входит» — разворотом внизу: цена уже в строке тарифа, перечень
  // нужен тому, кто сомневается, а не каждому.
  const fold = (
    <div className="rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(17,17,16,0.04)]">
      <button
        type="button"
        onClick={() => setWhatOpen(!whatOpen)}
        aria-expanded={whatOpen}
        aria-controls="what-included"
        className={`flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left text-sm font-bold sm:px-6 ${RING}`}
      >
        Что входит в подписку
        <ChevronDownIcon size={16} className={`shrink-0 text-ink/40 transition-transform duration-300 ${whatOpen ? 'rotate-180' : ''}`} />
      </button>
      <div
        id="what-included"
        aria-hidden={!whatOpen}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${whatOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <div className="space-y-4 px-5 pb-5 text-[13px] leading-5 sm:px-6">
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
        </div>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-warm text-ink lg:flex">
      <AccountSidebar active="Подписка" user={user} />

      <section className="min-w-0 flex-1 px-5 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12 xl:px-20">
        <div className="mx-auto max-w-4xl">
          <header>
            <h1 className="text-[28px] font-bold tracking-[-0.045em] sm:text-[36px]">Подписка</h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-6 text-ink/65">{lead}</p>
          </header>

          {/* Пока анкета не пройдена, платить не за что: документов нет,
              виджет не установлен. Вместо оплаты — путь туда, где это появится. */}
          {state === 'notstarted' && (
            <Card title={(a.stepsDone || 0) >= 4 ? 'Документы собраны, код не установлен' : 'Анкета не закончена'} tone="warn">
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

          {/* Сайты в подписке — первым: за что платим и что с каждым сайтом.
              Тариф и отключение — у каждого сайта свои, управляют ими здесь
              (решение владельца 23.09); счёт при этом один. */}
          {state !== 'notstarted' && (
            <section className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold tracking-[-0.02em]">Сайты в подписке</h2>
                <span className="text-[13px] text-ink/60">
                  {sites.length} {plural(sites.length, 'сайт', 'сайта', 'сайтов')}
                </span>
              </div>
              <div>
              {sites.map((site) => (
                <SiteRow
                  key={site.key}
                  site={site}
                  paid={state === 'paid'}
                  renew={period?.renew}
                  tariffOpen={tariffOpen === site.key}
                  onTariff={() => openTariff(site)}
                  onOff={() => setOff({ site, step: 1 })}
                  onResume={() => {
                    setSiteCancelled(site.key, false);
                    setA(loadAnketa());
                  }}
                >
                  {/* Тариф не применяется по клику: случайное нажатие по
                      соседней кнопке меняло бы оплачиваемый тариф. */}
                  <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={`Тариф ${site.domain}`}>
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
                  <p className="mt-3 text-[12px] text-ink/60">
                    {state === 'paid'
                      ? `Новый тариф начнёт действовать с продления ${period.renew} — текущий год уже оплачен.`
                      : 'Состав тарифов ещё утверждается — цена пока одна.'}
                  </p>
                  <div className="mt-4 flex gap-3">
                    <button type="button" onClick={() => pickTariff(site)} className={BTN_OUTLINE}>
                      Выбрать этот тариф
                    </button>
                    <button type="button" onClick={() => setTariffOpen(null)} className={BTN_TEXT}>
                      Отмена
                    </button>
                  </div>
                </SiteRow>
              ))}
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-line pt-4">
                <span className="text-[13px] text-ink/60">
                  {state === 'paid' ? `Следующий счёт, с ${period.renew}` : 'К оплате за год'}
                  {total.count < sites.length && ` · ${total.count} из ${sites.length} ${plural(sites.length, 'сайта', 'сайтов', 'сайтов')}`}
                </span>
                <span className="text-[15px] font-bold">{TOTAL_LABEL}</span>
              </div>
            </section>
          )}

          {state !== 'notstarted' && (
            <Panel title="Оплата">
              {state === 'paid' ? (
                <>
                  <Row
                    label="Способ оплаты"
                    value={b.card ? `Карта ···· ${b.card.last4}` : 'По счёту'}
                    note={b.card ? `до ${b.card.exp} · привязана к аккаунту` : 'счёт на почту, оплата переводом'}
                    action={b.card ? 'Отвязать' : null}
                    onAction={() => saveBilling({ card: null, method: 'По счёту' })}
                  />
                </>
              ) : (
                <>
                  <Row
                    label="Способ оплаты"
                    value={method}
                    note={method === 'По счёту' ? 'счёт на почту, оплата переводом' : 'спишем сразу после привязки карты'}
                    action="Изменить"
                    open={methodOpen}
                    onAction={() => setMethodOpen(!methodOpen)}
                  >
                    <Segmented options={['Картой', 'По счёту']} value={method} onChange={pickMethod} />
                  </Row>

                  {/* Плательщик виден и после выставления счёта (живой макет):
                      иначе не понять, на кого выставлен счёт, и не поменять это. */}
                  {method === 'По счёту' && (
                    <Row
                      label="Плательщик"
                      value={payerMode === 'Как в анкете' ? operatorName(a) : otherPayer?.name || 'Реквизиты не заполнены'}
                      note={
                        payerMode === 'Как в анкете'
                          ? `${payerNote} · из анкеты`
                          : otherPayer
                            ? `${payerSummary(otherPayer)} · отдельные реквизиты`
                            : 'без них счёт не выставить'
                      }
                      action="Изменить"
                      open={payerOpen}
                      onAction={() => setPayerOpen(!payerOpen)}
                    >
                      <div className="space-y-3">
                        <Segmented options={['Как в анкете', 'Другие реквизиты']} value={payerMode} onChange={setPayerMode} />
                        <p className="text-[13px] leading-5 text-ink/60">
                          {payerMode === 'Как в анкете'
                            ? 'Возьмём данные компании с шага «Реквизиты». В подвал сайта они и так идут — здесь они нужны только для счёта.'
                            : 'Нужно, когда счёт оплачивает другая компания — не та, чьи реквизиты стоят в подвале сайта.'}
                        </p>
                        {payerMode === 'Другие реквизиты' && (
                          <button type="button" onClick={() => setPayerModal(true)} className={BTN_OUTLINE}>
                            {otherPayer ? 'Изменить реквизиты' : 'Заполнить реквизиты'}
                          </button>
                        )}
                      </div>
                    </Row>
                  )}

                  {/* Выставленный счёт — строкой с теми же иконками, что у
                      документов: открыть и скопировать ссылку для бухгалтера. */}
                  {b.invoice && method === 'По счёту' && (
                    <Row
                      label="Счёт"
                      value={`№ ${b.invoice.no} · ${formatRub(invoiceAmount)}`}
                      note={`на ${b.invoice.payer?.name || operatorName(a)} · ссылка работает, пока счёт не оплачен`}
                      actions={
                        <>
                          <IconAction label="Открыть счёт" icon={ExternalIcon} href={`https://cdn.sleza.media/${SITE_ID}/invoice-${b.invoice.no}.pdf`} />
                          <IconAction
                            label="Скопировать ссылку"
                            done={copied ? 'Скопировано' : null}
                            icon={copied ? CheckIcon : CopyIcon}
                            onClick={copyInvoice}
                          />
                        </>
                      }
                    />
                  )}

                  {invoiceOverdue && method === 'По счёту' && (
                    <div className="mt-4 rounded-xl bg-warn/10 p-4 text-[13px] leading-5 text-ink/70">
                      <p className="font-bold">Счёт выставлен больше 3 дней назад и всё ещё не оплачен.</p>
                      <p className="mt-1">Если перевод завис в банке — напишите в поддержку, поможем разобраться. Можно и оплатить картой.</p>
                    </div>
                  )}

                  {method === 'Картой' && (
                    <div className="mt-5 border-t border-line pt-5">
                      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
                        <Field
                          label="Номер карты"
                          required
                          inputMode="numeric"
                          placeholder="0000 0000 0000 0000"
                          value={cardNo}
                          onChange={(e) => setCardNo(e.target.value.replace(/[^\d ]/g, '').slice(0, 19))}
                          error={cardErr.no}
                        />
                        <Field
                          label="Срок"
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
                      <p className="mt-3 text-[12px] text-ink/60">Карта привяжется к аккаунту — с неё будем списывать за все сайты. Отвязать можно здесь же.</p>
                    </div>
                  )}

                  {/* Одно главное действие на состояние — внизу карточки. */}
                  <div className="mt-6">
                    {total.count === 0 ? (
                      <p className="text-[13px] text-ink/60">Все сайты отключены — платить не за что. Верните сайт в подписку, чтобы выставить счёт.</p>
                    ) : method === 'Картой' ? (
                      <button type="button" onClick={payByCard} className={PRIMARY_WIDE}>
                        Оплатить {TOTAL_LABEL}
                      </button>
                    ) : !b.invoice ? (
                      <button type="button" onClick={issueInvoice} className={PRIMARY_WIDE}>
                        Выставить счёт на {TOTAL_LABEL}
                      </button>
                    ) : payerChanged ? (
                      /* Счёт уже выставлен, а плательщика сменили — только тогда:
                         переформировать тот же счёт незачем. */
                      <button type="button" onClick={issueInvoice} className={PRIMARY_WIDE}>
                        Сформировать счёт заново — на {payerMode === 'Как в анкете' ? operatorName(a) : otherPayer?.name || 'другие реквизиты'}
                      </button>
                    ) : (
                      <button type="button" onClick={() => pickMethod('Картой')} className={`rounded text-sm font-semibold text-brand hover:text-ink ${RING}`}>
                        Оплатить картой вместо счёта →
                      </button>
                    )}
                  </div>
                </>
              )}
              <p className="mt-5 border-t border-line pt-4 text-[12px] text-ink/60">Счёт, тариф и акты — общие на все сайты аккаунта.</p>
            </Panel>
          )}

          {/* Для бухгалтерии: куда слать акты и чеки и сами акты. Бухгалтерский
              адрес относится к оплате, а не к настройкам аккаунта (макет, 9.09).
              Акт появляется только после оплаты: он закрывает оплаченный год. */}
          {state !== 'notstarted' && (
            <Panel title="Для бухгалтерии">
              <Row
                label="Акты и чеки"
                value={b.actsEmail || a.personEmail || 'почта аккаунта'}
                note={b.actsEmail ? null : 'почта аккаунта — можно указать бухгалтерию'}
                action="Изменить"
                open={actsEditing}
                onAction={() => setActsEditing(!actsEditing)}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex-1">
                    <Field
                      label="Почта для актов"
                      type="email"
                      placeholder={`buh@${a.domain}`}
                      value={actsEmail}
                      onChange={(e) => {
                        setActsEmail(e.target.value);
                        setActsErr(null);
                      }}
                      error={actsErr}
                    />
                  </div>
                  <button type="button" onClick={saveActs} className={`sm:mt-[30px] ${BTN_OUTLINE}`}>
                    Сохранить
                  </button>
                </div>
                <p className="mt-2 text-[12px] text-ink/60">Если оставить пустым, будем присылать на почту аккаунта.</p>
              </Row>
              {state === 'paid' && (
                <Row
                  label={`Акт за ${period.years}`}
                  value={`${period.from} – ${period.to}`}
                  note={`${formatRub(b.paidAmount || PRICE)} · отправлен на ${b.actsEmail || a.personEmail || 'почту аккаунта'}`}
                  actions={<IconAction label="Открыть акт" icon={ExternalIcon} href={`https://cdn.sleza.media/${SITE_ID}/act-${period.years}.pdf`} />}
                />
              )}
            </Panel>
          )}

          {state !== 'notstarted' && <div className="mt-6">{fold}</div>}

        </div>
      </section>

      {off && (
        <SiteOffModal
          site={off.site}
          step={off.step}
          paidUntil={period?.to}
          onStep={(n) => setOff({ ...off, step: n })}
          onClose={() => setOff(null)}
          onConfirm={() => {
            setSiteCancelled(off.site.key, true);
            setA(loadAnketa());
            setOff(null);
          }}
        />
      )}
      {payerModal && (
        <InvoicePayerModal
          initial={otherPayer}
          onClose={() => setPayerModal(false)}
          onSave={(p) => {
            setOtherPayer(p);
            saveBilling({ payerOther: p });
            setPayerModal(false);
            setPayerOpen(false);
          }}
        />
      )}
    </main>
  );
}
