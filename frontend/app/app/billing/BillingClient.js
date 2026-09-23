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
import {
  accountSites, formatRub, issueSiteInvoice, nextRenewal, openSite, paySite, setSiteCancelled, setSiteTariff,
} from '../site/_shared/sites';
import { PRICE, TARIFFS, TRIAL_DAYS, trialEnds } from '../site/_shared/subscription';

// «Подписка» аккаунта (решения владельца 23.09):
// - у каждого сайта свой тариф, свой год подписки и своя дата продления —
//   оплачивают сайт в его строке; одна дата на все сайты свела бы оплату в
//   один огромный счёт раз в год;
// - общие на аккаунт — способ оплаты, карта, плательщик и почта для актов.
// Раскладка — карточки со строками «подпись — значение — действие», как в
// «Обзоре» и «Настройках».

const STEP_URLS = ['profile', 'site', 'clients', 'requisites', 'documents', 'code'].map((s) => `/app/start/${s}`);
const PRICE_TEXT = formatRub(PRICE);

function Panel({ title, aside, children }) {
  return (
    <section className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold tracking-[-0.02em]">{title}</h2>
        {aside && <span className="text-[13px] text-ink/60">{aside}</span>}
      </div>
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

const SITE_ACT_BASE = `rounded-lg px-2 py-1 text-[13px] font-semibold transition hover:bg-warm ${RING}`;
const SITE_ACT = `${SITE_ACT_BASE} text-ink/60 hover:text-ink`;
// Главное действие строки — синее, остальные приглушённые.
const SITE_ACT_MAIN = `${SITE_ACT_BASE} text-brand hover:text-ink`;
const BTN_OUTLINE = `rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-ink transition hover:border-line-2 hover:bg-warm ${RING}`;
const BTN_TEXT = `rounded-xl px-3 py-2.5 text-sm font-semibold text-ink/60 hover:text-ink ${RING}`;
const PRIMARY = `inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#1a1acc] ${RING}`;

// Строка сайта: домен и компания, тариф, состояние, действия. Действия
// словами, а не в «⋯»: назначение элемента должно читаться без клика
// (правило ревью Ивана). Оплата — тоже здесь: у каждого сайта свой год.
function SiteRow({ site, open, onOpen, onOff, onResume, onGo, children }) {
  const live = !site.cancelled && site.kind !== 'not-ready';
  const payable = site.kind === 'trial' || site.kind === 'expired' || site.kind === 'pending';
  return (
    <div className="border-t border-line py-4 first:border-t-0">
      <div className="grid gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,1fr)_120px_190px_240px] sm:items-center">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{site.domain}</p>
          {site.company && <p className="mt-0.5 truncate text-[12px] text-ink/60">{site.company}</p>}
        </div>
        <div>
          <p className="text-sm font-semibold">{site.tariff}</p>
          <p className="mt-0.5 text-[12px] text-ink/60">
            {site.nextTariff && site.period ? `с ${site.period.renew} — ${site.nextTariff}` : live ? `${PRICE_TEXT} в год` : '—'}
          </p>
        </div>
        <span className={`w-fit rounded-full px-3 py-1.5 text-[11px] font-bold ${TONE[site.tone]}`}>{site.label}</span>
        <div className="flex flex-wrap gap-1 sm:justify-end">
          {payable && (
            <button type="button" onClick={() => onOpen('pay')} aria-expanded={open === 'pay'} className={SITE_ACT_MAIN}>
              {open === 'pay' ? 'Свернуть' : site.kind === 'pending' ? 'Счёт' : 'Оплатить'}
            </button>
          )}
          {live && (
            <button type="button" onClick={() => onOpen('tariff')} aria-expanded={open === 'tariff'} className={SITE_ACT}>
              {open === 'tariff' ? 'Свернуть' : 'Тариф'}
            </button>
          )}
          {live && (
            <button type="button" onClick={onOff} className={`${SITE_ACT_BASE} text-ink/60 hover:text-danger`}>
              Отключить
            </button>
          )}
          {site.cancelled && (
            <button type="button" onClick={onResume} className={SITE_ACT_MAIN}>
              Вернуть в подписку
            </button>
          )}
          {site.kind === 'not-ready' && !site.cancelled && (
            <button type="button" onClick={onGo} className={SITE_ACT_MAIN}>
              {site.label === 'код не установлен' ? 'Поставить код' : 'Продолжить анкету'}
            </button>
          )}
        </div>
      </div>
      {open && <div className="mt-4 rounded-xl bg-warm/60 p-4 sm:p-5">{children}</div>}
    </div>
  );
}

export default function BillingClient() {
  const router = useRouter();
  const [a, setA] = useState(null);
  const [user, setUser] = useState(CURRENT_USER);
  const [now, setNow] = useState(Date.now());

  // Раскрытая панель в строке сайта: { key, panel: 'tariff' | 'pay' }.
  const [open, setOpen] = useState(null);
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
  // Отдельный плательщик — в подписке аккаунта, чтобы пережить F5 и не
  // вводиться заново к каждому счёту. null — ещё не заполнен.
  const [otherPayer, setOtherPayer] = useState(null);
  const [payerModal, setPayerModal] = useState(false);

  const [whatOpen, setWhatOpen] = useState(false);
  const [actsEmail, setActsEmail] = useState('');
  const [actsEditing, setActsEditing] = useState(false);
  const [actsErr, setActsErr] = useState(null);
  const [copied, setCopied] = useState(null);

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
    if (b.payerOther) {
      setOtherPayer(b.payerOther);
      setPayerMode('Другие реквизиты');
    }
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [router]);

  if (!a) return null;

  const b = a.billing || {};
  const sites = accountSites(a, now);
  const main = sites[0];
  const single = sites.length === 1;
  const req = a.contacts || {};
  const account = a.bank?.account || '';
  const renewal = nextRenewal(sites);
  const paidSites = sites.filter((s) => s.period && (s.kind === 'paid' || s.kind === 'off-soon'));

  function reload() {
    setA(loadAnketa());
  }

  function saveBilling(patch) {
    saveAnketa({ billing: { ...loadAnketa().billing, ...patch } });
    reload();
  }

  function toggle(site, panel) {
    if (open?.key === site.key && open.panel === panel) {
      setOpen(null);
      return;
    }
    if (panel === 'tariff') setTariffPick(site.nextTariff || site.tariff);
    setCardErr({});
    setOpen({ key: site.key, panel });
  }

  function pickTariff(site) {
    setSiteTariff(site.key, tariffPick, site.kind === 'paid');
    reload();
    setOpen(null);
  }

  function pickMethod(m) {
    setMethod(m);
    saveBilling({ method: m });
  }

  // Карта — на аккаунт: привязанной один раз, ею оплачивают и другие сайты.
  function payByCard(site) {
    if (!b.card) {
      const digits = cardNo.replace(/\D/g, '');
      const [mm, yy] = cardExp.split('/');
      const errs = {};
      if (digits.length !== 16) errs.no = 'Номер карты — 16 цифр.';
      if (!/^\d{2}\/\d{2}$/.test(cardExp) || +mm < 1 || +mm > 12) errs.exp = 'Срок действия — в формате ММ/ГГ.';
      if (!/^\d{3}$/.test(cardCvc)) errs.cvc = 'CVC — 3 цифры на обороте карты.';
      setCardErr(errs);
      if (Object.keys(errs).length) return;
      saveAnketa({ billing: { ...loadAnketa().billing, method: 'Картой', card: { last4: digits.slice(-4), exp: `${mm}/${yy}` } } });
      setMethod('Картой');
      setCardNo('');
      setCardExp('');
      setCardCvc('');
    }
    paySite(site.key);
    reload();
    setOpen(null);
  }

  const currentPayer = payerMode === 'Как в анкете' ? null : otherPayer;
  const payerName = payerMode === 'Как в анкете' ? operatorName(a) : otherPayer?.name || 'другие реквизиты';

  function issueInvoice(site) {
    // Без реквизитов плательщика счёт не выставить — сразу открываем окно.
    if (payerMode === 'Другие реквизиты' && !otherPayer) {
      setPayerOpen(true);
      setPayerModal(true);
      return;
    }
    issueSiteInvoice(site.key, currentPayer);
    reload();
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

  function copy(key, text) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const payerNote = [a.inn && `ИНН ${a.inn}`, req.companyMail, req.companyPhone, account && `счёт …${account.slice(-4)}`]
    .filter(Boolean)
    .join(' · ');

  // Лид: одна фраза о состоянии. При нескольких сайтах состояние у каждого
  // своё — лид говорит, как устроена оплата.
  const lead = single
    ? {
        'not-ready': 'Подписка начнётся с пробного периода, когда код встанет на сайт.',
        trial: `Пробный период — до ${a.trialStartedAt ? trialEnds(a) : ''}. Оплата продлевает доступ без перерыва.`,
        expired: 'Пробный период закончился — оплата включит виджет и документы снова.',
        pending: 'Счёт выставлен — отметим оплату, как только поступят деньги, обычно 1–3 рабочих дня.',
        paid: main.period && `Оплачено до ${main.period.to}.`,
        'off-soon': main.period && `Сайт отключается — работает до ${main.period.to}.`,
        off: 'Сайт отключён.',
      }[main.kind]
    : `${sites.length} ${plural(sites.length, 'сайт', 'сайта', 'сайтов')} — у каждого свой год подписки и своя дата продления.`;

  // «Что входит»: рамка зависит от состояния, один список на разные
  // ситуации врал бы в части из них.
  const common = ['Готовый пакет документов под ваш сайт', 'Виджет: cookie-баннер и подвал, из которого открываются документы и реквизиты', 'Документы по постоянным адресам — ссылки не ломаются'];
  const frames =
    main.kind === 'paid' || !single
      ? [['Что работает по подписке', ['Пакет документов под ваш сайт, собранный по вашим ответам', 'Виджет: cookie-баннер и подвал, из которого открываются документы и реквизиты', 'Маркировка упоминаний по реестрам на ваших страницах', 'Переписываем документы при изменении закона и присылаем письмо', 'Проверяем, что виджет и документы на сайте на месте']]]
      : main.kind === 'expired'
        ? [
            ['Сейчас отключено', ['Виджет снят с сайта — cookie-баннер и подвал не показываются', 'Документы в кабинете открываются только на просмотр']],
            ['Оплата включит снова', ['Виджет и документы заработают как прежде', 'Следим за законом и обновляем документы сами', 'Уведомления, если что-то изменилось']],
          ]
        : [
            [a.installed ? `Уже работает — бесплатно до ${a.trialStartedAt ? trialEnds(a) : ''}` : `Включится, как только код встанет на сайт, — ${TRIAL_DAYS} дней бесплатно`, common],
            ['Оплата продлевает', ['Доступ не прерывается после пробного периода', 'Следим за законом и обновляем документы сами', 'Уведомления, если что-то изменилось']],
          ];

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

  function cardPart(site) {
    return (
      <div className={site.invoice ? 'mt-5 border-t border-line pt-5' : ''}>
        {b.card ? (
          <p className="text-[13px] leading-5 text-ink/65">
            Спишем {PRICE_TEXT} с карты <b className="text-ink">···· {b.card.last4}</b>. Год подписки {site.domain} начнётся
            сегодня — у сайта будет своя дата продления.
          </p>
        ) : (
          <>
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
            <p className="mt-3 text-[12px] text-ink/60">Карта привяжется к аккаунту — ею можно будет оплачивать и другие сайты.</p>
          </>
        )}
        <button type="button" onClick={() => payByCard(site)} className={`mt-4 ${PRIMARY}`}>
          Оплатить {PRICE_TEXT}
        </button>
      </div>
    );
  }

  // Панель оплаты в строке сайта: картой — списание сразу, по счёту — счёт на
  // этот сайт. Способ и плательщик общие, меняются в «Оплате» ниже.
  function payPanel(site) {
    const inv = site.invoice;
    if (inv) {
      const url = `https://cdn.sleza.media/${SITE_ID}/invoice-${inv.no}.pdf`;
      const changed = JSON.stringify(inv.payer || null) !== JSON.stringify(currentPayer);
      const overdue = now - inv.at > 3 * 24 * 3600 * 1000;
      return (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold">
                Счёт № {inv.no} · {formatRub(inv.amount || PRICE)}
              </p>
              <p className="mt-0.5 text-[12px] leading-4 text-ink/60">
                на {inv.payer?.name || operatorName(a)} · ссылка работает, пока счёт не оплачен
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <IconAction label="Открыть счёт" icon={ExternalIcon} href={url} />
              <IconAction
                label="Скопировать ссылку"
                done={copied === inv.no ? 'Скопировано' : null}
                icon={copied === inv.no ? CheckIcon : CopyIcon}
                onClick={() => copy(inv.no, url)}
              />
            </div>
          </div>
          {overdue && (
            <p className="mt-3 rounded-lg bg-warn/10 p-3 text-[12px] leading-4 text-ink/70">
              Счёт выставлен больше 3 дней назад и не оплачен. Если перевод завис в банке — напишите в поддержку.
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {/* Плательщика сменили после выставления — только тогда. */}
            {changed && (
              <button type="button" onClick={() => issueInvoice(site)} className={PRIMARY}>
                Сформировать заново — на {payerName}
              </button>
            )}
            {method !== 'Картой' && (
              <button type="button" onClick={() => pickMethod('Картой')} className={`rounded text-sm font-semibold text-brand hover:text-ink ${RING}`}>
                Оплатить картой вместо счёта →
              </button>
            )}
          </div>
          {method === 'Картой' && cardPart(site)}
        </>
      );
    }
    return method === 'Картой' ? (
      cardPart(site)
    ) : (
      <>
        <p className="text-[13px] leading-5 text-ink/65">
          Счёт на <b className="text-ink">{payerName}</b> за год подписки {site.domain}. Год начнётся с оплаты — у сайта будет
          своя дата продления.
        </p>
        <button type="button" onClick={() => issueInvoice(site)} className={`mt-4 ${PRIMARY}`}>
          Выставить счёт на {PRICE_TEXT}
        </button>
      </>
    );
  }

  // Один сайт с незаконченной анкетой — платить не за что, путь туда, где
  // появятся документы.
  const notReady = single && main.kind === 'not-ready';

  return (
    <main className="min-h-screen bg-warm text-ink lg:flex">
      <AccountSidebar active="Подписка" user={user} />

      <section className="min-w-0 flex-1 px-5 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12 xl:px-20">
        <div className="mx-auto max-w-4xl">
          <header>
            <h1 className="text-[28px] font-bold tracking-[-0.045em] sm:text-[36px]">Подписка</h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-6 text-ink/65">{lead}</p>
          </header>

          {notReady ? (
            <section className="mt-6 rounded-2xl border border-warn/30 bg-warn/[0.06] p-6 shadow-sm sm:p-7">
              <h2 className="text-lg font-bold tracking-[-0.02em]">
                {(a.stepsDone || 0) >= 4 ? 'Документы собраны, код не установлен' : 'Анкета не закончена'}
              </h2>
              <p className="mt-3 text-sm leading-6 text-ink/65">
                {(a.stepsDone || 0) >= 4
                  ? `Пакет готов. Как только код встанет на сайт, включим документы и виджет — ${TRIAL_DAYS} дней бесплатно.`
                  : 'Документы собираем по ответам анкеты.'}
              </p>
              <button type="button" onClick={() => router.push(STEP_URLS[Math.min(a.stepsDone || 0, 5)])} className={`mt-5 ${PRIMARY}`}>
                {(a.stepsDone || 0) >= 4 ? 'Поставить код на сайт' : 'Продолжить анкету'} <ArrowRightIcon size={16} />
              </button>
            </section>
          ) : (
            <>
              {/* Сайты — первым: что с каждым, какой тариф, когда продление.
                  Тариф, оплата и отключение — в строке сайта (решение 23.09). */}
              <Panel title="Сайты в подписке" aside={`${sites.length} ${plural(sites.length, 'сайт', 'сайта', 'сайтов')}`}>
                {sites.map((site) => (
                  <SiteRow
                    key={site.key}
                    site={site}
                    open={open?.key === site.key ? open.panel : null}
                    onOpen={(panel) => toggle(site, panel)}
                    onOff={() => setOff({ site, step: 1 })}
                    onResume={() => {
                      setSiteCancelled(site.key, false);
                      reload();
                    }}
                    onGo={() => {
                      // Анкета этого сайта, а не открытого: у каждого сайта свой шаг.
                      openSite(site.key);
                      router.push(STEP_URLS[Math.min(site.stepsDone || 0, 5)]);
                    }}
                  >
                    {open?.panel === 'tariff' ? (
                      <>
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
                          {site.kind === 'paid'
                            ? `Новый тариф начнёт действовать с продления ${site.period.renew} — текущий год уже оплачен.`
                            : 'Состав тарифов ещё утверждается — цена пока одна.'}
                        </p>
                        <div className="mt-4 flex gap-3">
                          <button type="button" onClick={() => pickTariff(site)} className={BTN_OUTLINE}>
                            Выбрать этот тариф
                          </button>
                          <button type="button" onClick={() => setOpen(null)} className={BTN_TEXT}>
                            Отмена
                          </button>
                        </div>
                      </>
                    ) : (
                      payPanel(site)
                    )}
                  </SiteRow>
                ))}
                {renewal && (
                  <p className="mt-1 flex flex-wrap items-baseline justify-between gap-2 border-t border-line pt-4 text-[13px] text-ink/60">
                    <span>
                      Ближайшее продление — <b className="text-ink">{renewal.date}</b> · {renewal.site.domain}
                    </span>
                    <b className="text-[15px] text-ink">{PRICE_TEXT}</b>
                  </p>
                )}
              </Panel>

              {/* Общее на аккаунт: как платим и кто плательщик. */}
              <Panel title="Оплата">
                <Row
                  label="Способ оплаты"
                  value={method === 'Картой' ? (b.card ? `Карта ···· ${b.card.last4}` : 'Картой') : 'По счёту'}
                  note={
                    method === 'Картой'
                      ? b.card
                        ? `до ${b.card.exp} · продления списываются автоматически`
                        : 'карту привяжете при первой оплате'
                      : 'счёт на почту, оплата переводом'
                  }
                  action="Изменить"
                  open={methodOpen}
                  onAction={() => setMethodOpen(!methodOpen)}
                >
                  <Segmented options={['Картой', 'По счёту']} value={method} onChange={pickMethod} />
                  {b.card && (
                    <button
                      type="button"
                      onClick={() => {
                        saveBilling({ card: null, method: 'По счёту' });
                        setMethod('По счёту');
                      }}
                      className={`mt-3 block rounded text-sm font-semibold text-ink/60 hover:text-danger ${RING}`}
                    >
                      Отвязать карту ···· {b.card.last4}
                    </button>
                  )}
                </Row>

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
                <p className="mt-2 border-t border-line pt-4 text-[12px] text-ink/60">
                  Способ оплаты и плательщик — общие для всех сайтов. Оплачивают каждый сайт в его строке выше.
                </p>
              </Panel>

              {/* Для бухгалтерии: куда слать акты и чеки и сами акты — по одному
                  на оплаченный год каждого сайта. Бухгалтерский адрес относится
                  к оплате, а не к настройкам аккаунта (макет, 9.09). */}
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
                {paidSites.map((s) => (
                  <Row
                    key={s.key}
                    label={`Акт · ${s.domain}`}
                    value={`${s.period.from} – ${s.period.to}`}
                    note={`${PRICE_TEXT} · отправлен на ${b.actsEmail || a.personEmail || 'почту аккаунта'}`}
                    actions={<IconAction label="Открыть акт" icon={ExternalIcon} href={`https://cdn.sleza.media/${SITE_ID}/act-${s.key}-${s.period.years}.pdf`} />}
                  />
                ))}
              </Panel>

              <div className="mt-6">{fold}</div>
            </>
          )}
        </div>
      </section>

      {off && (
        <SiteOffModal
          site={off.site}
          step={off.step}
          paidUntil={off.site.period?.to}
          onStep={(n) => setOff({ ...off, step: n })}
          onClose={() => setOff(null)}
          onConfirm={() => {
            setSiteCancelled(off.site.key, true);
            reload();
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
