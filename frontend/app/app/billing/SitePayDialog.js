'use client';

// Оплата года сайта — одно окно на все входы (владелец 28.09, «ступень 1»
// упрощения оплаты): «Оплатить» / «Продлить» на «Обзоре», в карточке «Моих
// сайтов» и в строке таблицы открывают его там, где нажали. Было: «Обзор»
// уводил в «Мои сайты → Таблица», там — выбор тарифа из трёх одинаковых,
// «Выбрать и продолжить», «Как оплачиваете?», и только потом форма.
//
// Что в окне:
// - на балансе хватает — «Списать 12 000 ₽» (баланс здесь назван: деньги на
//   нём клиент положил сам);
// - не хватает — «Картой» / «По счёту» на недостающую сумму. Про баланс ни
//   слова, пока он пуст: владелец одного сайта его не пополнял;
// - одна галочка «Продлевать автоматически» у карты вместо двух «авто»
//   (переключатель «Автопродление» в строке + галочка «Автопополнение»):
//   отмечена — включено и то и другое;
// - что будет через год — до оплаты (разбор 24.09);
// - итог — в том же окне: «Оплачено до …» или выставленный счёт.
// Модель денег прежняя: оплата картой пополняет баланс на недостающее и сразу
// оплачивает год сайта, счёт — пополнение на недостающее.

import { useEffect, useRef, useState } from 'react';
import { CheckIcon, CloseIcon, CopyIcon, ExternalIcon } from '../../../components/app/AppIcons';
import { IconAction } from '../../../components/app/DocRows';
import { Field, Segmented } from '../start/_shared/AnketaChrome';
import { loadAnketa, saveAnketa } from '../start/_shared/anketaState';
import { SITE_ID, operatorName } from '../../../lib/docPackage';
import { RING, useDialog } from '../site/_shared/SiteChrome';
import { announce } from '../../../lib/announce';
import InvoicePayerModal, { payerSummary } from './InvoicePayerModal';
import { LINK } from './BillingBits';
import { accountSites, balanceOf, formatRub, issueTopupInvoice, payYearFromBalance, setSiteCancelled, topUpBalance } from '../site/_shared/sites';
import { PRICE, TARIFF_CHOICE, paidPeriod } from '../site/_shared/subscription';

const PRICE_TEXT = formatRub(PRICE);
const PRIMARY = `inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-sm transition hover:bg-brand-hover ${RING}`;
const BTN_TEXT = `rounded-xl px-3 py-2.5 text-sm font-semibold text-ink/60 hover:text-ink ${RING}`;
const COMPANY = 'Реквизиты компании';
const OTHER = 'Другие реквизиты';

// fallback — куда вернуть фокус, если кнопка, открывшая окно, после оплаты
// исчезла или сменилась («Оплатить» → «Продлить»).
export default function SitePayDialog({ siteKey, onClose, fallback }) {
  const [a, setA] = useState(() => loadAnketa());
  const b = a.billing || {};
  const [done, setDone] = useState(null); // null | 'paid' | 'invoice'
  const dialog = useRef(null);
  const result = useRef(null);
  useDialog(dialog, onClose, done, fallback);

  // Способ — тот, которым уже платили; в первый раз не выбран (владелец 23.09).
  const [method, setMethod] = useState(b.method || null);
  const [cardNo, setCardNo] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardErr, setCardErr] = useState({});
  // Согласие на автосписания — отдельной галочкой, по умолчанию снято (24.09).
  const [cardAuto, setCardAuto] = useState(false);
  const [docsEmail, setDocsEmail] = useState(b.actsEmail || '');
  const [docsErr, setDocsErr] = useState(null);
  const [payerMode, setPayerMode] = useState(b.payerOther ? OTHER : b.method === 'По счёту' ? COMPANY : null);
  const [otherPayer, setOtherPayer] = useState(b.payerOther || null);
  const [payerModal, setPayerModal] = useState(false);
  const [payErr, setPayErr] = useState(null);
  const [copied, setCopied] = useState(false);

  // Итог оплаты читается через фокус (как было в строке таблицы): второе
  // прочтение той же фразы live-областью не нужно.
  useEffect(() => {
    if (done) setTimeout(() => result.current?.focus(), 30);
  }, [done]);

  const sites = accountSites(a);
  const site = sites.find((x) => x.key === siteKey);
  if (!site) return null;
  const balance = balanceOf(a);
  const card = b.card || null;
  const need = Math.max(PRICE - balance, 0);
  const enough = need === 0;
  const invoice = b.topupInvoice || null;
  const renew = site.kind === 'paid' || site.kind === 'off-soon';

  const what =
    site.kind === 'trial'
      ? `Год начнётся после пробного периода, так что пробные дни не сгорают.`
      : renew
        ? `Срок продлится до ${paidPeriod(site.paidAt, (site.paidYears || 1) + 1).to}.`
        : site.grace
          ? 'Год начнётся сегодня.'
          : 'Сайт включится сегодня на год.';

  // Что будет через год — до оплаты. Галочку отметили — сразу другая строка.
  const autoNow = (card?.auto && !site.cancelled) || (method === 'Картой' && cardAuto);
  const next = site.leaving
    ? null
    : site.cancelled && !(method === 'Картой' && cardAuto)
      ? 'Автопродление выключено: следующий год оплатите сами, заранее напомним.'
      : autoNow
        ? `Через год спишем ${PRICE_TEXT} с ${card ? `карты\u00a0····\u00a0${card.last4}` : 'этой карты'}.`
        : balance > 0 || sites.length > 1
          ? `Через год продлим сами, если на балансе будет ${PRICE_TEXT}, и заранее напомним.`
          : 'Через год заранее напомним о продлении.';

  function reload() {
    setA(loadAnketa());
  }

  function focusError() {
    setTimeout(() => {
      const el = dialog.current?.querySelector('[aria-invalid="true"], [role="alert"]');
      if (!el) return;
      el.scrollIntoView({ block: 'center' });
      if (el.matches('input, textarea, select')) el.focus();
    }, 30);
  }

  function checkEmail() {
    const v = docsEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setDocsErr(v ? 'Нужен e-mail вида name@site.ru.' : 'Укажите, куда прислать документы об оплате.');
      return null;
    }
    setDocsErr(null);
    return v;
  }

  function cardErrors() {
    const digits = cardNo.replace(/\D/g, '');
    const [mm] = cardExp.split('/');
    const errs = {};
    if (digits.length !== 16) errs.no = 'Номер карты — 16 цифр.';
    if (!/^\d{2}\/\d{2}$/.test(cardExp) || +mm < 1 || +mm > 12) errs.exp = 'Укажите срок действия в формате ММ/ГГ.';
    if (!/^\d{3}$/.test(cardCvc)) errs.cvc = 'CVC — 3 цифры на обороте карты.';
    return errs;
  }

  function payFromBalance() {
    if (!payYearFromBalance(site.key)) return;
    reload();
    setDone('paid');
  }

  // Картой: пополняем баланс на недостающее и сразу оплачиваем год сайта.
  function payByCard() {
    const errs = card ? {} : cardErrors();
    setCardErr(errs);
    const email = checkEmail();
    if (Object.keys(errs).length || !email) {
      focusError();
      return;
    }
    const patch = { method: 'Картой', actsEmail: email };
    if (!card) patch.card = { last4: cardNo.replace(/\D/g, '').slice(-4), exp: cardExp, auto: cardAuto };
    else if (cardAuto) patch.card = { ...card, auto: true };
    saveAnketa({ billing: { ...loadAnketa().billing, ...patch } });
    if (cardAuto) setSiteCancelled(site.key, false);
    topUpBalance(need, 'Картой');
    payYearFromBalance(site.key);
    reload();
    setDone('paid');
  }

  function payByInvoice() {
    if (!payerMode) {
      setPayErr('Выберите, на кого выставить счёт.');
      focusError();
      return;
    }
    if (payerMode === OTHER && !otherPayer) {
      setPayerModal(true);
      return;
    }
    const email = checkEmail();
    if (!email) {
      focusError();
      return;
    }
    setPayErr(null);
    const payer = payerMode === COMPANY ? null : otherPayer;
    saveAnketa({ billing: { ...loadAnketa().billing, method: 'По счёту', actsEmail: email, payerOther: payer } });
    issueTopupInvoice(need, payer);
    announce(`Счёт № ${loadAnketa().billing?.topupInvoice?.no || ''} на ${formatRub(need)} выставлен. Пришлём его на ${email}.`);
    reload();
    setDone('invoice');
  }

  function copyInvoice(url) {
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Почта для чека, счёта и акта: пустая, пока её не указали; почту аккаунта
  // можно вставить одной кнопкой, сами не подставляем (владелец 23.09).
  const emailField = (label) => (
    <div className="mt-5">
      <Field
        label={label}
        required
        type="email"
        autoComplete="off"
        placeholder={`buh@${site.domain}`}
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
          Вставить мой e-mail {a.personEmail}
        </button>
      )}
    </div>
  );

  // Одна галочка — и автопродление этого сайта, и списание с карты.
  const autoBox = !(card?.auto && !site.cancelled) && !site.leaving && (
    <label className="mt-4 flex items-start gap-3 text-[13px] leading-5 text-ink/70">
      <input type="checkbox" checked={cardAuto} onChange={(e) => setCardAuto(e.target.checked)} className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-brand" />
      <span>
        <b className="font-semibold text-ink">Автопродление с карты:</b> через год спишем {PRICE_TEXT} с{' '}
        {card ? `карты\u00a0····\u00a0${card.last4}` : 'этой карты'}. Выключить можно в любой момент переключателем «Автопродление» в «Моих сайтах», вид «Таблица».
      </span>
    </label>
  );

  const cardPart = (
    <div>
      {card ? (
        <p className="text-[13px] leading-5 text-ink/65">
          Спишем с карты <b className="text-ink">···· {card.last4}</b>.
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
              onChange={(e) => {
                setCardNo(e.target.value.replace(/[^\d ]/g, '').slice(0, 19));
                setCardErr((x) => ({ ...x, no: null }));
              }}
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
                setCardErr((x) => ({ ...x, exp: null }));
              }}
              error={cardErr.exp}
            />
            <Field
              label="CVC"
              required
              inputMode="numeric"
              placeholder="000"
              value={cardCvc}
              onChange={(e) => {
                setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 3));
                setCardErr((x) => ({ ...x, cvc: null }));
              }}
              error={cardErr.cvc}
            />
          </div>
          <p className="mt-3 text-[12px] text-ink/60">Карту запомним: в следующий раз вводить не придётся.</p>
        </>
      )}
      {autoBox}
      {emailField('Куда прислать чек и акт')}
      <button type="button" onClick={payByCard} className={`mt-5 ${PRIMARY}`}>
        Оплатить {formatRub(need)}
      </button>
    </div>
  );

  const payerNote = [a.inn && `ИНН ${a.inn}`, a.contacts?.companyMail].filter(Boolean).join(' · ');
  const invoicePart = (
    <div>
      <p id="pay-payer-h" className="mb-2 text-sm font-bold">
        Счёт на
      </p>
      <Segmented
        options={[COMPANY, OTHER]}
        value={payerMode}
        onChange={(v) => {
          setPayerMode(v);
          setPayErr(null);
          if (v === OTHER && !otherPayer) setPayerModal(true);
        }}
        ariaLabelledby="pay-payer-h"
      />
      {payerMode && (
        <p className="mt-2 text-[12px] leading-4 text-ink/60">
          {payerMode === COMPANY
            ? `${operatorName(a)}${payerNote ? ` · ${payerNote}` : ''}`
            : otherPayer
              ? `${otherPayer.name} · ${payerSummary(otherPayer)}`
              : 'Реквизиты другой компании не заполнены'}
          {payerMode === OTHER && (
            <>
              {' · '}
              <button type="button" onClick={() => setPayerModal(true)} className={LINK}>
                {otherPayer ? 'Изменить' : 'Заполнить'}
              </button>
            </>
          )}
        </p>
      )}
      {payErr && <p role="alert" className="mt-2 text-[12px] font-semibold text-danger">{payErr}</p>}
      {emailField('Куда прислать счёт и акт')}
      <button type="button" onClick={payByInvoice} className={`mt-5 ${PRIMARY}`}>
        Выставить счёт на {formatRub(need)}
      </button>
    </div>
  );

  function invoiceView(inv) {
    const url = `https://cdn.sleza.media/${SITE_ID}/invoice-${inv.no}.pdf`;
    const overdue = Date.now() - inv.at > 3 * 24 * 3600 * 1000;
    return (
      <div ref={result} tabIndex={-1} className={`rounded-xl border border-line bg-warm/60 p-4 outline-none sm:p-5 ${RING}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold">
              Ждём оплату счёта № {inv.no} на {formatRub(inv.amount || PRICE)}
            </p>
            <p className="mt-0.5 text-[12px] leading-4 text-ink/60">
              на {inv.payer?.name || operatorName(a)} · засчитаем оплату, как только поступят деньги
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <IconAction label="Открыть счёт" icon={ExternalIcon} href={url} />
            <IconAction label="Скопировать ссылку" done={copied ? 'Скопировано' : null} icon={copied ? CheckIcon : CopyIcon} onClick={() => copyInvoice(url)} />
          </div>
        </div>
        {overdue && (
          <p className="mt-3 rounded-lg bg-warn/10 p-3 text-[12px] leading-4 text-ink/70">
            Счёт выставлен больше 3 дней назад и не оплачен. Если перевод завис в банке, напишите в поддержку.
          </p>
        )}
      </div>
    );
  }

  const title = `${renew ? `Продлить ${site.domain} на год` : `Оплатить год ${site.domain}`}`;
  const fresh = accountSites(a).find((x) => x.key === site.key);
  let body;
  if (done === 'paid') {
    body = (
      <>
        <div ref={result} tabIndex={-1} className={`flex items-start gap-2.5 rounded-lg text-[14px] leading-5 outline-none ${RING}`}>
          <CheckIcon size={18} className="mt-px shrink-0 text-ok-ink" />
          <p>
            <b className="font-bold">Оплачено до {fresh?.period?.to}.</b>{' '}
            <span className="text-ink/70">
              Чек и акт придут на {loadAnketa().billing?.actsEmail || 'e-mail для документов'}, акт также будет в «Балансе и платежах» → «Акты и чеки».
            </span>
          </p>
        </div>
        <button type="button" onClick={onClose} className={`mt-5 ${PRIMARY}`}>
          Готово
        </button>
      </>
    );
  } else if (invoice) {
    // Счёт уже выставлен (сейчас или раньше): второй не предлагаем.
    body = (
      <>
        {invoiceView(invoice)}
        <button type="button" onClick={onClose} className={`mt-5 ${PRIMARY}`}>
          Готово
        </button>
      </>
    );
  } else if (enough) {
    body = (
      <>
        <p className="text-[13px] leading-5 text-ink/70">
          Спишем {PRICE_TEXT} с баланса ({formatRub(balance)}).
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button type="button" onClick={payFromBalance} className={PRIMARY}>
            Списать {PRICE_TEXT}
          </button>
          <button type="button" onClick={onClose} className={BTN_TEXT}>
            Отмена
          </button>
        </div>
      </>
    );
  } else {
    body = (
      <>
        {/* Про баланс — только когда на нём что-то есть: пустой баланс
            владельцу одного сайта ничего не говорит. */}
        {balance > 0 && (
          <p className="mb-4 rounded-lg bg-brand/[0.06] px-3 py-2.5 text-[13px] leading-5 text-ink/75">
            Спишем с баланса {formatRub(balance)}, доплатить нужно {formatRub(need)}.
          </p>
        )}
        <p id="pay-how-h" className="mb-2 text-sm font-bold">
          Как оплачиваете?
        </p>
        <Segmented options={['Картой', 'По счёту']} value={method} onChange={setMethod} ariaLabelledby="pay-how-h" />
        {method && <div className="mt-5 border-t border-line pt-5">{method === 'Картой' ? cardPart : invoicePart}</div>}
        <button type="button" onClick={onClose} className={`mt-4 ${BTN_TEXT}`}>
          Отмена
        </button>
      </>
    );
  }

  return (
    <>
      <div
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pay-title"
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 p-4 outline-none"
      >
        <div className="my-10 w-full max-w-[520px] rounded-2xl border border-line bg-white p-6 shadow-sm sm:my-16 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <h2 id="pay-title" className="text-lg font-bold tracking-[-0.03em]">
              {done === 'paid' ? 'Оплата прошла' : done === 'invoice' ? 'Счёт выставлен' : title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className={`-m-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink/60 transition hover:bg-warm hover:text-ink ${RING}`}
            >
              <CloseIcon size={18} />
            </button>
          </div>
          {!done && !invoice && (
            <div className="mb-5 mt-1.5 text-[13px] leading-5 text-ink/65">
              <p>
                <b className="font-bold text-ink">{PRICE_TEXT}</b>
                {TARIFF_CHOICE && site.tariff ? ` · ${site.tariff}` : ''}. {what}
              </p>
              {next && <p className="mt-1">{next}</p>}
            </div>
          )}
          {(done || invoice) && <div className="mt-4" />}
          {body}
        </div>
      </div>
      {/* Реквизиты другого плательщика — своё окно поверх, рядом, а не внутри:
          иначе клавиши попадали бы в оба окна сразу. */}
      {payerModal && (
        <InvoicePayerModal
          initial={otherPayer}
          onClose={() => setPayerModal(false)}
          onSave={(p) => {
            setOtherPayer(p);
            setPayerMode(OTHER);
            saveAnketa({ billing: { ...loadAnketa().billing, payerOther: p } });
            setPayerModal(false);
          }}
        />
      )}
    </>
  );
}
