'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BriefcaseIcon,
  BurgerIcon,
  ChevronDownIcon,
  GlobeIcon,
  ShieldCheckIcon,
} from '../../../../components/app/AppIcons';
import { CURRENT_USER } from '../../../../lib/appMock';
import { RING, Logo, Progress, Sidebar, Field, Tile, WhyToggle, SectionHead } from '../_shared/AnketaChrome';
import { saveAnketa } from '../_shared/anketaState';

// Тот же список и тот же порядок опций, что в анкете (cabinet-mvp.html):
// «regulated» нигде сейчас не показывается (владелец снял оговорку 8
// сентября) — поле оставлено, чтобы вернуть предупреждение без повторного
// разбора, когда до этого дойдёт очередь.
const SPHERES = [
  { value: 'school', label: 'Онлайн-школа, курсы, репетиторство' },
  { value: 'kids', label: 'Детский центр, кружки, секции', regulated: true },
  { value: 'bizserv', label: 'Услуги для бизнеса (консалтинг, бухгалтерия, юр. услуги)' },
  { value: 'homeserv', label: 'Бытовые услуги (ремонт, клининг)' },
  { value: 'beauty', label: 'Красота и здоровье (салон, барбершоп, фитнес)' },
  { value: 'medicine', label: 'Медицина, клиники', regulated: true },
  { value: 'shop', label: 'Интернет-магазин' },
  { value: 'food', label: 'Кафе, ресторан, доставка еды' },
  { value: 'realty', label: 'Недвижимость' },
  { value: 'finance', label: 'Финансы, страхование', regulated: true },
  { value: 'media', label: 'СМИ, онлайн-издание', regulated: true },
  { value: 'it', label: 'IT, SaaS, разработка' },
  { value: 'manuf', label: 'Производство' },
  { value: 'other', label: 'Другое' },
];

const PLATFORMS = ['Тильда', 'WordPress', 'Битрикс', 'Другое'];

// GA-специфика (отдельное предупреждение о риске) — нерешённый вопрос из
// разбора: реального документа, который бы называл счётчик, в коде нет, а
// текущая подсказка это обещает. Оставляю как в макете, не подменяю решение.
const ANALYTICS = [
  { value: 'metrika', label: 'Яндекс.Метрика', hint: 'опишем её в политике обработки cookie' },
  { value: 'ga', label: 'Google Analytics', hint: 'опишем её в политике и предупредим о рисках' },
  { value: 'none', label: 'Ничего из этого нет', hint: 'счётчиков на сайте не стоит', exclusive: true },
  { value: 'unknown', label: 'Не знаю', hint: 'в политике опишем аналитические cookie, не называя счётчик', exclusive: true },
];

const FEATURES = [
  { value: 'order', label: 'Оплата и оформление заказа на сайте', hint: 'в политику добавим обработку данных заказа и оплаты' },
  { value: 'cabinet', label: 'Личный кабинет', hint: 'согласие встанет галочкой в форму регистрации' },
  { value: 'chat', label: 'Чаты, всплывающие формы, обратный звонок', hint: 'текст согласия встанет под кнопкой отправки в каждой форме' },
  { value: 'none', label: 'Ничего из этого нет', hint: 'согласие в формы не понадобится, политика и cookie-баннер нужны всё равно', exclusive: true },
];

const DOMAIN_RE = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;

function normalizeDomain(v) {
  return String(v || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/.*$/, '')
    .toLowerCase();
}

// Общая логика мульти-выбора с «исключающими» пунктами (Ничего/Не знаю):
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
  const [menuOpen, setMenuOpen] = useState(false);

  const [domain, setDomain] = useState('');
  const [domainError, setDomainError] = useState(null);
  const [domainWhy, setDomainWhy] = useState(false);

  const [sphere, setSphere] = useState('');
  const [sphereError, setSphereError] = useState(null);
  const [sphereWhy, setSphereWhy] = useState(false);

  // Ничего не выбрано на старте — то же правило, что у роли на шаге 1:
  // платформу решает клиент, а не мы.
  const [platform, setPlatform] = useState(null);
  const [platformOther, setPlatformOther] = useState('');
  const [platformError, setPlatformError] = useState(null);
  const [platformOtherError, setPlatformOtherError] = useState(null);
  const [platformWhy, setPlatformWhy] = useState(false);

  const [analytics, setAnalytics] = useState([]);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [analyticsWhy, setAnalyticsWhy] = useState(false);

  const [features, setFeatures] = useState([]);
  const [featuresError, setFeaturesError] = useState(null);
  const [featuresWhy, setFeaturesWhy] = useState(false);

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
      setDomainError('Похоже, это не адрес сайта. Нужен домен вида alfa-school.ru — без http:// и без продолжения после косой черты.');
      ok = false;
    } else {
      setDomain(dom);
      setDomainError(null);
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
      setAnalyticsError('Отметьте счётчики, «Ничего из этого нет» или «Не знаю» — от этого зависит текст политики обработки cookie.');
      ok = false;
    } else {
      setAnalyticsError(null);
    }

    if (features.length === 0) {
      setFeaturesError('Отметьте, что есть на сайте, или «Ничего из этого нет» — от этого зависит, куда встанет согласие.');
      ok = false;
    } else {
      setFeaturesError(null);
    }

    if (!ok) return;

    saveAnketa({ domain: dom, sphere, platform, platformOther, analytics, features });

    // «Формы и сервисы» — единственный вопрос шага, который ветвит путь:
    // если сайт вообще не собирает контакты, спрашивать на следующем шаге
    // про цели сбора и звонки по базе нечего, и он пропускается целиком.
    if (features.length === 1 && features[0] === 'none') {
      router.push('/app/start/documents');
      return;
    }
    router.push('/app/start/clients');
  }

  return (
    <div className="min-h-screen bg-warm text-ink">
      <div className="flex min-h-screen">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} current={1} />
        {menuOpen && (
          <button
            aria-label="Закрыть меню"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-20 bg-ink/20 lg:hidden"
          />
        )}
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1000px] px-5 py-5 sm:px-8 sm:py-8 lg:px-14 lg:py-10">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Logo />
              <button
                onClick={() => setMenuOpen(true)}
                className={`rounded-lg border border-line bg-white p-2 ${RING}`}
                aria-label="Открыть меню"
              >
                <BurgerIcon size={20} />
              </button>
            </div>

            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-brand">Шаг 2 из 6</p>
                <h1 className="text-3xl font-bold tracking-[-0.04em] sm:text-[40px]">О сайте</h1>
                <p className="mt-3 max-w-2xl text-[15px] leading-6 text-ink/60 sm:text-[17px]">
                  Сфера, адрес, платформа, аналитика и формы на сайте. Пять вопросов.
                </p>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-line bg-white px-3 py-2 text-xs font-semibold text-ink/55 shadow-sm sm:flex">
                <ShieldCheckIcon size={16} className="text-brand" /> Защищённая форма
              </div>
            </div>

            <Progress current={1} />

            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">
                {CURRENT_USER.name.slice(0, 1)}
              </div>
              <div>
                <p className="font-bold">{CURRENT_USER.name}</p>
                <p className="text-sm text-ink/55">вход через Telegram</p>
              </div>
            </div>

            <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-8">
              {/* Адрес сайта — первым: это самое «о сайте», что вообще есть. */}
              <div className="mb-8">
                <Field
                  label="Адрес сайта"
                  required
                  placeholder="alfa-school.ru"
                  icon={GlobeIcon}
                  value={domain}
                  onChange={(e) => {
                    setDomain(e.target.value);
                    setDomainError(null);
                  }}
                  error={domainError}
                />
                <WhyToggle open={domainWhy} onToggle={() => setDomainWhy(!domainWhy)}>
                  Адрес попадёт в документы и в код, который вы поставите на сайт.
                </WhyToggle>
              </div>

              {/* Сфера деятельности — сюда, а не в «Данные клиентов»: раньше
                  жила там ради соседства с целями сбора, но тот шаг
                  пропускается целиком, если на сайте нет форм — сферу в этом
                  случае никогда бы не спросили, а она задаёт не только цели,
                  но и оговорки в документах независимо от того, есть форма
                  или нет. */}
              <div className="mb-8">
                <label className="block">
                  <span className="mb-1 flex items-center gap-1 text-[13px] font-bold text-ink-2">
                    Сфера деятельности <span className="text-brand">*</span>
                  </span>
                  <span className="mb-2 block text-[13px] text-ink/55">
                    Под неё подберём список целей на следующем шаге и оговорки в документах.
                  </span>
                  <span className="relative block">
                    <select
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
                  {sphereError && <span className="mt-1.5 block text-[12.5px] font-semibold text-danger">{sphereError}</span>}
                </label>
                <WhyToggle open={sphereWhy} onToggle={() => setSphereWhy(!sphereWhy)}>
                  Сфера определит список целей на следующем шаге «Данные клиентов» — у интернет-магазина и у салона
                  он разный. Она же задаёт особые оговорки в документах: например, про обработку данных
                  несовершеннолетних, если вы работаете с детьми.
                </WhyToggle>
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
                  why="Нужна для точной инструкции по установке кода на последнем шаге."
                />
                <div className="mt-5 grid gap-3 sm:grid-cols-4" role="group" aria-labelledby="h-platform">
                  {PLATFORMS.map((item) => (
                    <Tile key={item} title={item} selected={platform === item} onClick={() => pickPlatform(item)} />
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
                {platformError && <p className="mt-2 text-[12.5px] font-semibold text-danger">{platformError}</p>}
              </div>

              <div className="my-6 h-px bg-line" />

              {/* Аналитика — можно отметить несколько счётчиков сразу (сайт
                  часто ставит и Метрику, и GA), «Ничего»/«Не знаю» —
                  исключающие. */}
              <div className="mb-8">
                <SectionHead
                  id="h-analytics"
                  title="Аналитика на сайте"
                  required
                  hint="Счётчики посетителей. Если не знаете, что установлено — так и отметьте."
                  whyOpen={analyticsWhy}
                  onWhy={() => setAnalyticsWhy(!analyticsWhy)}
                  why="Политика обработки cookie должна описывать то, что на сайте происходит на самом деле: какие счётчики считают посетителей. Отдельно про Google Analytics — он отправляет данные посетителей на зарубежные серверы, и по 152-ФЗ это отдельный риск, о котором стоит поговорить."
                />
                <div className="mt-5 grid gap-3 sm:grid-cols-2" role="group" aria-labelledby="h-analytics">
                  {ANALYTICS.map((o) => (
                    <Tile
                      key={o.value}
                      title={o.label}
                      description={o.hint}
                      selected={analytics.includes(o.value)}
                      onClick={() => {
                        setAnalytics((prev) => toggleOption(prev, o.value, analyticsExclusive));
                        setAnalyticsError(null);
                      }}
                    />
                  ))}
                </div>
                {analyticsError && <p className="mt-2 text-[12.5px] font-semibold text-danger">{analyticsError}</p>}
              </div>

              <div className="my-6 h-px bg-line" />

              {/* Формы и сервисы — три факта: заказ/оплата, авторизация,
                  сторонний скрипт собирает контакты. Список нарочно короткий. */}
              <div>
                <SectionHead
                  id="h-features"
                  title="Формы и сервисы на сайте"
                  required
                  hint="Что посетитель может сделать на сайте. Под каждым пунктом написано, куда встанет согласие."
                  whyOpen={featuresWhy}
                  onWhy={() => setFeaturesWhy(!featuresWhy)}
                  why="Отмеченное попадёт в политику обработки cookie как данные, которые собирают формы и чаты, и определит, где на сайте встанет текст согласия — галочкой в форме регистрации, строкой под кнопкой отправки или нигде, если сайт контакты не собирает."
                />
                <div className="mt-5 grid gap-3 sm:grid-cols-2" role="group" aria-labelledby="h-features">
                  {FEATURES.map((o) => (
                    <Tile
                      key={o.value}
                      title={o.label}
                      description={o.hint}
                      selected={features.includes(o.value)}
                      onClick={() => {
                        setFeatures((prev) => toggleOption(prev, o.value, featuresExclusive));
                        setFeaturesError(null);
                      }}
                    />
                  ))}
                </div>
                {featuresError && <p className="mt-2 text-[12.5px] font-semibold text-danger">{featuresError}</p>}
              </div>

              <div className="mt-7 flex gap-3 border-t border-line pt-5">
                <button
                  type="button"
                  onClick={() => router.push('/app/start/profile')}
                  className={`flex h-[52px] items-center justify-center gap-2 rounded-xl border border-line bg-white px-6 text-sm font-bold shadow-sm transition hover:border-line-2 ${RING}`}
                >
                  <ArrowLeftIcon size={16} /> Назад
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className={`flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#1a1acc] ${RING}`}
                >
                  Далее <ArrowRightIcon size={16} />
                </button>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
