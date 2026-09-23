'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon, CheckIcon, ChevronDownIcon, CopyIcon, ExternalIcon, MoreHorizontalIcon } from '../../../components/app/AppIcons';
import { IconAction } from '../../../components/app/DocRows';
import { Switch } from '../../../components/app/WidgetPreviews';
import { CURRENT_USER } from '../../../lib/appMock';
import { Field, Segmented } from '../start/_shared/AnketaChrome';
import { accountUser, loadAnketa, saveAnketa } from '../start/_shared/anketaState';
import { SITE_ID, operatorName } from '../../../lib/docPackage';
import { AccountSidebar, RING } from '../site/_shared/SiteChrome';
import InvoicePayerModal, { payerSummary } from './InvoicePayerModal';
import SiteOffModal from './SiteOffModal';
import {
  accountSites, balanceOf, currentSiteKey, debitShortfall, formatRub, issueTopupInvoice, nextDebit, nextRenewal, openSite, payYearFromBalance,
  setSiteCancelled, setSiteTariff, topUpBalance,
} from '../site/_shared/sites';
import { PRICE, TARIFFS, TRIAL_DAYS, formatDate, paidPeriod, trialEnds } from '../site/_shared/subscription';

// «Подписка» аккаунта — модель баланса (партнёрская программа, 14.09;
// владелец 23.09: «платят нам за ПО»):
// - баланс один — у пользователя; пополняют его картой или по счёту;
// - у каждого сайта свой тариф, свой год и своя дата продления; оплата года
//   списывается с баланса — автопродлением в эту дату (включено по умолчанию,
//   выключается у каждого сайта) или вручную, в любой момент: «Оплатить год»
//   до оплаты, «Продлить ещё на год» после — к сроку добавляется 12 месяцев;
// - выключенное автопродление — это и есть «отключить сайт»: работает до
//   конца оплаченного срока, дальше не продлевается;
// - способ пополнения, плательщик и почта для документов не выбраны заранее
//   (владелец 23.09) — их выбирают при первом пополнении.

const STEP_URLS = ['profile', 'site', 'clients', 'requisites', 'documents', 'code'].map((s) => `/app/start/${s}`);
const PRICE_TEXT = formatRub(PRICE);

function Panel({ title, aside, children }) {
  return (
    <section className="mt-5 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
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
  warn: 'bg-warn/10 text-warn-ink',
  muted: 'bg-warm text-ink/60',
};

const PRIMARY = `inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#1a1acc] ${RING}`;
const PRIMARY_SM = `inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1a1acc] ${RING}`;
const SECONDARY_SM = `inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 text-sm font-bold text-ink shadow-sm transition hover:border-line-2 ${RING}`;
// «Скоро» для денег — месяц: так же решает, синяя ли «Продлить на 1 год».
const DAY = 24 * 3600 * 1000;
const SOON = 30 * DAY;
// Когда нехватку пора называть жёлтым. У пробного периода — только в его
// последний день, как баннер «Обзора» и письмо-напоминание (владелец 23.09:
// пробный период — хорошая новость); у оплаченного сайта — за месяц.
const warnWithin = (site) => (site.kind === 'trial' ? DAY : SOON);
const BTN_OUTLINE = `rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-ink transition hover:border-line-2 hover:bg-warm ${RING}`;
const BTN_TEXT = `rounded-xl px-3 py-2.5 text-sm font-semibold text-ink/60 hover:text-ink ${RING}`;
const LINK = `rounded text-[13px] font-semibold text-brand hover:text-ink ${RING}`;

// Таблица сайтов (владелец 23.09: «перегружено и выбивается из общего») —
// в том же виде, что список в «Документах»: шапка моно-капсами, строки через
// тонкую линию. Одна сетка на шапку и строки — колонки не пляшут от длины
// домена. Действия — в меню «⋯» (решение владельца 23.09; прежнее правило
// Ивана «действия словами, не в ⋯» для этой таблицы снято).
const SITE_COLS = 'sm:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)_minmax(0,1.5fr)_112px_40px]';

const BADGE = {
  ok: 'bg-ok/10 text-ok',
  info: 'bg-brand/[0.07] text-brand',
  warn: 'bg-warn/10 text-warn-ink',
  danger: 'bg-danger/10 text-danger',
  beige: 'bg-warm text-ink/70 ring-1 ring-inset ring-line',
  muted: 'bg-warm text-ink/60',
};

function badgeOf(site) {
  switch (site.kind) {
    case 'paid':
      return ['ok', `Оплачено до ${site.period.to}`];
    case 'off-soon':
      return ['beige', `До ${site.period.to} · Без продления`];
    case 'trial':
      return ['info', `Бесплатно до ${site.trialTo}`];
    case 'expired':
      return ['danger', 'Пробный период закончился'];
    case 'pending':
      return ['warn', 'Ждёт оплаты по счёту'];
    default:
      return ['muted', site.label === 'код не установлен' ? 'Код не установлен' : 'Анкета не закончена'];
  }
}

// Когда закончится оплаченный срок или пробный период — чтобы подсветить
// «Продлить на 1 год», если до конца меньше месяца.
function endsAt(site) {
  if (site.paidAt) {
    const d = new Date(site.paidAt);
    d.setFullYear(d.getFullYear() + (site.paidYears || 1));
    return d.getTime();
  }
  return null;
}

function RowMenu({ site, hasHistory, onPick }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  const end = endsAt(site);
  const urgent = ['trial', 'expired', 'pending'].includes(site.kind) || (end && end - Date.now() < SOON);
  const items =
    site.kind === 'not-ready'
      ? [[site.label === 'код не установлен' ? 'Поставить код' : 'Продолжить анкету', 'go', true]]
      : [
          ['Продлить на 1 год', 'renew', urgent],
          ['Сменить тариф', 'tariff'],
          ['Посмотреть историю счетов', 'history', false, !hasHistory],
        ];
  return (
    <div className="relative justify-self-end">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Действия · ${site.domain}`}
        className={`flex h-9 w-9 items-center justify-center rounded-full text-ink/60 transition hover:bg-warm hover:text-ink ${open ? 'bg-warm text-ink' : ''} ${RING}`}
      >
        <MoreHorizontalIcon size={18} />
      </button>
      {/* Прозрачный ловец: клик мимо меню только закрывает его. */}
      {open && <div className="fixed inset-0 z-30" aria-hidden="true" onClick={() => setOpen(false)} />}
      {open && (
        <div
          role="menu"
          aria-label={`Действия · ${site.domain}`}
          className="absolute right-0 top-[calc(100%+4px)] z-40 w-64 rounded-xl border border-line bg-white p-1.5 shadow-[0_18px_40px_-18px_rgba(17,17,16,0.35)]"
        >
          {items.map(([label, id, hl, disabled]) => (
            <button
              key={id}
              type="button"
              role="menuitem"
              disabled={disabled}
              onClick={() => {
                setOpen(false);
                onPick(id);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] font-semibold transition hover:bg-warm disabled:cursor-default disabled:text-ink/35 disabled:hover:bg-transparent ${
                hl ? 'text-brand' : 'text-ink/80'
              } ${RING}`}
            >
              {label}
              {disabled && <span className="ml-auto text-[12px] font-normal">пока нет</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SiteTableRow({ site, open, hasHistory, short, onPick, onAuto, children }) {
  const [tone, text] = badgeOf(site);
  const live = site.kind !== 'not-ready';
  const debit = !site.cancelled ? nextDebit(site) : null;
  const tariff = site.kind === 'trial' ? 'Пробный период' : live ? site.tariff : '—';
  const badge = <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[12px] font-bold ${BADGE[tone]}`}>{text}</span>;
  // Автопродление включено, а денег на списание нет — жёлтым, с суммой:
  // серое «спишем» при пустом балансе читалось как «всё в порядке». Дата
  // уже стоит в плашке статуса — здесь только сколько не хватит.
  const debitLine =
    debit &&
    (short ? (
      <p className="mt-1 text-[12px] font-semibold text-warn-ink">Не хватает {formatRub(short)} на год</p>
    ) : (
      <p className="mt-1 text-[12px] text-ink/60">
        {debit} спишем {PRICE_TEXT}
      </p>
    ));
  const nextTariff = site.nextTariff && site.period && <p className="mt-0.5 text-[12px] text-ink/60">с {site.period.renew} — {site.nextTariff}</p>;
  const sw = live && <Switch checked={!site.cancelled} onChange={onAuto} label={`Автопродление ${site.domain}`} />;
  const menu = <RowMenu site={site} hasHistory={hasHistory} onPick={onPick} />;
  return (
    <div id={`site-${site.key}`} className="scroll-mt-6 border-b border-line last:border-0">
      {/* Широкий экран — колонки таблицы. */}
      <div className={`hidden gap-4 px-6 py-4 sm:grid sm:items-center ${SITE_COLS}`}>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold">{site.domain}</p>
          {site.company && <p className="mt-0.5 truncate text-[12px] text-ink/60">{site.company}</p>}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-ink/80">{tariff}</p>
          {nextTariff}
        </div>
        <div className="min-w-0">
          {badge}
          {debitLine}
        </div>
        <div>{sw}</div>
        {menu}
      </div>
      {/* Телефон — та же строка карточкой: колонок нет, подписи на месте. */}
      <div className="px-5 py-4 sm:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold">{site.domain}</p>
            {site.company && <p className="mt-0.5 truncate text-[12px] text-ink/60">{site.company}</p>}
          </div>
          {menu}
        </div>
        <div className="mt-3">
          {badge}
          {debitLine}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-[13px]">
          <span className="font-semibold text-ink/75">{tariff}</span>
          {live && (
            <label className="flex items-center gap-2 font-semibold text-ink/65">
              Автопродление {sw}
            </label>
          )}
        </div>
      </div>
      {open && children && <div className="border-t border-line bg-warm/50 px-5 py-4 sm:px-6">{children}</div>}
    </div>
  );
}

export default function BillingClient() {
  const router = useRouter();
  const [a, setA] = useState(null);
  const [user, setUser] = useState(CURRENT_USER);
  const [now, setNow] = useState(Date.now());

  // Раскрытая панель в строке сайта: { key, panel: 'tariff' | 'renew' }.
  const [open, setOpen] = useState(null);
  const [tariffPick, setTariffPick] = useState(TARIFFS[0]);
  const [off, setOff] = useState(null); // { site, step } — выключение автопродления

  // Пополнение баланса. topupFor — сайт, год которого оплатим сразу после
  // пополнения («Оплатить год», когда на балансе не хватило).
  const [topupOpen, setTopupOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [amountErr, setAmountErr] = useState(null);
  const [topupFor, setTopupFor] = useState(null);

  const [methodOpen, setMethodOpen] = useState(false);
  // Способ пополнения: пока ни разу не пополняли — не выбран (владелец 23.09:
  // «оплата по счёту» стояла сама, хотя клиент её не выбирал).
  const [method, setMethod] = useState(null);
  const [payMethod, setPayMethod] = useState(null);
  const [payErr, setPayErr] = useState(null);
  const [docsEmail, setDocsEmail] = useState('');
  const [docsErr, setDocsErr] = useState(null);
  const [cardNo, setCardNo] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardErr, setCardErr] = useState({});

  const [payerOpen, setPayerOpen] = useState(false);
  const [payerMode, setPayerMode] = useState(null);
  // Отдельный плательщик — в подписке аккаунта, чтобы пережить F5 и не
  // вводиться заново к каждому счёту. null — ещё не заполнен.
  const [otherPayer, setOtherPayer] = useState(null);
  const [payerModal, setPayerModal] = useState(false);

  const [whatOpen, setWhatOpen] = useState(false);
  const [actsEmail, setActsEmail] = useState('');
  const [actsEditing, setActsEditing] = useState(false);
  const [actsErr, setActsErr] = useState(null);
  const [copied, setCopied] = useState(null);
  const [opsAll, setOpsAll] = useState(false);
  // «Посмотреть историю счетов» из меню сайта — история только этого сайта.
  const [historyFor, setHistoryFor] = useState(null);

  useEffect(() => {
    const saved = loadAnketa();
    if (!saved.domain) {
      router.replace('/app/sites');
      return;
    }
    setA(saved);
    setUser(accountUser(CURRENT_USER));
    const b = saved.billing || {};
    if (b.method) {
      setMethod(b.method);
      setPayMethod(b.method);
    }
    if (b.actsEmail) {
      setActsEmail(b.actsEmail);
      setDocsEmail(b.actsEmail);
    }
    if (b.payerOther) {
      setOtherPayer(b.payerOther);
      setPayerMode('Другие реквизиты');
    } else if (b.method === 'По счёту') setPayerMode('Реквизиты компании');
    // «Оплатить год» с «Обзора» и из «Моих сайтов» открывает оплату сайта.
    const want = new URLSearchParams(window.location.search).get('pay');
    if (want) {
      const key = want === 'current' ? currentSiteKey() : want;
      if (accountSites(saved).some((x) => x.key === key)) setOpen({ key, panel: 'renew' });
    }
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [router]);

  if (!a) return null;

  const b = a.billing || {};
  const balance = balanceOf(a);
  const sites = accountSites(a, now).map((s) => ({ ...s, trialTo: s.trialStartedAt ? trialEnds(s) : '' }));
  const main = sites[0];
  const single = sites.length === 1;
  const req = a.contacts || {};
  const account = a.bank?.account || '';
  const renewal = nextRenewal(sites);
  // Нехватка на балансе — только близкая: «не хватает» за год до списания
  // (сразу после оплаты года) было не предупреждением, а придиркой.
  // soonShort — пополнить пора (синяя «Пополнить», как синяя «Оплатить год»
  // в «Обзоре»); warnShort — пора предупредить жёлтым. Называем нехватку один
  // раз — в карточке баланса; строка сайта повторяет её, только когда сайтов
  // несколько и надо показать, какому не хватает.
  const short = debitShortfall(sites, balance);
  const soonShort = sites.filter((s) => short[s.key] && short[s.key].at - now < SOON);
  const warnShort = sites
    .filter((s) => short[s.key] && short[s.key].at - now < warnWithin(s))
    .map((s) => short[s.key])
    .sort((x, y) => x.at - y.at);
  const shortSum = soonShort.reduce((sum, s) => sum + short[s.key].amount, 0);
  const warnSum = warnShort.reduce((sum, x) => sum + x.amount, 0);
  const paidSites = sites.filter((s) => s.period && (s.kind === 'paid' || s.kind === 'off-soon'));
  const ops = b.ops || [];

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
    setOpen({ key: site.key, panel });
  }

  function pickTariff(site) {
    setSiteTariff(site.key, tariffPick, site.kind === 'paid');
    reload();
    setOpen(null);
  }

  function pickMethod(m) {
    setMethod(m);
    setPayMethod(m);
    saveBilling({ method: m });
  }

  function openTopup(sum = PRICE, forKey = null) {
    setAmount(String(sum));
    setAmountErr(null);
    setTopupFor(forKey);
    setTopupOpen(true);
    setOpen(null);
    setTimeout(() => document.getElementById('balance')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function closeTopup() {
    setTopupOpen(false);
    setTopupFor(null);
  }

  // Оплатить год сайта с баланса — сразу; не хватает — пополнение на
  // недостающую сумму, а после него год оплатится сам.
  function payYear(site) {
    if (payYearFromBalance(site.key)) {
      reload();
      setOpen(null);
    } else openTopup(PRICE - balance, site.key);
  }

  function checkAmount() {
    const sum = Number(String(amount).replace(/\D/g, ''));
    const min = topupFor ? PRICE - balance : 100;
    if (!sum || sum < min) {
      setAmountErr(topupFor ? `Нужно не меньше ${formatRub(min)} — столько не хватает на год сайта.` : 'Укажите сумму — от 100 ₽.');
      return null;
    }
    setAmountErr(null);
    return sum;
  }

  // Почта для чека, счёта и акта — спрашиваем при первом пополнении и не
  // подставляем молча почту аккаунта (владелец 23.09): её можно вставить
  // одной кнопкой. Сохраняется для следующих оплат — в «Для бухгалтерии».
  function checkDocsEmail() {
    const v = docsEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setDocsErr(v ? 'Нужна почта вида name@site.ru.' : 'Укажите, куда прислать документы об оплате.');
      return null;
    }
    setDocsErr(null);
    return v;
  }

  // Карта — на аккаунт: привязанной один раз, ею пополняют баланс и дальше.
  function topupByCard() {
    const sum = checkAmount();
    let ok = Boolean(sum);
    if (!b.card) {
      const digits = cardNo.replace(/\D/g, '');
      const [mm] = cardExp.split('/');
      const errs = {};
      if (digits.length !== 16) errs.no = 'Номер карты — 16 цифр.';
      if (!/^\d{2}\/\d{2}$/.test(cardExp) || +mm < 1 || +mm > 12) errs.exp = 'Срок действия — в формате ММ/ГГ.';
      if (!/^\d{3}$/.test(cardCvc)) errs.cvc = 'CVC — 3 цифры на обороте карты.';
      setCardErr(errs);
      if (Object.keys(errs).length) ok = false;
    }
    const email = checkDocsEmail();
    if (!ok || !email) return;
    const patch = { method: 'Картой', actsEmail: email };
    if (!b.card) {
      patch.card = { last4: cardNo.replace(/\D/g, '').slice(-4), exp: cardExp };
      setCardNo('');
      setCardExp('');
      setCardCvc('');
    }
    saveAnketa({ billing: { ...loadAnketa().billing, ...patch } });
    setMethod('Картой');
    setActsEmail(email);
    topUpBalance(sum, 'Картой');
    if (topupFor) payYearFromBalance(topupFor);
    closeTopup();
    reload();
  }

  const currentPayer = payerMode === 'Реквизиты компании' ? null : otherPayer;
  const payerName = payerMode === 'Реквизиты компании' ? operatorName(a) : otherPayer?.name || 'другие реквизиты';

  function topupByInvoice() {
    const sum = checkAmount();
    if (!payerMode) {
      setPayErr('Выберите, на кого выставить счёт.');
      return;
    }
    // Без реквизитов плательщика счёт не выставить — сразу открываем окно.
    if (payerMode === 'Другие реквизиты' && !otherPayer) {
      setPayerModal(true);
      return;
    }
    const email = checkDocsEmail();
    if (!sum || !email) return;
    setPayErr(null);
    saveAnketa({ billing: { ...loadAnketa().billing, method: 'По счёту', actsEmail: email, ...(payerMode === 'Реквизиты компании' ? { payerOther: null } : {}) } });
    setMethod('По счёту');
    setActsEmail(email);
    issueTopupInvoice(sum, currentPayer);
    closeTopup();
    reload();
  }

  function saveActs() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(actsEmail)) {
      setActsErr('Нужна почта вида name@site.ru — на неё придут чеки и акты.');
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
        trial: main.cancelled
          ? `Пробный период — до ${main.trialTo}. Автопродление выключено — после этой даты сайт отключится.`
          : balance >= PRICE
            ? `Пробный период — до ${main.trialTo}. Потом спишем с баланса ${PRICE_TEXT} за год.`
            : `Пробный период — до ${main.trialTo}. Пополните баланс на ${PRICE_TEXT} — тогда год оплатится сам, без перерыва.`,
        expired: 'Пробный период закончился — оплатите год, чтобы включить сайт снова.',
        pending: 'Счёт выставлен — отметим оплату, как только поступят деньги, обычно 1–3 рабочих дня.',
        paid: main.period && `Оплачено до ${main.period.to}.`,
        'off-soon': main.period && `Автопродление выключено — сайт работает до ${main.period.to}.`,
      }[main.kind]
    : `${sites.length} ${plural(sites.length, 'сайт', 'сайта', 'сайтов')} — у каждого свой год; оплата списывается с баланса в дату продления каждого.`;

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
        {...(!whatOpen && { inert: '' })}
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

  // Почта для документов об оплате — пустая, пока её не указали; почту
  // аккаунта можно вставить одной кнопкой, но сами мы её не подставляем.
  function docsEmailField(label) {
    return (
      <div className="mt-5">
        <Field
          label={label}
          required
          type="email"
          autoComplete="off"
          placeholder={`buh@${a.domain}`}
          value={docsEmail}
          onChange={(e) => {
            setDocsEmail(e.target.value);
            setDocsErr(null);
          }}
          error={docsErr}
        />
        {a.personEmail && docsEmail.trim() !== a.personEmail && (
          <button
            type="button"
            onClick={() => {
              setDocsEmail(a.personEmail);
              setDocsErr(null);
            }}
            className={`mt-2 ${LINK}`}
          >
            Вставить мою почту — {a.personEmail}
          </button>
        )}
      </div>
    );
  }

  const sumText = formatRub(Number(String(amount).replace(/\D/g, '')) || 0);

  function cardPart() {
    return (
      <div>
        {b.card ? (
          <p className="text-[13px] leading-5 text-ink/65">
            Спишем с карты <b className="text-ink">···· {b.card.last4}</b>.
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
            <p className="mt-3 text-[12px] text-ink/60">Карта привяжется к аккаунту — ею можно будет пополнять баланс и дальше.</p>
          </>
        )}
        {docsEmailField('Куда прислать чек и акт')}
        <button type="button" onClick={topupByCard} className={`mt-5 ${PRIMARY}`}>
          Пополнить на {sumText}
        </button>
      </div>
    );
  }

  function invoicePart() {
    return (
      <div>
        <p id="payer-h" className="mb-2 text-sm font-bold">
          Счёт на
        </p>
        <Segmented
          options={['Реквизиты компании', 'Другие реквизиты']}
          value={payerMode}
          onChange={(v) => {
            setPayerMode(v);
            setPayErr(null);
            if (v === 'Другие реквизиты' && !otherPayer) setPayerModal(true);
          }}
          ariaLabelledby="payer-h"
        />
        {payerMode && (
          <p className="mt-2 text-[12px] leading-4 text-ink/60">
            {payerMode === 'Реквизиты компании'
              ? `${operatorName(a)} · ${payerNote}`
              : otherPayer
                ? `${otherPayer.name} · ${payerSummary(otherPayer)}`
                : 'Реквизиты другой компании не заполнены'}
            {payerMode === 'Другие реквизиты' && (
              <>
                {' · '}
                <button type="button" onClick={() => setPayerModal(true)} className={LINK}>
                  {otherPayer ? 'Изменить' : 'Заполнить'}
                </button>
              </>
            )}
          </p>
        )}
        {payErr && <p className="mt-2 text-[12px] font-semibold text-danger">{payErr}</p>}
        {docsEmailField('Куда прислать счёт и акт')}
        <button type="button" onClick={topupByInvoice} className={`mt-5 ${PRIMARY}`}>
          Выставить счёт на {sumText}
        </button>
      </div>
    );
  }

  // Пополнение по шагам: сумма → как пополняете → данные → куда прислать
  // документы. Ничего не выбрано заранее (владелец 23.09).
  function topupPanel() {
    const forSite = topupFor && sites.find((s) => s.key === topupFor);
    const chips = [[PRICE, 'год одного сайта'], ...(sites.length > 1 ? [[PRICE * sites.length, `все ${sites.length} ${plural(sites.length, 'сайт', 'сайта', 'сайтов')} на год`]] : [])];
    return (
      <>
        {forSite && (
          <p className="mb-4 rounded-lg bg-brand/[0.06] px-3 py-2.5 text-[13px] leading-5 text-ink/75">
            На балансе {formatRub(balance)} — не хватает {formatRub(PRICE - balance)} на год {forSite.domain}. После пополнения
            картой оплатим его сразу.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-[minmax(0,260px)_1fr] sm:items-end">
          <Field
            label="Сумма, ₽"
            required
            inputMode="numeric"
            placeholder="12 000"
            value={amount ? Number(amount).toLocaleString('ru-RU') : ''}
            onChange={(e) => {
              setAmount(e.target.value.replace(/\D/g, '').slice(0, 8));
              setAmountErr(null);
            }}
            error={amountErr}
          />
          <div className="flex flex-wrap gap-2 sm:pb-2.5">
            {chips.map(([sum, note]) => (
              <button
                key={sum}
                type="button"
                onClick={() => {
                  setAmount(String(sum));
                  setAmountErr(null);
                }}
                className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${RING} ${
                  Number(amount) === sum ? 'border-brand bg-brand/[0.06] text-brand' : 'border-line bg-white text-ink/70 hover:border-line-2'
                }`}
              >
                {formatRub(sum)} — {note}
              </button>
            ))}
          </div>
        </div>
        <p id="how-h" className="mb-2 mt-6 text-sm font-bold">
          Как пополняете?
        </p>
        <Segmented options={['Картой', 'По счёту']} value={payMethod} onChange={setPayMethod} ariaLabelledby="how-h" />
        {payMethod && <div className="mt-5 border-t border-line pt-5">{payMethod === 'Картой' ? cardPart() : invoicePart()}</div>}
        <button type="button" onClick={closeTopup} className={`mt-4 ${BTN_TEXT}`}>
          Отмена
        </button>
      </>
    );
  }

  // Счёт на пополнение: пока деньги не пришли, он виден у баланса.
  function invoiceView(inv) {
    const url = `https://cdn.sleza.media/${SITE_ID}/invoice-${inv.no}.pdf`;
    const changed = JSON.stringify(inv.payer || null) !== JSON.stringify(currentPayer);
    const overdue = now - inv.at > 3 * 24 * 3600 * 1000;
    return (
      <div className="mt-5 rounded-xl border border-line bg-warm/60 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold">
              Счёт № {inv.no} на {formatRub(inv.amount || PRICE)} — ждём оплату
            </p>
            <p className="mt-0.5 text-[12px] leading-4 text-ink/60">
              на {inv.payer?.name || operatorName(a)} · пополним баланс, как только поступят деньги, обычно 1–3 рабочих дня
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
        {changed && payerMode && (
          <button
            type="button"
            onClick={() => {
              issueTopupInvoice(inv.amount || PRICE, currentPayer);
              reload();
            }}
            className={`mt-4 ${BTN_OUTLINE}`}
          >
            Сформировать заново — на {payerName}
          </button>
        )}
      </div>
    );
  }

  // Оплатить год / продлить ещё на год — с баланса, в строке сайта.
  function renewPanel(site) {
    const enough = balance >= PRICE;
    // Тем же глаголом, что нажали: «Оплатить год» с «Обзора» раньше
    // открывало панель без заголовка с одной «Пополнить» внутри.
    const title = (
      <p className="mb-1.5 text-[15px] font-bold">
        {site.kind === 'paid' || site.kind === 'off-soon' ? `Продлить ${site.domain} на год` : `Оплатить год ${site.domain}`} — {PRICE_TEXT}
      </p>
    );
    const what =
      site.kind === 'trial'
        ? `Год ${site.domain} начнётся после пробного периода — пробные дни не сгорают.`
        : site.kind === 'paid' || site.kind === 'off-soon'
          ? `Срок продлится до ${paidPeriod(site.paidAt, (site.paidYears || 1) + 1).to}.`
          : `${site.domain} включится сегодня — на год.`;
    return enough ? (
      <>
        {title}
        <p className="text-[13px] leading-5 text-ink/70">
          Спишем {PRICE_TEXT} с баланса ({formatRub(balance)}). {what}
        </p>
        <button type="button" onClick={() => payYear(site)} className={`mt-4 ${PRIMARY}`}>
          Списать {PRICE_TEXT}
        </button>
      </>
    ) : (
      <>
        {title}
        <p className="text-[13px] leading-5 text-ink/70">
          На балансе {formatRub(balance)} — не хватает {formatRub(PRICE - balance)} на год. {what}
        </p>
        <button type="button" onClick={() => openTopup(PRICE - balance, site.key)} className={`mt-4 ${PRIMARY}`}>
          Пополнить на {formatRub(PRICE - balance)}
        </button>
      </>
    );
  }

  // Один сайт с незаконченной анкетой — платить не за что, путь туда, где
  // появятся документы.
  const notReady = single && main.kind === 'not-ready';
  const untilOf = (site) => site.period?.to || site.trialTo || '';

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
              {/* Баланс — первым: из него оплачивается год каждого сайта. */}
              <section id="balance" className="mt-6 scroll-mt-6 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-semibold text-ink/60">Баланс</p>
                    <p className="mt-1 text-[28px] font-bold leading-none tracking-[-0.03em]">{formatRub(balance)}</p>
                    <p className="mt-2 text-[13px] leading-5 text-ink/60">
                      {renewal
                        ? `Ближайшее списание — ${renewal.date} · ${renewal.site.domain} · ${PRICE_TEXT}`
                        : 'С баланса оплачивается год каждого сайта — в его дату продления.'}
                    </p>
                    {warnSum > 0 && (
                      <p className="mt-3 w-fit rounded-lg bg-warn/10 px-3 py-2 text-[13px] font-semibold leading-5 text-warn-ink">
                        Не хватает {formatRub(warnSum)} — пополните до {formatDate(warnShort[0].at)}
                      </p>
                    )}
                  </div>
                  {/* Главная — только когда пополнить действительно нужно и
                      ниже не открыта оплата сайта со своей синей кнопкой. */}
                  {!topupOpen && (
                    <button type="button" onClick={() => openTopup(shortSum || PRICE)} className={shortSum > 0 && open?.panel !== 'renew' ? PRIMARY_SM : SECONDARY_SM}>
                      Пополнить
                    </button>
                  )}
                </div>
                {b.topupInvoice && invoiceView(b.topupInvoice)}
                {topupOpen && <div className="mt-6 border-t border-line pt-6">{topupPanel()}</div>}
              </section>

              {/* Сайты — таблицей, как «Актуальные документы» в «Документах». */}
              <section className="mt-9">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <h2 className="text-lg font-bold tracking-[-0.02em]">Сайты в подписке</h2>
                  <span className="shrink-0 text-xs font-semibold text-ink/60">
                    {sites.length} {plural(sites.length, 'сайт', 'сайта', 'сайтов')}
                  </span>
                </div>
                <div className="rounded-2xl border border-line bg-white shadow-sm">
                  <div
                    aria-hidden="true"
                    className={`hidden gap-4 rounded-t-2xl border-b border-line bg-warm/70 px-6 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/60 sm:grid ${SITE_COLS}`}
                  >
                    <span>Сайт</span>
                    <span>Тариф</span>
                    <span>Статус и оплата</span>
                    <span>Автопродление</span>
                    <span />
                  </div>
                  {sites.map((site) => (
                    <SiteTableRow
                      key={site.key}
                      site={site}
                      short={!single && short[site.key] && short[site.key].at - now < warnWithin(site) ? short[site.key].amount : null}
                      open={open?.key === site.key ? open.panel : null}
                      hasHistory={ops.some((op) => op.kind === 'debit' && op.site === site.domain)}
                      onPick={(id) => {
                        if (id === 'go') {
                          // Анкета этого сайта, а не открытого: у каждого сайта свой шаг.
                          openSite(site.key);
                          router.push(STEP_URLS[Math.min(site.stepsDone || 0, 5)]);
                        } else if (id === 'history') {
                          setHistoryFor(site.domain);
                          setTimeout(() => document.getElementById('history')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                        } else toggle(site, id);
                      }}
                      onAuto={(on) => {
                        if (on) {
                          setSiteCancelled(site.key, false);
                          reload();
                        } else setOff({ site, step: 1 });
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
                      renewPanel(site)
                    )}
                    </SiteTableRow>
                  ))}
                </div>
              </section>

              {/* Общее на аккаунт: как пополняем и кто плательщик. Появляется
                  после первого пополнения — до него способа и плательщика нет,
                  их выбирают при пополнении (владелец 23.09). */}
              {b.method && (
                <Panel title="Пополнение">
                  <Row
                    label="Способ"
                    value={method === 'Картой' ? (b.card ? `Карта ···· ${b.card.last4}` : 'Картой') : 'По счёту'}
                    note={method === 'Картой' ? (b.card ? `до ${b.card.exp}` : 'карту привяжете при пополнении') : 'счёт на почту, оплата переводом'}
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
                          setPayMethod('По счёту');
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
                      value={payerMode === 'Реквизиты компании' ? operatorName(a) : otherPayer?.name || 'Реквизиты не заполнены'}
                      note={
                        payerMode === 'Реквизиты компании'
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
                        <Segmented options={['Реквизиты компании', 'Другие реквизиты']} value={payerMode} onChange={setPayerMode} />
                        <p className="text-[13px] leading-5 text-ink/60">
                          {payerMode === 'Реквизиты компании'
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
                </Panel>
              )}

              {/* Для бухгалтерии: куда слать чеки и акты, история операций и
                  акты за оплаченные годы. Появляется после первого пополнения. */}
              {(b.actsEmail || ops.length > 0) && (
                <Panel title="Для бухгалтерии">
                  <Row
                    label="Чеки, счета, акты"
                    value={b.actsEmail || 'почта не указана'}
                    note="сюда приходят документы об оплате"
                    action="Изменить"
                    open={actsEditing}
                    onAction={() => setActsEditing(!actsEditing)}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <div className="flex-1">
                        <Field
                          label="Почта для документов"
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
                  </Row>
                  {/* История и акты — однострочными списками: у агента операций
                      и актов десятки, строка «подпись — значение — пояснение»
                      на каждую растягивала блок (владелец 23.09). */}
                  {ops.length > 0 && (
                    <div id="history" className="scroll-mt-6 border-t border-line py-4">
                      <p className="mb-1 flex flex-wrap items-baseline gap-x-3 text-[13px] text-ink/60">
                        История{historyFor ? ` · ${historyFor}` : ''}
                        {historyFor && (
                          <button type="button" onClick={() => setHistoryFor(null)} className={LINK}>
                            Показать всю
                          </button>
                        )}
                      </p>
                      <ul className="divide-y divide-line">
                        {(historyFor
                          ? [...ops].reverse().filter((op) => op.site === historyFor)
                          : opsAll
                            ? [...ops].reverse()
                            : [...ops].reverse().slice(0, 4)
                        ).map((op) => (
                          <li key={`${op.at}-${op.kind}-${op.site || ''}`} className="flex items-baseline gap-3 py-2 text-[13px]">
                            <span className="w-20 shrink-0 text-ink/60">{formatDate(op.at)}</span>
                            <span className="min-w-0 flex-1 break-words text-ink/80">
                              {op.kind === 'topup' ? `Пополнение ${op.method === 'Картой' ? 'картой' : 'по счёту'}` : `Оплата года · ${op.site}`}
                            </span>
                            <span className={`shrink-0 font-semibold ${op.kind === 'topup' ? 'text-ok' : 'text-ink'}`}>
                              {op.kind === 'topup' ? '+' : '−'}
                              {formatRub(op.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {!historyFor && ops.length > 4 && (
                        <button type="button" onClick={() => setOpsAll(!opsAll)} className={`mt-1 ${LINK}`}>
                          {opsAll ? 'Свернуть' : `Вся история — ${ops.length}`}
                        </button>
                      )}
                    </div>
                  )}
                  {paidSites.length > 0 && (
                    <div className="border-t border-line pt-4">
                      <p className="mb-1 text-[13px] text-ink/60">Акты</p>
                      <ul className="divide-y divide-line">
                        {paidSites.map((s) => (
                          <li key={s.key} className="flex items-center gap-3 py-1.5 text-[13px]">
                            <span className="min-w-0 flex-1 truncate text-ink/80">
                              {s.domain} · {s.period.from} – {s.period.to}
                            </span>
                            <IconAction label={`Открыть акт ${s.domain}`} icon={ExternalIcon} href={`https://cdn.sleza.media/${SITE_ID}/act-${s.key}-${s.period.years}.pdf`} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Panel>
              )}

              <div className="mt-6">{fold}</div>
            </>
          )}
        </div>
      </section>

      {off && (
        <SiteOffModal
          site={off.site}
          step={off.step}
          paidUntil={untilOf(off.site)}
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
