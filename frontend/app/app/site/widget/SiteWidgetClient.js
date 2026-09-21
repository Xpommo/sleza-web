'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckIcon, CopyIcon, MonitorIcon, ShieldCheckIcon, WarnIcon } from '../../../../components/app/AppIcons';
import { CURRENT_USER } from '../../../../lib/appMock';
import { SITE_ID } from '../../../../lib/docPackage';
import { accountUser, loadAnketa } from '../../start/_shared/anketaState';
import { RING, SiteSidebar } from '../_shared/SiteChrome';

const SNIPPET = `<script src="https://cdn.sleza.media/w.js" data-site="${SITE_ID}" async></script>`;

// «Авто» — не третья тема, а обещание: виджет подстраивается под тему
// браузера посетителя. Оно уже дано на шаге «Пакет документов», и ручной
// выбор его не отменяет, а только перекрывает.
const THEMES = ['Авто', 'Светлая', 'Тёмная'];

function ThemeSwitch({ value, onChange, labelledby }) {
  return (
    <div
      role="group"
      aria-labelledby={labelledby}
      className="relative inline-flex rounded-xl border border-line bg-warm p-1"
    >
      <div
        className="absolute bottom-1 top-1 rounded-lg bg-white shadow-sm transition-all duration-300 motion-reduce:transition-none"
        style={{ width: `calc((100% - 8px) / 3)`, left: `calc(4px + ${THEMES.indexOf(value)} * (100% - 8px) / 3)` }}
      />
      {THEMES.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          aria-pressed={value === t}
          className={`relative z-10 w-[86px] rounded-lg py-2 text-[13px] font-semibold transition-colors ${RING} ${
            value === t ? 'text-ink' : 'text-ink/50 hover:text-ink/75'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function CookiePreview({ dark }) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-xl p-5 transition-colors duration-300 motion-reduce:transition-none sm:flex-row sm:items-center ${
        dark ? 'bg-ink text-white' : 'border border-line-2 bg-white text-ink'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
          dark ? 'bg-white/10 text-white' : 'bg-brand/[0.08] text-brand'
        }`}
      >
        <ShieldCheckIcon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-bold">Сайт использует cookie</h4>
        <p className={`mt-1.5 text-[12px] leading-4 transition-colors duration-300 ${dark ? 'text-white/70' : 'text-ink/60'}`}>
          Нужны для аналитики и корректной работы сервисов на сайте. Нажимая «Принять и продолжить», вы соглашаетесь
          с условиями обработки cookie. Отключить их можно в настройках браузера.
        </p>
        <p className={`mt-2 text-[11px] transition-colors duration-300 ${dark ? 'text-white/50' : 'text-ink/45'}`}>
          Политика обработки cookie →
        </p>
      </div>
      <span
        className={`shrink-0 rounded-lg px-4 py-2.5 text-xs font-bold transition-colors duration-300 ${
          dark ? 'bg-white text-ink' : 'bg-ink text-white'
        }`}
      >
        Принять и продолжить
      </span>
    </div>
  );
}

const PILLS = ['Cookie', 'Персональные данные', 'Реклама', 'Маркировка'];

function FooterPreview({ dark }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-4 py-3 transition-colors duration-300 motion-reduce:transition-none ${
        dark ? 'bg-ink text-white' : 'border border-line-2 bg-white text-ink'
      }`}
    >
      <span className="flex items-center gap-2 text-[13px] font-bold">
        <span className={`h-2 w-3 rounded-sm transition-colors duration-300 ${dark ? 'bg-brand-soft' : 'bg-brand'}`} />
        Слеза
      </span>
      <span className={`h-4 w-px transition-colors duration-300 ${dark ? 'bg-white/20' : 'bg-line-2'}`} />
      {PILLS.map((p) => (
        <span
          key={p}
          className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors duration-300 ${
            dark ? 'border-white/20 text-white/80' : 'border-line text-ink/65'
          }`}
        >
          {p}
        </span>
      ))}
      <span className={`ml-auto text-[12px] font-semibold transition-colors duration-300 ${dark ? 'text-white/70' : 'text-ink/55'}`}>
        Реквизиты
      </span>
    </div>
  );
}

function Block({ children }) {
  return (
    <section className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7">{children}</section>
  );
}

export default function SiteWidgetClient() {
  const router = useRouter();
  const [site, setSite] = useState(null);
  const [user, setUser] = useState(CURRENT_USER);
  const [cookieTheme, setCookieTheme] = useState('Авто');
  const [footerTheme, setFooterTheme] = useState('Авто');
  const [systemDark, setSystemDark] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const a = loadAnketa();
    if (!a.domain) {
      router.replace('/app/sites');
      return;
    }
    setUser(accountUser(CURRENT_USER));
    setSite({ domain: a.domain, installed: Boolean(a.installed) });
  }, [router]);

  // В режиме «Авто» превью показывает ровно то, что увидит посетитель с
  // такой же темой браузера, — иначе «авто» пришлось бы объяснять словами.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const sync = () => setSystemDark(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  if (!site) return null;

  const resolve = (t) => (t === 'Авто' ? systemDark : t === 'Тёмная');
  const autoNote = `Подстраивается под тему браузера посетителя — здесь показан ${systemDark ? 'тёмный' : 'светлый'} вариант.`;

  function copySnippet() {
    navigator.clipboard?.writeText(SNIPPET).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="min-h-screen bg-warm text-ink lg:flex">
      <SiteSidebar domain={site.domain} active="Виджет" user={user} />

      <section className="min-w-0 flex-1 px-5 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12 xl:px-20">
        <div className="mx-auto max-w-5xl">
          <header>
            <p className="mb-3 font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-brand">{site.domain}</p>
            <h1 className="text-[28px] font-bold tracking-[-0.045em] sm:text-[36px]">Виджет</h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-6 text-ink/55">
              Одна строка кода на сайте показывает cookie-баннер, ставит внизу страниц подвал со ссылками на документы
              и маркирует упоминания из реестров.
            </p>
          </header>

          {/* Состояние скрипта — первым: настройки ниже имеют смысл, только
              если код на сайте действительно стоит. */}
          <section
            className={`mt-8 rounded-2xl border p-6 shadow-sm sm:p-7 ${
              site.installed ? 'border-line bg-white' : 'border-warn/30 bg-warn/[0.06]'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    site.installed ? 'bg-ok/10 text-ok' : 'bg-warn/15 text-warn'
                  }`}
                >
                  {site.installed ? <CheckIcon size={19} /> : <WarnIcon size={19} />}
                </span>
                <div>
                  <h2 className="text-lg font-bold tracking-[-0.02em]">
                    {site.installed ? 'Код на сайте' : 'Кода на сайте пока нет'}
                  </h2>
                  <p className="mt-1 text-sm text-ink/55">
                    {site.installed
                      ? 'Проверяем сами — если строка пропадёт с сайта, напишем письмом.'
                      : 'Проверка занимает до 15 минут. Пока кода нет, посетители не видят ни баннер, ни подвал.'}
                  </p>
                </div>
              </div>
              {!site.installed && (
                <Link
                  href="/app/start/code"
                  className={`inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1a1acc] ${RING}`}
                >
                  Инструкция по установке
                </Link>
              )}
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <pre className="min-w-0 flex-1 overflow-x-auto rounded-xl bg-ink px-4 py-3.5 font-mono text-[12px] leading-5 text-white/85">
                <code>{SNIPPET}</code>
              </pre>
              <button
                type="button"
                onClick={copySnippet}
                className={`inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 text-sm font-bold transition hover:border-brand hover:text-brand ${RING}`}
              >
                {copied ? <CheckIcon size={16} className="text-ok" /> : <CopyIcon size={16} />}
                {copied ? 'Скопировано' : 'Скопировать код'}
              </button>
            </div>
          </section>

          <Block>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-ink/45">Cookie-баннер</p>
                <h2 id="h-cookie-theme" className="mt-2 text-2xl font-bold tracking-[-0.04em]">
                  Первый заход на сайт
                </h2>
              </div>
              <ThemeSwitch value={cookieTheme} onChange={setCookieTheme} labelledby="h-cookie-theme" />
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-5 text-ink/55">
              {/* Кнопки «Отклонить» в баннере нет намеренно: 152-ФЗ не требует
                  отказа для простого уведомления, а обещать управление,
                  которого нет, нельзя. */}
              Показывается один раз до первого согласия. Текст менять нельзя — он должен совпадать с политикой
              обработки cookie, которую открывает ссылка внизу.
            </p>
            <div className="mt-5 rounded-xl border border-line bg-paper p-4">
              <CookiePreview dark={resolve(cookieTheme)} />
              <p className="mt-3 text-[12px] text-ink/50">
                {cookieTheme === 'Авто' ? autoNote : `Всегда ${cookieTheme.toLowerCase()} тема, независимо от браузера посетителя.`}
              </p>
            </div>
          </Block>

          <Block>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-ink/45">Подвал</p>
                <h2 id="h-footer-theme" className="mt-2 text-2xl font-bold tracking-[-0.04em]">
                  Внизу каждой страницы
                </h2>
              </div>
              <ThemeSwitch value={footerTheme} onChange={setFooterTheme} labelledby="h-footer-theme" />
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-5 text-ink/55">
              Ссылки на документы и реквизиты по 149-ФЗ. Посетитель управляет здесь своими согласиями — на обработку
              данных и на рекламные сообщения.
            </p>
            <div className="mt-5 rounded-xl border border-line bg-paper p-4">
              <FooterPreview dark={resolve(footerTheme)} />
              <p className="mt-3 text-[12px] text-ink/50">
                {footerTheme === 'Авто' ? autoNote : `Всегда ${footerTheme.toLowerCase()} тема, независимо от браузера посетителя.`}
              </p>
            </div>
          </Block>

          <Block>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/[0.08] text-brand">
                <MonitorIcon size={19} />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink/45">Маркировка</p>
                <h2 className="mt-1 text-2xl font-bold tracking-[-0.04em]">В тексте страниц</h2>
              </div>
              <span className="ml-auto shrink-0 rounded-full bg-warm px-3 py-1.5 text-[11px] font-bold text-ink/55">
                Без настроек
              </span>
            </div>
            <div className="mt-5 rounded-xl border border-line bg-paper p-4">
              <p className="text-[14px] leading-6">
                …в интервью для издания «Пример»
                <span title="Маркировано Слезой" className="ml-0.5 align-super text-[10px] font-bold text-brand">
                  ✱
                </span>{' '}
                сказал, что…
              </p>
              <p className="mt-2 text-[12px] leading-4 text-ink/55">
                Сверяем страницы с реестрами регулятора — иностранные агенты, экстремистские и террористические
                организации — и маркируем упоминания. Выключателя нет: это требование закона, а не настройка.
              </p>
            </div>
          </Block>
        </div>
      </section>
    </main>
  );
}
