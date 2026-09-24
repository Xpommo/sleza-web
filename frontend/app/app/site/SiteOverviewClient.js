'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon } from '../../../components/app/AppIcons';
import { CURRENT_USER } from '../../../lib/appMock';
import { DOCUMENTS, editEvents } from '../../../lib/docPackage';
import { accountSites, balanceOf, currentSiteKey, setSiteCancelled, siteAnketa } from './_shared/sites';
import { accountUser, loadAnketa } from '../start/_shared/anketaState';
import { RING, SiteSidebar } from './_shared/SiteChrome';
import { PRICE, TRIAL_DAYS, TRIAL_MS, formatDate, paidPeriod, subState, trialEndAt, trialEnds } from './_shared/subscription';

// «Обзор» отвечает на три вопроса, с которыми сюда заходят (владелец 24.09):
// сколько ещё будет работать подписка, все ли документы актуальны и когда
// обновлены, какие были последние изменения. Без поясняющих фраз («что сейчас
// с сайтом и что делать дальше» — текст из макета, а не ответ) и без плашки:
// её состояние и единственное действие — в карточке «Подписка».

const STEP_URLS = ['profile', 'site', 'clients', 'requisites', 'documents', 'code'].map((s) => `/app/start/${s}`);
const BTN = `inline-flex h-11 w-fit items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1a1acc] ${RING}`;
const DAY = 24 * 3600 * 1000;
const TONE = { warn: 'text-warn-ink', danger: 'text-danger', ok: 'text-ok', muted: 'text-ink/60', none: 'text-ink' };

function plural(n, one, few, many) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

function sameDay(ms) {
  return new Date(ms).toDateString() === new Date().toDateString() ? 'Сегодня' : formatDate(ms);
}

// Одна схема на обе карточки: подпись, ответ крупно, факты одной строкой,
// действие — только когда оно нужно, ссылка прижата к низу (в ряду карточки
// одной высоты, и ссылки стоят на одной линии).
function Answer({ label, value, tone = 'none', facts, action, link }) {
  return (
    <article className="flex flex-col rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7">
      <h2 className="text-[13px] font-semibold text-ink/60">{label}</h2>
      <p className={`mt-2 text-[28px] font-bold leading-tight tracking-[-0.03em] ${TONE[tone]}`}>{value}</p>
      <p className="mt-2 text-sm leading-5 text-ink/60">{facts.filter(Boolean).join(' · ')}</p>
      {action && <div className="mt-5">{action}</div>}
      <div className="mt-auto pt-5">
        <div className="border-t border-line pt-5">
          <Link href={link[1]} className={`rounded text-sm font-semibold text-brand hover:underline ${RING}`}>
            {link[0]} →
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function SiteOverviewClient() {
  const router = useRouter();
  const [a, setA] = useState(null);
  const [user, setUser] = useState(CURRENT_USER);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const saved = siteAnketa(loadAnketa());
    if (!saved.domain) {
      router.replace('/app/sites');
      return;
    }
    setA(saved);
    setUser(accountUser(CURRENT_USER));
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [router]);

  if (!a) return null;

  const b = a.billing || {};
  const state = subState(a, now);
  const tariff = accountSites(a, now)[0].tariff;
  const period = b.paidAt ? paidPeriod(b.paidAt, b.paidYears) : null;
  const unfinished = (a.stepsDone || 0) < 4;
  const acc = loadAnketa(); // баланс и карта — одни на аккаунт
  const short = balanceOf(acc) < PRICE && !acc.billing?.card?.auto;
  const go = (href) => router.push(href);
  const button = (label, onClick, arrow = true) => (
    <button type="button" onClick={onClick} className={BTN}>
      {label} {arrow && <ArrowRightIcon size={16} />}
    </button>
  );

  // «Включить автопродление» включает только автосписание с баланса в дату
  // продления — ни оплаты, ни перехода (владелец 24.09).
  function enableRenew() {
    setSiteCancelled(currentSiteKey(), false);
    setA(siteAnketa(loadAnketa()));
  }

  // 1. Сколько ещё будет работать подписка. Кнопка — только когда без неё
  // нельзя: в пробный период её нет, в последний день — «Пополнить», если на
  // балансе не хватает на год (владелец 24.09).
  let sub;
  if (state === 'trial') {
    const left = Math.ceil((trialEndAt(a) - now) / DAY);
    const lastDay = trialEndAt(a) - now <= DAY;
    sub = {
      value: `до ${trialEnds(a)}`,
      tone: lastDay ? 'warn' : 'none',
      facts: [
        'Пробный период',
        !a.installed ? 'код пока не найден' : lastDay ? 'последний день' : `осталось ${left} ${plural(left, 'день', 'дня', 'дней')}`,
        b.cancelled ? 'автопродление выключено' : tariff ? `дальше ${tariff}` : 'тариф не выбран',
      ],
      action: !a.installed
        ? button('Проверить код на сайте', () => go('/app/start/code'))
        : lastDay && short && !b.cancelled
          ? button('Пополнить', () => go('/app/billing?topup=1'))
          : null,
    };
  } else if (state === 'paid') {
    sub = {
      value: `до ${period.to}`,
      tone: 'none',
      facts: [tariff, b.cancelled ? 'автопродление выключено' : 'автопродление включено', !a.installed && 'ждём код на сайте'],
      action: b.cancelled
        ? button('Включить автопродление', enableRenew, false)
        : !a.installed
          ? button('Поставить код на сайт', () => go('/app/start/code'))
          : null,
    };
  } else if (state === 'pending') {
    sub = {
      value: 'Ждём оплату',
      tone: 'warn',
      facts: [`счёт № ${b.invoice?.no}`, 'обычно 1–3 рабочих дня'],
      action: button('Открыть счёт', () => go('/app/billing?pay=current')),
    };
  } else if (state === 'expired') {
    sub = {
      value: 'Остановлена',
      tone: 'danger',
      facts: [`пробный период закончился ${formatDate(a.trialStartedAt + TRIAL_MS)}`, 'виджет снят с сайта'],
      action: button('Оплатить год', () => go('/app/billing?pay=current')),
    };
  } else {
    sub = {
      value: 'Не началась',
      tone: 'muted',
      facts: unfinished ? ['анкета не закончена'] : ['начнётся, когда код появится на сайте', `${TRIAL_DAYS} дней бесплатно`],
      action: unfinished
        ? button('Продолжить анкету', () => go(STEP_URLS[a.stepsDone || 0]))
        : button('Поставить код на сайт', () => go('/app/start/code')),
    };
  }
  const subLink = state === 'trial' && !tariff ? ['Выбрать тариф', '/app/billing?tariff=current'] : ['Тариф и оплата', '/app/billing'];

  // 2. Все ли документы актуальны и когда обновлены.
  const madeAt = a.trialStartedAt || now;
  const edits = editEvents(a.docEdits);
  const updatedAt = Math.max(madeAt, ...edits.map((e) => e.at));
  const live = a.installed && state !== 'expired' && state !== 'notstarted';
  const docs = unfinished
    ? { value: 'Не собраны', tone: 'muted', facts: ['соберём по ответам анкеты'] }
    : state === 'expired'
      ? { value: 'Сняты с сайта', tone: 'danger', facts: [`${DOCUMENTS.length} документов`, 'вернутся после оплаты'] }
      : live
        ? { value: 'Актуальны', tone: 'ok', facts: [`${DOCUMENTS.length} документов`, `${edits.length ? 'обновлены' : 'собраны'} ${formatDate(updatedAt)}`] }
        : { value: 'Ждут кода', tone: 'warn', facts: [`${DOCUMENTS.length} документов`, `собраны ${formatDate(madeAt)}`] };

  // 3. Последние изменения — только то, что действительно произошло.
  const events = [
    b.paidAt && [b.paidAt, `Подписка оплачена — до ${period.to}`, 'bg-ok'],
    b.cancelled && b.paidAt && [b.cancelledAt || now, `Автопродление выключено — сайт работает до ${period.to}`, 'bg-warn'],
    b.invoice && !b.paidAt && [b.invoice.at, `Выставлен счёт № ${b.invoice.no}`, 'bg-warn'],
    state === 'expired' && [a.trialStartedAt + TRIAL_MS, 'Пробный период закончился — виджет снят с сайта', 'bg-danger'],
    a.trialStartedAt && [a.trialStartedAt, a.installed ? 'Код найден на сайте, пробный период запущен' : 'Пробный период запущен, ждём код на сайте', 'bg-brand'],
    ...edits.map((e) => [e.at, e.text, 'bg-brand']),
    !unfinished && [madeAt - 1, 'Документы собраны по ответам анкеты', 'bg-ok'],
  ].filter(Boolean).sort((x, y) => y[0] - x[0]);

  return (
    <main className="min-h-screen bg-warm text-ink lg:flex">
      <SiteSidebar domain={a.domain} active="Обзор" user={user} />

      <section className="min-w-0 flex-1 px-5 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12 xl:px-20">
        <div className="mx-auto max-w-5xl">
          {/* Заголовок — сам сайт, а не «Обзор»: название раздела уже стоит
              в меню, и повтор ничего не сообщал (владелец 24.09). */}
          <header>
            <h1 className="break-words text-[28px] font-bold tracking-[-0.045em] sm:text-[36px]">{a.domain}</h1>
            {(a.companyName || a.inn) && (
              <p className="mt-2 text-[15px] text-ink/60">{[a.companyName, a.inn && `ИНН ${a.inn}`].filter(Boolean).join(' · ')}</p>
            )}
          </header>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Answer label="Подписка" {...sub} link={subLink} />
            <Answer label="Документы" {...docs} link={['Все документы', '/app/site/documents']} />
          </div>

          <section className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7">
            <h2 className="text-lg font-bold tracking-[-0.02em]">Последние изменения</h2>
            <div className={`relative mt-6 space-y-6 ${events.length > 1 ? 'before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-line' : ''}`}>
              {events.map(([when, what, dot]) => (
                <div key={`${when}-${what}`} className="relative flex gap-4">
                  <span className={`z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-4 border-white ${dot}`} />
                  <div>
                    <p className="text-sm font-bold">{sameDay(when)}</p>
                    <p className="mt-1 text-sm text-ink/60">{what}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
