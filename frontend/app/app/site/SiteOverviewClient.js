'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon, CheckIcon, CopyIcon } from '../../../components/app/AppIcons';
import { IconAction } from '../../../components/app/DocRows';
import { widgetSettings } from '../../../components/app/WidgetPreviews';
import { DOCUMENTS, docUrl, editEvents } from '../../../lib/docPackage';
import { accountSites, balanceOf, currentSiteKey, debitShortfall, payLabel, saveSiteFields, setSiteLeaving, settleRenewals, siteAnketa } from './_shared/sites';
import { NO_USER, accountUser, loadAnketa } from '../start/_shared/anketaState';
import { RING, SiteSidebar } from './_shared/SiteChrome';
import SitePayDialog from '../billing/SitePayDialog';
import { PRICE, TRIAL_DAYS, TRIAL_MS, formatDate, graceEndAt, graceEnds, paidPeriod, subState, trialEndAt, trialEnds, widgetStopped, tariffName } from './_shared/subscription';

// «Обзор» отвечает на три вопроса, с которыми сюда заходят (владелец 24.09):
// сколько ещё будет работать подписка, все ли документы актуальны и когда
// обновлены, какие были последние изменения. Без поясняющих фраз («что сейчас
// с сайтом и что делать дальше» — текст из макета, а не ответ) и без плашки:
// её состояние и единственное действие — в карточке «Подписка». Под ответами —
// задачи, которые клиент делает на сайте сам (владелец 24.09), пока они есть.

const STEP_URLS = ['profile', 'site', 'clients', 'requisites', 'documents', 'code'].map((s) => `/app/start/${s}`);
const BTN = `inline-flex h-11 w-fit items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-hover ${RING}`;
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
          {typeof link[1] === 'function' ? (
            <button type="button" onClick={link[1]} aria-haspopup="dialog" className={`rounded text-sm font-semibold text-brand hover:underline ${RING}`}>
              {link[0]} →
            </button>
          ) : (
            <Link href={link[1]} className={`rounded text-sm font-semibold text-brand hover:underline ${RING}`}>
              {link[0]} →
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

// Задача клиента: что сделать и почему — одной строкой, закон мелко рядом, как
// в строке документа. «Сделано» — белая кнопка: синяя на экране одна, и она
// у подписки.
// href — задача, которую закрывают не отметкой, а делом в другом разделе
// (включить выключенный баннер или подвал в «Виджете»).
function Task({ title, law, text, name, onDone, href, actionLabel, children }) {
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
      {href ? (
        <Link
          href={href}
          className={`w-fit shrink-0 rounded-xl border border-line bg-white px-4 py-2 text-[13px] font-bold transition hover:border-brand hover:text-brand ${RING}`}
        >
          {actionLabel}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onDone}
          aria-label={name}
          className={`w-fit shrink-0 rounded-xl border border-line bg-white px-4 py-2 text-[13px] font-bold transition hover:border-brand hover:text-brand ${RING}`}
        >
          Сделано
        </button>
      )}
    </div>
  );
}

export default function SiteOverviewClient() {
  const router = useRouter();
  const [a, setA] = useState(null);
  const [user, setUser] = useState(NO_USER);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  // Окно оплаты года — здесь же, без перехода в «Мои сайты» (владелец 28.09).
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    settleRenewals(); // списание в дату продления — до чтения состояния
    const saved = siteAnketa(loadAnketa());
    if (!saved.domain) {
      router.replace('/app/sites');
      return;
    }
    setA(saved);
    setUser(accountUser());
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [router]);

  if (!a) return null;

  const b = a.billing || {};
  const state = subState(a, now);
  const rawTariff = accountSites(a, now)[0].tariff;
  const tariff = rawTariff && tariffName(rawTariff);
  const period = b.paidAt ? paidPeriod(b.paidAt, b.paidYears) : null;
  const unfinished = (a.stepsDone || 0) < 4;
  const acc = loadAnketa(); // баланс и карта — одни на аккаунт
  // Выставленный счёт на пополнение — деньги в пути: нехватки нет, а главное
  // действие — открыть счёт, не пополнить второй раз (разбор 24.09).
  const invoice = acc.billing?.topupInvoice || null;
  const stopped = widgetStopped(a, now, invoice);
  const paidOp = [...(acc.billing?.ops || [])].reverse().find((op) => op.kind === 'debit' && op.site === a.domain);
  const paidOpAt = paidOp?.at || null;
  const paidAuto = Boolean(paidOp?.auto);
  // Продлится ли год сам — только если есть откуда списать: карта с галочкой
  // «Продлевать автоматически» или баланс покроет этот сайт в его дату (с
  // учётом других сайтов). Иначе «автопродление включено» обещало то, чего не
  // будет (критика 28.09: окно оплаты сказало «напомним», «Обзор» — «включено»).
  const autoReal = Boolean(acc.billing?.card?.auto) || !debitShortfall(accountSites(acc, now), balanceOf(acc))[currentSiteKey()];
  const short = balanceOf(acc) + (invoice ? invoice.amount || PRICE : 0) < PRICE && !acc.billing?.card?.auto;
  const go = (href) => router.push(href);
  const button = (label, onClick, arrow = true) => (
    <button type="button" onClick={onClick} className={BTN}>
      {label} {arrow && <ArrowRightIcon size={16} />}
    </button>
  );
  // Кнопка, открывающая окно оплаты: отмечаем, что оплата в блоке уже есть, —
  // тогда внизу второй «Оплатить» не нужен.
  let actionPays = false;
  const payButton = (label) => {
    actionPays = true;
    return button(label, () => setPaying(true));
  };

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

  function copyConsent() {
    navigator.clipboard?.writeText(`https://${docUrl(CONSENT)}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // 1. Сколько ещё будет работать подписка. Кнопка — только когда без неё
  // нельзя: в пробный период её нет, в последний день — «Оплатить», если на
  // балансе не хватает на год (владелец 24.09; «Оплатить» без «год» и вместо
  // «Пополнить» — владелец 26.09).
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
        b.leaving ? 'без продления' : b.cancelled ? 'продление вручную' : tariff ? `дальше ${tariff}` : 'тариф не выбран',
        invoice && `ждём оплату счёта № ${invoice.no}`,
      ],
      action: !a.installed
        ? button('Проверить код на сайте', () => go('/app/start/code'))
        : b.leaving
          ? button('Вернуть в подписку', comeBack, false)
          : lastDay && invoice
            ? payButton('Открыть счёт')
            : lastDay && b.cancelled
            ? payButton('Оплатить')
            : lastDay && short
              ? payButton('Оплатить')
              : null,
    };
  } else if (state === 'paid') {
    // Продление вручную: за месяц до конца срока — жёлтым и «Продлить на
    // год», раньше — просто факт (как «Скоро» в таблице сайтов).
    const end = new Date(b.paidAt);
    end.setFullYear(end.getFullYear() + (b.paidYears || 1));
    const renewSoon = (b.cancelled || !autoReal) && !b.leaving && end.getTime() - now < 30 * DAY;
    sub = {
      value: `до ${period.to}`,
      tone: renewSoon ? 'warn' : 'none',
      facts: [
        tariff,
        b.leaving ? 'без продления' : b.cancelled ? 'продление вручную' : autoReal ? 'автопродление включено' : 'напомним о продлении заранее',
        !a.installed && 'ждём код на сайте',
      ],
      action: b.leaving
        ? button('Вернуть в подписку', comeBack, false)
        : renewSoon
          ? payButton('Продлить')
          : !a.installed
            ? button('Поставить код на сайт', () => go('/app/start/code'))
            : null,
    };
  } else if (state === 'pending') {
    sub = {
      value: 'Ждём оплату',
      tone: 'warn',
      facts: [`счёт № ${b.invoice?.no}`, 'включим, как только поступят деньги'],
      action: payButton('Открыть счёт'),
    };
  } else if (state === 'expired') {
    // Мягкий уход (владелец 25.09): после пробного сайт работает ещё
    // несколько дней, а при выставленном счёте — пока ждём деньги.
    const ended = `пробный период закончился ${formatDate(a.trialStartedAt + TRIAL_MS)}`;
    sub = stopped
      ? {
          value: 'Остановлена',
          tone: 'danger',
          facts: [ended, 'виджет снят с сайта', 'ссылки на документы работают'],
          action: payButton('Оплатить'),
        }
      : invoice
        ? {
            value: 'Ждём оплату',
            tone: 'warn',
            facts: [ended, `счёт № ${invoice.no}`, 'виджет работает, пока ждём деньги'],
            // Счёт уже выставлен: второй раз платить не предлагаем, ведём к нему.
            action: payButton('Открыть счёт'),
          }
        : {
            // «Подписка: до 30.09» читалось как «оплачено до» (критика 28.09):
            // подписка не оплачена, до даты работает только виджет.
            value: 'Не оплачена',
            tone: 'warn',
            facts: [ended, `виджет работает до ${graceEnds(a)}`, `потом снимем его с ${a.domain}`],
            action: payButton('Оплатить'),
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
  // Оплата на виду всегда (владелец 29.09: как продлить, было не понять, не зайдя
  // в таблицу «Моих сайтов»): если в блоке нет кнопки оплаты, «Продлить» /
  // «Оплатить» встаёт вместо ссылки в таблицу и открывает то же окно.
  const pay = !actionPays && payLabel(b.leaving && (state === 'paid' || state === 'trial') ? 'off-soon' : state);
  const subLink = pay
    ? [pay, () => setPaying(true)]
    : state === 'trial' && !tariff
      ? ['Выбрать тариф', '/app/sites?view=table&tariff=current']
      : ['Тариф и оплата', '/app/sites?view=table'];

  // 2. Все ли документы актуальны и когда обновлены.
  const madeAt = a.trialStartedAt || now;
  const edits = editEvents(a.docEdits);
  const updatedAt = Math.max(madeAt, ...edits.map((e) => e.at));
  const live = a.installed && state !== 'notstarted' && !stopped;
  const docs = unfinished
    ? { value: 'Не собраны', tone: 'muted', facts: ['соберём по ответам анкеты'] }
    : stopped
      // Опубликованные страницы остаются по ссылке, но не обновляются (правило
      // владельца 24.08, подтверждено 28.09): «Сняты с сайта, вернутся после
      // оплаты» обещало мёртвые ссылки в формах клиента.
      ? { value: 'Не обновляются', tone: 'danger', facts: [`${DOCUMENTS.length} документов`, 'открываются по прежним ссылкам'] }
      : live
        ? { value: 'Актуальны', tone: 'ok', facts: [`${DOCUMENTS.length} документов`, `${edits.length ? 'обновлены' : 'собраны'} ${formatDate(updatedAt)}`] }
        : { value: 'Ждут кода', tone: 'warn', facts: [`${DOCUMENTS.length} документов`, `собраны ${formatDate(madeAt)}`] };

  // 3. Что сделать на сайте самому (владелец 24.09): мы собрали документы и
  // ставим виджет, а формы и счётчики — в руках клиента. Задача висит до
  // отметки «Сделано». Ссылку на согласие — только когда она открывается
  // (код стоит, подписка не остановлена) и формы на сайте есть. Задачи
  // «Уберите Google Analytics» нет (владелец 28.09): о нём предупреждает
  // анкета в момент выбора, а убрал ли его клиент, проверить мы не можем.
  const features = a.features || [];
  const noForms = features.length > 0 && features.every((v) => v === 'none');
  // Выключенный баннер или подвал — тоже задача, и первая: «Актуальны» при
  // выключенном виджете читалось как «я в порядке» (разбор 24.09).
  const w = widgetSettings(a);
  const tasks = [
    live && !w.bannerOn && 'banner',
    live && !w.footerOn && 'footer',
    live && !noForms && !a.tasksDone?.consentLink && 'consent',
  ].filter(Boolean);

  // 4. Последние изменения — только то, что действительно произошло.
  const events = [
    a.tasksDone?.consentLink && [a.tasksDone.consentLink, 'Вы отметили, что ссылка на согласие добавлена в формы сайта', 'bg-ok'],
    // Дата события — день оплаты, а не начала оплаченного года: оплатив в
    // пробный период, клиент видел событие «завтрашним» (критика 28.09).
    b.paidAt && [paidOpAt || Math.min(b.paidAt, now), paidAuto ? `Год продлён автоматически: оплачено до ${period.to}` : `Подписка оплачена до ${period.to}`, 'bg-ok'],
    b.cancelled && b.cancelledAt && [b.cancelledAt, 'Автопродление выключено: продлевать будете вручную', 'bg-brand'],
    b.leaving && [b.leavingAt || now, `Подписка не продлится: документы и виджет работают до ${period ? period.to : trialEnds(a)}`, 'bg-warn'],
    b.invoice && !b.paidAt && [b.invoice.at, `Выставлен счёт № ${b.invoice.no}`, 'bg-warn'],
    state === 'expired' && [a.trialStartedAt + TRIAL_MS, 'Пробный период закончился', 'bg-warn'],
    stopped && [graceEndAt(a), 'Виджет снят с сайта', 'bg-danger'],
    a.trialStartedAt && [a.trialStartedAt, a.installed ? 'Код найден на сайте, пробный период запущен' : 'Пробный период запущен, ждём код на сайте', 'bg-brand'],
    ...edits.map((e) => [e.at, e.text, 'bg-brand']),
    !unfinished && [madeAt - 1, 'Документы собраны по ответам анкеты', 'bg-ok'],
  ].filter(Boolean).sort((x, y) => y[0] - x[0]);

  return (
    <div className="min-h-screen bg-warm text-ink lg:flex">
      <SiteSidebar domain={a.domain} active="Обзор" user={user} />

      <main id="content" tabIndex={-1} className="outline-none min-w-0 flex-1 px-5 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12 xl:px-20">
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
                {tasks.includes('banner') && (
                  <Task
                    title="Включите куки-баннер"
                    law="152-ФЗ"
                    text="Он выключен в «Виджете», и посетители не видят уведомление о куки."
                    href="/app/site/widget"
                    actionLabel="Открыть «Виджет»"
                  />
                )}
                {tasks.includes('footer') && (
                  <Task
                    title="Включите подвал сайта"
                    law="152-ФЗ"
                    text="Он выключен в «Виджете», и ссылки на документы и реквизиты не показываются посетителям."
                    href="/app/site/widget"
                    actionLabel="Открыть «Виджет»"
                  />
                )}
                {tasks.includes('consent') && (
                  <Task
                    title="Добавьте ссылку на согласие в формы сайта"
                    law={CONSENT.law}
                    text="Рядом с кнопкой отправки в каждой форме, где оставляют контакты."
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
      </main>
      {paying && (
        <SitePayDialog
          siteKey={currentSiteKey()}
          onClose={() => {
            setPaying(false);
            setA(siteAnketa(loadAnketa()));
          }}
          fallback={() => document.getElementById('content')}
        />
      )}
    </div>
  );
}
