'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon, ClockIcon, OkIcon, RefreshIcon, WarnIcon } from '../../../components/app/AppIcons';
import { CURRENT_USER } from '../../../lib/appMock';
import { DOCUMENTS, editEvents } from '../../../lib/docPackage';
import { accountSites, balanceOf, currentSiteKey, setSiteCancelled, siteAnketa } from './_shared/sites';
import { accountUser, loadAnketa, saveAnketa } from '../start/_shared/anketaState';
import { RING, SiteHeader, SiteSidebar } from './_shared/SiteChrome';
import { PRICE, PRICE_LABEL, TARIFFS, TRIAL_DAYS, TRIAL_MS, formatDate, paidPeriod, subState, trialEndAt, trialEnds } from './_shared/subscription';

const STEP_URLS = ['profile', 'site', 'clients', 'requisites', 'documents', 'code'].map((s) => `/app/start/${s}`);
const BTN = `inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1a1acc] ${RING}`;

function Rows({ rows }) {
  return (
    <dl className="mt-5 space-y-3 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4">
          <dt className="text-ink/60">{k}</dt>
          <dd className="text-right font-semibold text-ink/80">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

// Карточки «Подписка» и «Документы» — одна схема. Ссылка прижата к низу:
// в ряду карточки одной высоты, а строк у них разное число, и без этого
// разделитель и ссылка в соседних карточках стояли на разной высоте.
function Card({ title, rows, href, link }) {
  return (
    <article className="flex flex-col rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7">
      <h2 className="text-lg font-bold tracking-[-0.02em]">{title}</h2>
      <Rows rows={rows} />
      <div className="mt-auto pt-5">
        <div className="border-t border-line pt-5">
          <Link href={href} className="text-sm font-semibold text-brand hover:underline">
            {link} →
          </Link>
        </div>
      </div>
    </article>
  );
}

function sameDay(ms) {
  return new Date(ms).toDateString() === new Date().toDateString() ? 'Сегодня' : formatDate(ms);
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
    // Отсчёт идёт от активации, а не от установки кода: так и обещано на
    // шаге установки.
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [router]);

  if (!a) return null;

  function setBilling(patch) {
    saveAnketa({ billing: { ...loadAnketa().billing, ...patch } });
    setA(siteAnketa(loadAnketa()));
  }

  const b = a.billing || {};
  const state = subState(a, now);
  const mainSite = accountSites(a, now)[0];
  const tariff = mainSite.tariff;
  const period = b.paidAt ? paidPeriod(b.paidAt, b.paidYears) : null;
  const unfinished = (a.stepsDone || 0) < 4;
  const domain = <span className="font-semibold text-ink">{a.domain}</span>;

  // Главная карточка — что сейчас с сайтом и что делать дальше. Тексты
  // из утверждённого макета; честные к состоянию: «уже работают» — только
  // когда код на сайте действительно найден.
  // «Включить автопродление» включает только автосписание с баланса в дату
  // продления — ни оплаты, ни перехода (владелец 23.09). Раньше кнопка вела
  // на оплату года, и «Списать» продлевало срок, а автопродление оставалось
  // выключенным.
  function enableRenew() {
    setSiteCancelled(currentSiteKey(), false);
    setA(siteAnketa(loadAnketa()));
  }

  let banner;
  // Автопродление выключают в «Подписке» — здесь об этом говорит баннер, и
  // путь назад ведёт туда же. Выключенное автопродление не отключает сайт
  // сразу: он работает до конца оплаченного срока (партнёрская программа).
  if (b.cancelled && state === 'paid') {
    banner = { tone: 'warn', Icon: WarnIcon, title: `Автопродление выключено — сайт работает до ${period.to}`, text: <>После этой даты виджет снимем с {domain}. Опубликованные документы останутся доступны по ссылке.</>, cta: ['Включить автопродление', enableRenew] };
  } else if (state === 'notstarted') {
    banner = unfinished
      ? { tone: 'warn', Icon: WarnIcon, title: 'Анкета не закончена', text: <>Документы собираются по ответам анкеты — ответьте на оставшиеся вопросы, и пакет будет готов.</>, cta: ['Продолжить анкету', STEP_URLS[a.stepsDone || 0]] }
      : { tone: 'muted', Icon: WarnIcon, title: 'Документы собраны, код не установлен', text: <>Пакет готов. Как только код встанет на сайт, включим документы и виджет — {TRIAL_DAYS} дней бесплатно.</>, cta: ['Поставить код на сайт', '/app/start/code'] };
  } else if (state === 'trial') {
    // Пробный период — хорошая новость, а не тревога: синий, как плашка в
    // «Моих сайтах» и «Подписке». Жёлтый — только в последний день, когда
    // уходит и письмо-напоминание (владелец 23.09). «Пополните» — только
    // если на балансе действительно не хватает на год.
    const lastDay = trialEndAt(a) - now <= 24 * 3600 * 1000;
    const enough = balanceOf(loadAnketa()) >= PRICE; // баланс — один на аккаунт
    banner = {
      tone: lastDay ? 'warn' : 'info', Icon: ClockIcon, title: `Пробный период — до ${trialEnds(a)}`,
      text: a.installed
        ? <>Документы и виджет уже работают на {domain}. {b.cancelled ? 'Автопродление выключено — после этой даты сайт отключится.' : enough ? 'Когда пробный период закончится, спишем оплату года с баланса — на нём хватает.' : 'Когда пробный период закончится, спишем оплату года с баланса — пополните его заранее. Напомним письмом за день до конца.'}</>
        : <>Код на {domain} пока не нашли — проверка занимает до 15 минут. Как только он появится, документы и виджет заработают.</>,
      // Сразу после установки «Оплатить год» пугало: человек ещё не видел,
      // как всё работает (владелец 24.09). В пробный период — посмотреть
      // результат; оплата — главной только в последний день.
      cta: !a.installed
        ? ['Проверить код на сайте', '/app/start/code']
        : lastDay
          ? ['Оплатить год', '/app/billing?pay=current']
          : ['Как это видят посетители', '/app/site/widget'],
    };
  } else if (state === 'expired') {
    banner = { tone: 'danger', Icon: WarnIcon, title: 'Пробный период закончился', text: <>Виджет снят с сайта — куки-баннер и подвал больше не показываются посетителям. Оплата вернёт всё на место.</>, cta: ['Оплатить год', '/app/billing?pay=current'] };
  } else if (state === 'pending') {
    banner = { tone: 'warn', Icon: RefreshIcon, title: 'Счёт выставлен', text: <>Документы и виджет работают на {domain}. Отметим сайт оплаченным, как только поступят деньги — обычно 1–3 рабочих дня.</>, cta: ['Открыть счёт', '/app/billing?pay=current'] };
  } else {
    banner = a.installed
      ? { tone: 'ok', Icon: OkIcon, title: 'Документы актуальны', text: <>Документы подготовлены и подключены через виджет. Следим за законом и обновим сами, если что-то изменится.</> }
      : { tone: 'warn', Icon: WarnIcon, title: 'Оплачено, ждём код на сайте', text: <>Как только код появится на {domain}, документы и виджет заработают.</>, cta: ['Поставить код на сайт', '/app/start/code'] };
  }
  const toneCls = {
    info: 'border-brand/20 bg-brand/[0.04] text-brand',
    warn: 'border-warn/30 bg-warn/[0.06] text-warn-ink',
    danger: 'border-danger/25 bg-danger/[0.05] text-danger',
    ok: 'border-ok/25 bg-ok/[0.06] text-ok',
    muted: 'border-line bg-white text-ink/60',
  }[banner.tone];

  // Статус сайта — только в баннере наверху (решение 23.09): раньше он
  // повторялся тут строкой «Статус» и ещё раз в событиях. В карточке —
  // факты подписки: тариф, цена, продление, номер счёта.
  const priceRow = ['Цена', `${PRICE_LABEL} в год`];
  // В пробный период тариф — «Пробный период», а выбранный тариф — строкой
  // «Дальше»: что начнётся после и сколько стоит (владелец 23.09 — название
  // тарифа во время бесплатных дней читалось как уже оплаченный тариф).
  const afterRow = ['Дальше', `${tariff} · ${PRICE_LABEL} в год`];
  const subRows = {
    notstarted: [['Тариф', `Пробный период — ${TRIAL_DAYS} дней`], afterRow],
    trial: [['Тариф', `Пробный период до ${trialEnds(a)}`], afterRow],
    expired: [['Тариф', tariff], priceRow],
    pending: [['Тариф', tariff], ['Счёт', `№ ${b.invoice?.no} · обычно 1–3 рабочих дня`]],
    paid: period && (b.cancelled
      ? [['Тариф', tariff], ['Работает до', period.to]]
      : [['Тариф', tariff], ['Продление', `${period.renew} · ${PRICE_LABEL}`]]),
  }[state];

  const madeAt = a.trialStartedAt || now;
  const docRows = [
    ['Статус', unfinished ? 'ещё не собраны' : a.installed && state !== 'expired' ? `${DOCUMENTS.length} действуют` : `${DOCUMENTS.length} ждут ${state === 'expired' ? 'оплаты' : 'кода'}`],
    ['Собраны', formatDate(madeAt)],
  ];

  // События верхнего уровня по сайту, свежие сверху. Только то, что
  // действительно произошло, — без придуманных сверок и переходов.
  const events = [
    b.paidAt && [b.paidAt, `Подписка оплачена — до ${period.to}`, 'bg-ok'],
    b.cancelled && b.paidAt && [b.cancelledAt || now, `Сайт выключен из подписки — работает до ${period.to}`, 'bg-warn'],
    b.invoice && !b.paidAt && [b.invoice.at, `Выставлен счёт № ${b.invoice.no}`, 'bg-warn'],
    state === 'expired' && [a.trialStartedAt + TRIAL_MS, 'Пробный период закончился — виджет снят с сайта', 'bg-danger'],
    a.trialStartedAt && [a.trialStartedAt, a.installed ? 'Код найден на сайте, пробный период запущен' : 'Пробный период запущен, ждём код на сайте', 'bg-brand'],
    // Какой документ обновили — из самой правки: раньше здесь всегда стояли
    // «Реквизиты владельца», что бы ни меняли.
    ...editEvents(a.docEdits).map((e) => [e.at, e.text, 'bg-brand']),
    !unfinished && [madeAt - 1, 'Документы собраны по ответам анкеты', 'bg-ok'],
  ].filter(Boolean).sort((x, y) => y[0] - x[0]);

  return (
    <main className="min-h-screen bg-warm text-ink lg:flex">
      <SiteSidebar domain={a.domain} active="Обзор" user={user} />

      <section className="min-w-0 flex-1 px-5 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12 xl:px-20">
        <div className="mx-auto max-w-5xl">
          <SiteHeader title="Обзор" domain={a.domain} context="что сейчас с сайтом и что делать дальше">
            {/* Чей это сайт — подписью, без «Изменить»: реквизиты правятся в
                одном месте, у документа «Реквизиты владельца» в «Документах»
                (решение 23.09 — два входа в одну правку заставляли гадать). */}
            {(a.companyName || a.inn) && (
              <p className="mt-1 text-[14px] text-ink/60">{[a.companyName, a.inn && `ИНН ${a.inn}`].filter(Boolean).join(' · ')}</p>
            )}
          </SiteHeader>

          <section className={`mt-8 flex flex-col gap-6 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7 ${toneCls}`}>
            <div>
              <div className="flex items-center gap-2 text-sm font-bold">
                <banner.Icon size={18} /> {banner.title}
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/65">{banner.text}</p>
            </div>
            {banner.cta && (
              <button
                type="button"
                onClick={() => (typeof banner.cta[1] === 'function' ? banner.cta[1]() : router.push(banner.cta[1]))}
                className={BTN}
              >
                {banner.cta[0]} {typeof banner.cta[1] === 'string' && <ArrowRightIcon size={16} />}
              </button>
            )}
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Автопродление и тариф сайта — в «Подписке», в его строке —
                одно место на все сайты аккаунта (решение владельца 23.09). */}
            <Card title="Подписка" rows={subRows} href="/app/billing" link="Тариф и автопродление — в подписке" />
            <Card title="Документы" rows={docRows} href="/app/site/documents" link="Все документы" />
          </div>

          <section className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7">
            <h2 className="text-lg font-bold tracking-[-0.02em]">Последние события</h2>
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
