'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon, CheckIcon, CopyIcon } from '../../../components/app/AppIcons';
import { IconAction } from '../../../components/app/DocRows';
import { CURRENT_USER } from '../../../lib/appMock';
import { DOCUMENTS, docUrl, editEvents } from '../../../lib/docPackage';
import { accountSites, balanceOf, currentSiteKey, saveSiteFields, setSiteLeaving, siteAnketa } from './_shared/sites';
import { accountUser, loadAnketa } from '../start/_shared/anketaState';
import { RING, SiteSidebar } from './_shared/SiteChrome';
import { PRICE, TRIAL_DAYS, TRIAL_MS, formatDate, paidPeriod, subState, trialEndAt, trialEnds } from './_shared/subscription';

// «Обзор» отвечает на три вопроса, с которыми сюда заходят (владелец 24.09):
// сколько ещё будет работать подписка, все ли документы актуальны и когда
// обновлены, какие были последние изменения. Без поясняющих фраз («что сейчас
// с сайтом и что делать дальше» — текст из макета, а не ответ) и без плашки:
// её состояние и единственное действие — в карточке «Подписка». Под ответами —
// задачи, которые клиент делает на сайте сам (владелец 24.09), пока они есть.

const STEP_URLS = ['profile', 'site', 'clients', 'requisites', 'documents', 'code'].map((s) => `/app/start/${s}`);
const BTN = `inline-flex h-11 w-fit items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1a1acc] ${RING}`;
const DAY = 24 * 3600 * 1000;
const CONSENT = DOCUMENTS.find((d) => d.id === '12');
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

// Задача клиента: что сделать и почему — одной строкой, закон мелко рядом, как
// в строке документа. «Сделано» — белая кнопка: синяя на экране одна, и она
// у подписки.
function Task({ title, law, text, name, onDone, children }) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <h3 className="text-sm font-bold">
          {title}
          <span className="ml-2 whitespace-nowrap font-mono text-[11px] font-normal text-ink/60">{law}</span>
        </h3>
        <p className="mt-1 max-w-2xl text-[13px] leading-5 text-ink/60">{text}</p>
        {children}
      </div>
      <button
        type="button"
        onClick={onDone}
        aria-label={name}
        className={`w-fit shrink-0 rounded-xl border border-line bg-white px-4 py-2 text-[13px] font-bold transition hover:border-brand hover:text-brand ${RING}`}
      >
        Сделано
      </button>
    </div>
  );
}

export default function SiteOverviewClient() {
  const router = useRouter();
  const [a, setA] = useState(null);
  const [user, setUser] = useState(CURRENT_USER);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);

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

  // Отключённый сайт возвращают отсюда же, одним нажатием: продление — как
  // было до отключения. «Включить автопродление» здесь больше нет (владелец
  // 24.09): выключенное автопродление — не уход, а продление вручную.
  function comeBack() {
    setSiteLeaving(currentSiteKey(), false);
    setA(siteAnketa(loadAnketa()));
  }

  // Отметку «Сделано» ставит сам клиент — проверить формы и счётчики на его
  // сайте прототип не может.
  function consentDone() {
    saveSiteFields({ tasksDone: { ...a.tasksDone, consentLink: Date.now() } });
    setA(siteAnketa(loadAnketa()));
  }

  // Убранный Google Analytics уходит из ответа «Счётчики на сайте», а с ним —
  // из «Политики обработки куки»: документ не должен называть счётчик,
  // которого на сайте нет. Опубликованный документ получает новую версию.
  function gaRemoved() {
    const rest = (a.analytics || []).filter((v) => v !== 'ga');
    saveSiteFields({
      analytics: rest.length ? rest : ['none'],
      ...(a.installed && { docEdits: [...(a.docEdits || []), { at: Date.now(), doc: '02', what: 'Убран Google Analytics' }] }),
    });
    setA(siteAnketa(loadAnketa()));
  }

  function copyConsent() {
    navigator.clipboard?.writeText(`https://${docUrl(CONSENT)}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        b.leaving ? 'дальше сайт отключится' : b.cancelled ? 'продление вручную' : tariff ? `дальше ${tariff}` : 'тариф не выбран',
      ],
      action: !a.installed
        ? button('Проверить код на сайте', () => go('/app/start/code'))
        : b.leaving
          ? button('Вернуть в подписку', comeBack, false)
          : lastDay && b.cancelled
            ? button('Оплатить год', () => go('/app/billing?pay=current'))
            : lastDay && short
              ? button('Пополнить', () => go('/app/billing?topup=1'))
              : null,
    };
  } else if (state === 'paid') {
    // Продление вручную: за месяц до конца срока — жёлтым и «Продлить на
    // год», раньше — просто факт (как «Скоро» в «Оплате»).
    const end = new Date(b.paidAt);
    end.setFullYear(end.getFullYear() + (b.paidYears || 1));
    const renewSoon = b.cancelled && !b.leaving && end.getTime() - now < 30 * DAY;
    sub = {
      value: `до ${period.to}`,
      tone: renewSoon ? 'warn' : 'none',
      facts: [
        tariff,
        b.leaving ? 'дальше сайт отключится' : b.cancelled ? 'продление вручную' : 'автопродление включено',
        !a.installed && 'ждём код на сайте',
      ],
      action: b.leaving
        ? button('Вернуть в подписку', comeBack, false)
        : renewSoon
          ? button('Продлить на год', () => go('/app/billing?pay=current'))
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

  // 3. Что сделать на сайте самому (владелец 24.09): мы собрали документы и
  // ставим виджет, а формы и счётчики — в руках клиента. Задача висит до
  // отметки «Сделано». Ссылку на согласие — только когда она открывается
  // (код стоит, подписка не остановлена) и формы на сайте есть; Google
  // Analytics — пока он в ответе «Счётчики на сайте».
  const features = a.features || [];
  const noForms = features.length > 0 && features.every((v) => v === 'none');
  const tasks = [
    live && !noForms && !a.tasksDone?.consentLink && 'consent',
    (a.analytics || []).includes('ga') && 'ga',
  ].filter(Boolean);

  // 4. Последние изменения — только то, что действительно произошло.
  const events = [
    a.tasksDone?.consentLink && [a.tasksDone.consentLink, 'Ссылка на согласие добавлена в формы сайта — отметили вы', 'bg-ok'],
    b.paidAt && [b.paidAt, `Подписка оплачена — до ${period.to}`, 'bg-ok'],
    b.cancelled && b.cancelledAt && [b.cancelledAt, 'Автопродление выключено — продлевать будете вручную', 'bg-brand'],
    b.leaving && [b.leavingAt || now, `Сайт отключается — работает до ${period ? period.to : trialEnds(a)}, дальше продлевать не будем`, 'bg-warn'],
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

          {tasks.length > 0 && (
            <section className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-lg font-bold tracking-[-0.02em]">Сделайте на сайте сами</h2>
                <span className="shrink-0 text-xs font-semibold text-ink/60">
                  {tasks.length} {plural(tasks.length, 'задача', 'задачи', 'задач')}
                </span>
              </div>
              <div className="mt-5 divide-y divide-line">
                {tasks.includes('consent') && (
                  <Task
                    title="Добавьте ссылку на согласие в формы сайта"
                    law={CONSENT.law}
                    text="Рядом с кнопкой отправки — в каждой форме, где оставляют контакты."
                    name="Сделано: ссылка на согласие добавлена в формы"
                    onDone={consentDone}
                  >
                    <div className="mt-2 flex min-w-0 items-center gap-1">
                      <span className="truncate font-mono text-[12px] text-ink/70">{docUrl(CONSENT)}</span>
                      <IconAction
                        label="Скопировать ссылку"
                        name="Скопировать ссылку на согласие"
                        done={copied ? 'Скопировано' : null}
                        icon={copied ? CheckIcon : CopyIcon}
                        onClick={copyConsent}
                      />
                    </div>
                  </Task>
                )}
                {tasks.includes('ga') && (
                  <Task
                    title="Уберите Google Analytics с сайта"
                    law="152-ФЗ"
                    text="Он сохраняет данные посетителей на серверах за рубежом — с 1 июля 2025 года это запрещено, даже если он назван в политике."
                    name="Сделано: Google Analytics убран с сайта"
                    onDone={gaRemoved}
                  />
                )}
              </div>
            </section>
          )}

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
