'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BriefcaseIcon,
  ChevronDownIcon,
  GlobeIcon,
} from '../../../../components/app/AppIcons';
import { CURRENT_USER } from '../../../../lib/appMock';
import { RING, AnketaFrame, Field, Tile, SectionHead, useFirstStep } from '../_shared/AnketaChrome';
import { ANALYTICS, FEATURES, PLATFORMS, SPHERES } from '../../../../lib/anketaOptions';
import { loadAnketa, markStepDone, saveAnketa } from '../_shared/anketaState';

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

// Общая логика мульти-выбора с «исключающим» пунктом («Ничего из этого нет»):
// обычный пункт снимает исключающие, исключающий очищает всё остальное.
function toggleOption(prev, value, exclusiveValues) {
  if (exclusiveValues.includes(value)) {
    return prev.includes(value) ? [] : [value];
  }
  const next = prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value];
  return next.filter((v) => !exclusiveValues.includes(v));
}

export default function SiteClient() {
  const router = useRouter();
  // У второго сайта это первый шаг: «Назад» — в «Мои сайты», профиля нет.
  const first = useFirstStep();

  const [domain, setDomain] = useState('');
  const [domainError, setDomainError] = useState(null);
  const [domainWhy, setDomainWhy] = useState(false);

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

  const [features, setFeatures] = useState([]);
  const [restored, setRestored] = useState(false);
  const [featuresError, setFeaturesError] = useState(null);
  const [featuresWhy, setFeaturesWhy] = useState(false);

  // Возврат на шаг («Назад», F5, «Продолжить анкету» из списка сайтов)
  // показывает то, что уже ответили: ответы лежат в анкете, и терять их
  // между экранами нельзя. Читаем после монтирования — страница статическая,
  // и первая отрисовка должна совпасть с серверной.
  useEffect(() => {
    const a = loadAnketa();
    if (a.domain) setDomain(a.domain);
    if (a.sphere) setSphere(a.sphere);
    if (a.sphereOther) setSphereOther(a.sphereOther);
    if (a.platform) setPlatform(a.platform);
    if (a.platformOther) setPlatformOther(a.platformOther);
    // «Не знаю» снят 23.09 — старый ответ не должен молча считаться выбором.
    const known = (a.analytics || []).filter((v) => ANALYTICS.some((o) => o.value === v));
    if (known.length) setAnalytics(known);
    if (a.analyticsOther) setAnalyticsOther(a.analyticsOther);
    if (a.features?.length) setFeatures(a.features);
    setRestored(true);
  }, []);

  // Черновик пишется на каждое изменение, а не только по «Далее»: иначе
  // «Назад» и F5 теряют всё, что набрано на этом шаге. Пишем только после
  // восстановления — иначе пустые значения первой отрисовки затрут анкету.
  useEffect(() => {
    if (restored) saveAnketa({ domain, sphere, sphereOther, platform, platformOther, analytics, analyticsOther, features });
  }, [restored, domain, sphere, sphereOther, platform, platformOther, analytics, analyticsOther, features]);

  const analyticsExclusive = ANALYTICS.filter((o) => o.exclusive).map((o) => o.value);
  const featuresExclusive = FEATURES.filter((o) => o.exclusive).map((o) => o.value);

  function pickPlatform(item) {
    setPlatform(item);
    setPlatformError(null);
    if (item !== 'Другое') {
      setPlatformOther('');
      setPlatformOtherError(null);
    }
  }

  function handleNext() {
    let ok = true;

    const dom = normalizeDomain(domain);
    if (!DOMAIN_RE.test(dom)) {
      setDomainError('Похоже, это не адрес сайта — нужен вида alfa-school.ru.');
      ok = false;
    } else {
      setDomain(dom);
      setDomainError(null);
    }

    if (sphere === 'other' && !sphereOther.trim()) {
      setSphereOtherError('Напишите, чем вы занимаетесь — от этого зависят оговорки в документах.');
      ok = false;
    } else {
      setSphereOtherError(null);
    }
    if (!sphere) {
      setSphereError('Выберите сферу деятельности — от неё зависят формулировки в документах и список целей на следующем шаге.');
      ok = false;
    } else {
      setSphereError(null);
    }

    if (!platform) {
      setPlatformError('Выберите платформу — от неё зависит инструкция по установке на последнем шаге.');
      ok = false;
    } else if (platform === 'Другое' && !platformOther.trim()) {
      setPlatformOtherError('Напишите, на чём сделан сайт — от этого зависит инструкция по установке.');
      ok = false;
    } else {
      setPlatformError(null);
      setPlatformOtherError(null);
    }

    if (analytics.length === 0) {
      setAnalyticsError('Отметьте счётчики или «Ничего из этого нет» — от этого зависит политика обработки куки.');
      ok = false;
    } else {
      setAnalyticsError(null);
    }
    if (analytics.includes('other') && !analyticsOther.trim()) {
      setAnalyticsOtherError('Напишите, какой счётчик стоит, — его нужно указать в политике обработки куки.');
      ok = false;
    } else {
      setAnalyticsOtherError(null);
    }

    if (features.length === 0) {
      setFeaturesError('Отметьте, что есть на сайте, или «Ничего из этого нет» — от этого зависит согласие на обработку данных.');
      ok = false;
    } else {
      setFeaturesError(null);
    }

    if (!ok) return;

    saveAnketa({ domain: dom, sphere, sphereOther, platform, platformOther, analytics, analyticsOther, features });

    // «Формы и сервисы» — единственный вопрос шага, который ветвит путь:
    // если сайт вообще не собирает контакты, спрашивать на следующем шаге
    // про цели сбора и звонки по базе нечего, и он пропускается целиком.
    // Ответ «Ничего из этого нет» шаг «Данные клиентов» не пропускает —
    // решение 9 сентября: исчезающий шаг и прыгающий счётчик («Шаг 2 из 6»
    // → «Шаг 4 из 6») читаются как сбой, а согласие на рассылки выдаётся в
    // любом случае. Путь всегда из шести шагов подряд.
    markStepDone(2);
    router.push('/app/start/clients');
  }

  return (
    <AnketaFrame current={1} title="О сайте" lead={<>Адрес, сфера, платформа, счётчики и формы на сайте. Пять вопросов.</>}>

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
                  placeholder="alfa-school.ru"
                  icon={GlobeIcon}
                  inputMode="url"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={domain}
                  onChange={(e) => {
                    setDomain(e.target.value);
                    setDomainError(null);
                  }}
                  onBlur={() => {
                    // Показываем, какой адрес возьмём: https://www.… → домен.
                    const dom = normalizeDomain(domain);
                    if (DOMAIN_RE.test(dom)) setDomain(dom);
                  }}
                  error={domainError}
                />
              </div>

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
                  why="По сфере подберём варианты на шаге «Данные клиентов» — для чего вы собираете контакты: у школы это запись на занятие, у магазина — заказ."
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
                {sphereError && <p className="mt-1.5 text-[12px] font-semibold text-danger">{sphereError}</p>}
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
                        label="Чем вы занимаетесь?"
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
                  why="В конце покажем по шагам, как подключить документы на вашей платформе."
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
                      label="Какая платформа?"
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
                {platformError && <p className="mt-2 text-[12px] font-semibold text-danger">{platformError}</p>}
              </div>

              <div className="my-6 h-px bg-line" />

              {/* Аналитика — можно отметить несколько счётчиков сразу (сайт
                  часто ставит и Метрику, и GA), «Ничего из этого нет» —
                  исключающий. «Не знаю» снят (владелец 23.09): вопрос — есть
                  счётчики или нет, посмотреть это можно самому. */}
              <div className="mb-8">
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
                {analytics.includes('other') && (
                  <div className="mt-3">
                    <Field
                      label="Какой счётчик?"
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
                {analyticsError && <p className="mt-2 text-[12px] font-semibold text-danger">{analyticsError}</p>}
              </div>

              <div className="my-6 h-px bg-line" />

              {/* Формы и сервисы — три факта: заказ/оплата, авторизация,
                  сторонний скрипт собирает контакты. Список нарочно короткий. */}
              <div>
                <SectionHead
                  id="h-features"
                  title="Формы и сервисы на сайте"
                  required
                  whyOpen={featuresWhy}
                  onWhy={() => setFeaturesWhy(!featuresWhy)}
                  why="Нужно для документа «Согласие на обработку персональных данных» — оно требуется там, где сайт собирает контакты."
                />
                <div className="mt-5 grid gap-3 sm:grid-cols-2" role="group" aria-labelledby="h-features">
                  {FEATURES.map((o) => (
                    <Tile
                      key={o.value}
                      title={o.label}
                      compact
                      selected={features.includes(o.value)}
                      onClick={() => {
                        setFeatures((prev) => toggleOption(prev, o.value, featuresExclusive));
                        setFeaturesError(null);
                      }}
                    />
                  ))}
                </div>
                {featuresError && <p className="mt-2 text-[12px] font-semibold text-danger">{featuresError}</p>}
              </div>
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
                className={`flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#1a1acc] ${RING}`}
              >
                Далее <ArrowRightIcon size={16} />
              </button>
            </div>
    </AnketaFrame>
  );
}
