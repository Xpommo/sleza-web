'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BriefcaseIcon,
  CheckIcon,
  ChevronDownIcon,
  GlobeIcon,
  LockIcon,
} from '../../../../components/app/AppIcons';
import { announce } from '../../../../lib/announce';
import { RING, STEP_URLS, AnketaFrame, Field, Tile, SectionHead, useFirstStep, focusFirstError } from '../_shared/AnketaChrome';
import { ANALYTICS, GA_WARNING, PLATFORMS, SPHERES, toggleOption } from '../../../../lib/anketaOptions';
import { accountUser, loadAnketa, markStepDone, saveAnketa } from '../_shared/anketaState';
import { domainTaken, openSite } from '../../site/_shared/sites';

// Кириллица — ради доменов .рф и кириллических имён на других зонах.
const DOMAIN_RE = /^(?!-)[a-z0-9а-яё-]+(\.[a-z0-9а-яё-]+)*\.([a-zа-яё]{2,}|xn--[a-z0-9-]+)$/i;

// Адрес принимаем в любом виде, в каком его копируют из браузера: с https://
// и без, с www, со страницей или меткой после домена — берём сам домен.
function normalizeDomain(v) {
  return String(v || '')
    .trim()
    .replace(/^[a-z]+:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/[/?#:].*$/, '')
    .replace(/\.$/, '')
    .toLowerCase();
}

const SECONDARY = `inline-flex h-11 items-center justify-center rounded-xl border border-line bg-white px-5 text-sm font-bold shadow-sm transition hover:border-line-2 ${RING}`;
const PRIMARY = `inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-hover ${RING}`;

// Адрес уже подключён (ревью Ивана 28.09): второй раз подключать нельзя, у
// сайта было бы два комплекта документов. Свой сайт — открыть его; чужой —
// попросить доступ у владельца того кабинета, не узнавая, кто он.
function TakenCard({ taken, headRef, onOpen, onOther, onLeave }) {
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [user, setUser] = useState({ name: '', email: '' });
  useEffect(() => setUser(accountUser()), []);
  const who = [user.name, user.email].filter(Boolean).join(', ');

  if (taken.kind === 'own') {
    const finished = taken.done >= 5;
    return (
      <div className="mt-4 rounded-xl border border-brand/25 bg-brand/[0.04] p-4 sm:p-5">
        <p ref={headRef} tabIndex={-1} className="text-[15px] font-bold outline-none">
          {taken.domain} уже есть в вашем кабинете
        </p>
        <p className="mt-1 text-[13px] leading-5 text-ink/65">
          {finished ? 'Документы и настройки этого сайта уже там.' : 'Анкета этого сайта уже начата, продолжите её.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={onOpen} className={PRIMARY}>
            {finished ? 'Открыть кабинет сайта' : 'Продолжить анкету'} <ArrowRightIcon size={16} />
          </button>
          <button type="button" onClick={onOther} className={SECONDARY}>
            Ввести другой адрес
          </button>
        </div>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="mt-4 rounded-xl border border-ok/25 bg-ok/[0.06] p-4 sm:p-5">
        <p ref={headRef} tabIndex={-1} className="flex items-center gap-2 text-[15px] font-bold outline-none">
          <CheckIcon size={16} className="text-ok" /> Запрос отправлен
        </p>
        <p className="mt-1 text-[13px] leading-5 text-ink/65">
          Когда вам откроют доступ, {taken.domain} появится в «Моих сайтах».{user.email ? ` Ответ пришлём на ${user.email}.` : ''}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={onLeave} className={PRIMARY}>
            В «Мои сайты»
          </button>
          <button type="button" onClick={onOther} className={SECONDARY}>
            Ввести другой адрес
          </button>
        </div>
      </div>
    );
  }

  function send() {
    if (!text.trim()) {
      setError('Напишите, кто вы: без этого владелец кабинета вас не узнает.');
      focusFirstError();
      return;
    }
    setSent(true);
    announce('Запрос отправлен');
  }

  return (
    <div className="mt-4 rounded-xl border border-warn/40 bg-warn/[0.06] p-4 sm:p-5">
      <p ref={headRef} tabIndex={-1} className="flex items-center gap-2 text-[15px] font-bold outline-none">
        <LockIcon size={16} className="text-warn-ink" /> {taken.domain} уже подключён в другом кабинете
      </p>
      <p className="mt-1 text-[13px] leading-5 text-ink/65">
        Второй раз подключить его нельзя: у сайта будет два комплекта документов. Попросите доступ, и мы перешлём запрос владельцу того кабинета, не раскрывая, кто он.
      </p>
      <label className="mt-4 block">
        <span className="mb-2 block text-[13px] font-bold text-ink-2">
          Сообщение владельцу кабинета<span className="text-brand"> *</span>
        </span>
        <textarea
          rows={3}
          value={text}
          placeholder="Например: я новый маркетолог компании, нужен доступ, чтобы обновлять документы."
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          aria-invalid={error ? 'true' : undefined}
          className={`w-full resize-y rounded-xl border bg-white px-4 py-3 text-[15px] leading-6 shadow-sm outline-none transition placeholder:text-ink/35 focus:border-brand focus:ring-4 focus:ring-brand/10 ${error ? 'border-danger' : 'border-line'}`}
        />
        {error && <span role="alert" className="mt-1.5 block text-[12px] font-semibold text-danger">{error}</span>}
      </label>
      {who && <p className="mt-2 text-[12px] leading-4 text-ink/60">Вместе с сообщением владелец увидит ваше имя и e-mail: {who}.</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={send} className={PRIMARY}>
          Отправить запрос
        </button>
        <button type="button" onClick={onOther} className={SECONDARY}>
          Ввести другой адрес
        </button>
      </div>
    </div>
  );
}

export default function SiteClient() {
  const router = useRouter();
  // У второго сайта это первый шаг: «Назад» — в «Мои сайты», профиля нет.
  const first = useFirstStep();

  const [domain, setDomain] = useState('');
  const [domainError, setDomainError] = useState(null);
  const [domainWhy, setDomainWhy] = useState(false);
  // Адрес уже подключён — проверяем, когда адрес дописан (уход из поля,
  // возврат на шаг, «Далее»), а не на каждую букву.
  const [taken, setTaken] = useState(null);
  const takenRef = useRef(null);
  const domainInput = useRef(null);
  // Какой адрес был у сайта до правки: уходя с занятого адреса, черновик
  // нового сайта остаётся без адреса (в «Моих сайтах» его не видно), а
  // подключённый сайт возвращает свой.
  const initial = useRef({ domain: '', confirmed: false });

  const [sphere, setSphere] = useState('');
  const [sphereError, setSphereError] = useState(null);
  const [sphereOther, setSphereOther] = useState('');
  const [sphereOtherError, setSphereOtherError] = useState(null);
  const [sphereWhy, setSphereWhy] = useState(false);

  // Ничего не выбрано на старте — то же правило, что у роли на шаге 1:
  // платформу решает клиент, а не мы.
  const [platform, setPlatform] = useState(null);
  const [platformOther, setPlatformOther] = useState('');
  const [platformError, setPlatformError] = useState(null);
  const [platformOtherError, setPlatformOtherError] = useState(null);
  const [platformWhy, setPlatformWhy] = useState(false);

  const [analytics, setAnalytics] = useState([]);
  const [analyticsOther, setAnalyticsOther] = useState('');
  const [analyticsOtherError, setAnalyticsOtherError] = useState(null);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [analyticsWhy, setAnalyticsWhy] = useState(false);

  const [restored, setRestored] = useState(false);

  // Возврат на шаг («Назад», F5, «Продолжить анкету» из списка сайтов)
  // показывает то, что уже ответили: ответы лежат в анкете, и терять их
  // между экранами нельзя. Читаем после монтирования — страница статическая,
  // и первая отрисовка должна совпасть с серверной.
  useEffect(() => {
    const a = loadAnketa();
    initial.current = { domain: a.domain || '', confirmed: (a.stepsDone || 0) >= 2 };
    if (a.domain) {
      setDomain(a.domain);
      checkTaken(a.domain, a);
    }
    if (a.sphere) setSphere(a.sphere);
    if (a.sphereOther) setSphereOther(a.sphereOther);
    if (a.platform) setPlatform(a.platform);
    if (a.platformOther) setPlatformOther(a.platformOther);
    // «Не знаю» снят 23.09 — старый ответ не должен молча считаться выбором.
    const known = (a.analytics || []).filter((v) => ANALYTICS.some((o) => o.value === v));
    if (known.length) setAnalytics(known);
    if (a.analyticsOther) setAnalyticsOther(a.analyticsOther);
    setRestored(true);
  }, []);

  // Черновик пишется на каждое изменение, а не только по «Далее»: иначе
  // «Назад» и F5 теряют всё, что набрано на этом шаге. Пишем только после
  // восстановления — иначе пустые значения первой отрисовки затрут анкету.
  useEffect(() => {
    if (restored) saveAnketa({ domain, sphere, sphereOther, platform, platformOther, analytics, analyticsOther });
  }, [restored, domain, sphere, sphereOther, platform, platformOther, analytics, analyticsOther]);

  const analyticsExclusive = ANALYTICS.filter((o) => o.exclusive).map((o) => o.value);

  function pickPlatform(item) {
    setPlatform(item);
    setPlatformError(null);
    if (item !== 'Другое') {
      setPlatformOther('');
      setPlatformOtherError(null);
    }
  }

  function checkTaken(dom, a) {
    const t = domainTaken(dom, a);
    setTaken(t ? { ...t, domain: dom } : null);
    if (t) announce(t.kind === 'own' ? `${dom} уже есть в вашем кабинете` : `${dom} уже подключён в другом кабинете`);
    return t;
  }

  function showTaken() {
    setTimeout(() => {
      takenRef.current?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      takenRef.current?.focus({ preventScroll: true });
    }, 60);
  }

  function leaveTaken() {
    saveAnketa({ domain: initial.current.confirmed ? initial.current.domain : '' });
  }

  function handleNext() {
    let ok = true;

    const dom = normalizeDomain(domain);
    if (!DOMAIN_RE.test(dom)) {
      // Пустое поле — «Укажите …» (правило 25.09), а не «похоже, это не адрес».
      setDomainError(dom ? 'Похоже, это не адрес сайта. Нужен адрес вида alfa-school.ru.' : 'Укажите адрес сайта.');
      ok = false;
    } else {
      setDomain(dom);
      setDomainError(null);
      // Занятый адрес — дальше не идём: остальные вопросы к нему не относятся.
      if (checkTaken(dom)) {
        showTaken();
        return;
      }
    }

    if (sphere === 'other' && !sphereOther.trim()) {
      setSphereOtherError('Напишите, чем вы занимаетесь: от этого зависят оговорки в документах.');
      ok = false;
    } else {
      setSphereOtherError(null);
    }
    if (!sphere) {
      setSphereError('Выберите сферу деятельности: от неё зависят формулировки в документах и список целей на следующем шаге.');
      ok = false;
    } else {
      setSphereError(null);
    }

    if (!platform) {
      setPlatformError('Выберите платформу: от неё зависит инструкция по установке на последнем шаге.');
      ok = false;
    } else if (platform === 'Другое' && !platformOther.trim()) {
      setPlatformOtherError('Напишите, на чём сделан сайт: от этого зависит инструкция по установке.');
      ok = false;
    } else {
      setPlatformError(null);
      setPlatformOtherError(null);
    }

    if (analytics.length === 0) {
      setAnalyticsError('Отметьте счётчики или «Ничего из этого нет»: от этого зависит политика обработки куки.');
      ok = false;
    } else {
      setAnalyticsError(null);
    }
    if (analytics.includes('other') && !analyticsOther.trim()) {
      setAnalyticsOtherError('Напишите, какой счётчик стоит: его нужно указать в политике обработки куки.');
      ok = false;
    } else {
      setAnalyticsOtherError(null);
    }

    if (!ok) {
      focusFirstError();
      return;
    }

    saveAnketa({ domain: dom, sphere, sphereOther, platform, platformOther, analytics, analyticsOther });
    // «Формы и сервисы» — на шаге 3, рядом с данными, которые они собирают
    // (владелец 28.09, по макету Ивана). Шаг «Данные клиентов» не пропускается
    // (решение 9.09): путь всегда из шести шагов подряд.
    markStepDone(2);
    router.push('/app/start/clients');
  }

  return (
    <AnketaFrame current={1} title="О сайте" lead={<>По четырём ответам соберём документы под этот сайт. Другие сайты подключаются отдельно.</>}>

            <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
              {/* Адрес и сфера — такими же вопросами с заголовком, как остальные
                  блоки шага (правка владельца 23.09): раньше они были подписями
                  полей, и самый важный вопрос выглядел мельче прочих. */}
              <div className="mb-8">
                <SectionHead
                  id="h-domain"
                  title="Адрес сайта"
                  required
                  whyOpen={domainWhy}
                  onWhy={() => setDomainWhy(!domainWhy)}
                  why="Адрес сайта будет в каждом документе пакета."
                />
                <Field
                  className="mt-5"
                  aria-labelledby="h-domain"
                  placeholder="site.ru"
                  icon={GlobeIcon}
                  inputMode="url"
                  autoCapitalize="none"
                  spellCheck={false}
                  inputRef={domainInput}
                  value={domain}
                  onChange={(e) => {
                    setDomain(e.target.value);
                    setDomainError(null);
                    setTaken(null);
                  }}
                  onBlur={() => {
                    // Показываем, какой адрес возьмём: https://www.… → домен.
                    const dom = normalizeDomain(domain);
                    if (DOMAIN_RE.test(dom)) {
                      setDomain(dom);
                      checkTaken(dom);
                    }
                  }}
                  error={domainError}
                />
                {taken && (
                  <TakenCard
                    key={taken.domain}
                    taken={taken}
                    headRef={takenRef}
                    onOpen={() => {
                      leaveTaken();
                      openSite(taken.site.key);
                      router.push(taken.done >= 5 ? '/app/site' : STEP_URLS[taken.done]);
                    }}
                    onOther={() => {
                      setDomain('');
                      setTaken(null);
                      setTimeout(() => domainInput.current?.focus(), 0);
                    }}
                    onLeave={() => {
                      leaveTaken();
                      router.push('/app/sites');
                    }}
                  />
                )}
              </div>

              {/* Пока адрес занят, остальные вопросы к нему не относятся. */}
              {!taken && (
              <>
              <div className="my-6 h-px bg-line" />

              {/* Сфера деятельности — сюда, а не в «Данные клиентов»: она задаёт
                  не только цели, но и оговорки в документах, есть форма или нет. */}
              <div className="mb-8">
                <SectionHead
                  id="h-sphere"
                  title="Сфера деятельности"
                  required
                  whyOpen={sphereWhy}
                  onWhy={() => setSphereWhy(!sphereWhy)}
                  why="От сферы зависят формулировки в документах: у школы это запись на занятие, у магазина — заказ."
                />
                <span className="relative mt-5 block">
                  <select
                    aria-labelledby="h-sphere"
                    value={sphere}
                    onChange={(e) => {
                      setSphere(e.target.value);
                      setSphereError(null);
                    }}
                    aria-invalid={sphereError ? 'true' : undefined}
                    className={`h-[52px] w-full appearance-none rounded-xl border bg-white px-11 text-[15px] font-medium text-ink shadow-sm outline-none transition-all hover:border-line-2 focus:border-brand focus:ring-4 focus:ring-brand/10 ${
                      sphereError ? 'border-danger' : 'border-line'
                    }`}
                  >
                    <option value="" disabled>
                      Выберите сферу деятельности
                    </option>
                    {SPHERES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <BriefcaseIcon size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" />
                  <ChevronDownIcon size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink/35" />
                </span>
                {sphereError && <p role="alert" className="mt-1.5 text-[12px] font-semibold text-danger">{sphereError}</p>}
                <div
                  aria-hidden={sphere !== 'other'}
                  // inert — чтобы Tab не заходил в скрытое поле: набранное там
                  // молча сохранялось в анкету.
                  {...(sphere !== 'other' && { inert: '' })}
                  className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                    sphere === 'other' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="pt-3">
                      <Field
                        label="Чем вы занимаетесь?" required
                        placeholder="Например: питомник растений, автосервис, типография"
                        value={sphereOther}
                        onChange={(e) => {
                          setSphereOther(e.target.value);
                          setSphereOtherError(null);
                        }}
                        error={sphereOtherError}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="my-6 h-px bg-line" />

              {/* Платформа сайта — на документы не влияет, только на
                  инструкцию установки; ничего не выбрано по умолчанию, тот
                  же принцип, что у роли и у сферы. */}
              <div className="mb-8">
                <SectionHead
                  id="h-platform"
                  title="Платформа сайта"
                  required
                  whyOpen={platformWhy}
                  onWhy={() => setPlatformWhy(!platformWhy)}
                  why="Покажем, куда именно вставить код на вашей платформе."
                />
                {/* Два столбца, как у всех карточек анкеты (владелец 23.09): в
                    четыре в ряд края не совпадали со счётчиками и формами ниже. */}
                <div className="mt-5 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-labelledby="h-platform">
                  {PLATFORMS.map((item) => (
                    <Tile key={item} title={item} radio compact selected={platform === item} onClick={() => pickPlatform(item)} />
                  ))}
                </div>
                {platform === 'Другое' && (
                  <div className="mt-3">
                    <Field
                      label="Какая платформа?" required
                      placeholder="Например: Webflow, Joomla, самописный сайт"
                      value={platformOther}
                      onChange={(e) => {
                        setPlatformOther(e.target.value);
                        setPlatformOtherError(null);
                      }}
                      error={platformOtherError}
                    />
                  </div>
                )}
                {platformError && <p role="alert" className="mt-2 text-[12px] font-semibold text-danger">{platformError}</p>}
              </div>

              <div className="my-6 h-px bg-line" />

              {/* Аналитика — можно отметить несколько счётчиков сразу (сайт
                  часто ставит и Метрику, и GA), «Ничего из этого нет» —
                  исключающий. «Не знаю» снят (владелец 23.09): вопрос — есть
                  счётчики или нет, посмотреть это можно самому. */}
              <div>
                <SectionHead
                  id="h-analytics"
                  title="Счётчики на сайте"
                  required
                  whyOpen={analyticsWhy}
                  onWhy={() => setAnalyticsWhy(!analyticsWhy)}
                  why="Счётчики, которые стоят на сайте, перечислим в «Политике обработки куки»."
                />
                <div className="mt-5 grid gap-3 sm:grid-cols-2" role="group" aria-labelledby="h-analytics">
                  {ANALYTICS.map((o) => (
                    <Tile
                      key={o.value}
                      title={o.label}
                      compact
                      selected={analytics.includes(o.value)}
                      onClick={() => {
                        setAnalytics((prev) => toggleOption(prev, o.value, analyticsExclusive));
                        setAnalyticsError(null);
                        setAnalyticsOtherError(null);
                      }}
                    />
                  ))}
                </div>
                {/* Предупреждаем в момент выбора (разбор 25.09). В кабинете
                    задачи «Уберите Google Analytics» больше нет (владелец 28.09):
                    сказать об этом — здесь. */}
                {analytics.includes('ga') && (
                  <p className="mt-3 rounded-lg bg-warn/10 px-3 py-2.5 text-[13px] leading-5 text-warn-ink">{GA_WARNING}</p>
                )}
                {analytics.includes('other') && (
                  <div className="mt-3">
                    <Field
                      label="Какой счётчик?" required
                      placeholder="Например: Top.Mail.Ru, LiveInternet"
                      value={analyticsOther}
                      onChange={(e) => {
                        setAnalyticsOther(e.target.value);
                        setAnalyticsOtherError(null);
                      }}
                      error={analyticsOtherError}
                    />
                  </div>
                )}
                {analyticsError && <p role="alert" className="mt-2 text-[12px] font-semibold text-danger">{analyticsError}</p>}
              </div>

              </>
              )}
            </section>

            {/* На телефоне эту пару повторяет нижняя панель — докрутив до конца,
                человек видел одни и те же кнопки дважды (правка владельца). */}
            <div className="mt-7 hidden gap-3 border-t border-line pt-5 lg:flex">
              <button
                data-funnel-back
                type="button"
                onClick={() => router.push(first ? '/app/sites' : '/app/start/profile')}
                className={`flex h-[52px] items-center justify-center gap-2 rounded-xl border border-line bg-white px-6 text-sm font-bold shadow-sm transition hover:border-line-2 ${RING}`}
              >
                <ArrowLeftIcon size={16} /> Назад
              </button>
              <button
                data-funnel-next
                type="button"
                onClick={handleNext}
                className={`flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-hover ${RING}`}
              >
                Далее <ArrowRightIcon size={16} />
              </button>
            </div>
    </AnketaFrame>
  );
}
