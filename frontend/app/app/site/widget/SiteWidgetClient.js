'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckIcon, ChevronDownIcon, CopyIcon, WarnIcon } from '../../../../components/app/AppIcons';
import { CookieBannerPreview, FooterPreview, Switch, ThemeSwitch, widgetSettings } from '../../../../components/app/WidgetPreviews';
import { CURRENT_USER } from '../../../../lib/appMock';
import { SITE_ID } from '../../../../lib/docPackage';
import { accountUser, loadAnketa, saveAnketa } from '../../start/_shared/anketaState';
import { RING, SiteHeader, SiteSidebar } from '../_shared/SiteChrome';
import { subState } from '../_shared/subscription';
import { siteAnketa } from '../_shared/sites';

const SNIPPET = `<script src="https://cdn.sleza.media/w.js" data-site="${SITE_ID}" async></script>`;

// Баннер и подвал — две карточки, а не одна «функция виджета»: у них
// разная юридическая роль. Подвал — постоянная публикация документов
// (152-ФЗ ст.18.1 ч.2), баннер — разовый запрос согласия на cookie.
// Выключают их по отдельности, когда у клиента уже стоит свой баннер
// или свой подвал на конструкторе.
function Block({ title, on, onToggle, offWarning, offNote, themeId, theme, onTheme, notLive, children }) {
  return (
    <section className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id={themeId} className="text-lg font-bold tracking-[-0.02em]">
            {title}
          </h2>
          {/* «Показывается» — только когда это правда: код на сайте и доступ
              не отключён. Иначе вверху экрана «посетители не видят», а тут
              зелёная галочка — одно и то же состояние двумя ответами. */}
          <p className={`mt-1 flex items-center gap-1.5 text-[13px] font-semibold ${on && !notLive ? 'text-ok' : 'text-ink/60'}`}>
            {on && !notLive ? <CheckIcon size={14} /> : null}
            {!on ? 'Выключен' : notLive || 'Показывается посетителям'}
          </p>
        </div>
        <Switch checked={on} onChange={onToggle} label={`${title}: показывать посетителям`} />
      </div>

      {on ? (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span id={`${themeId}-label`} className="text-[13px] font-semibold text-ink/60">
              Тема
            </span>
            <ThemeSwitch value={theme} onChange={onTheme} labelledby={`${themeId}-label`} />
          </div>
          <div className="mt-4">{children}</div>
        </>
      ) : (
        <div className="mt-5 space-y-3">
          <p className="rounded-xl border border-dashed border-line-2 px-4 py-5 text-center text-[13px] text-ink/60">{offNote}</p>
          <p className="flex items-start gap-2 rounded-xl bg-danger/[0.06] px-4 py-3 text-[13px] leading-5 text-ink/75">
            <WarnIcon size={16} className="mt-0.5 shrink-0 text-danger" />
            {offWarning}
          </p>
        </div>
      )}
    </section>
  );
}

export default function SiteWidgetClient() {
  const router = useRouter();
  const [site, setSite] = useState(null);
  const [user, setUser] = useState(CURRENT_USER);
  const [w, setW] = useState(null);
  const [codeOpen, setCodeOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const a = siteAnketa(loadAnketa());
    if (!a.domain) {
      router.replace('/app/sites');
      return;
    }
    setUser(accountUser(CURRENT_USER));
    setSite({ domain: a.domain, installed: Boolean(a.installed), expired: subState(a) === 'expired' });
    setW(widgetSettings(a));
  }, [router]);

  if (!site || !w) return null;

  // Тема и включённость — в анкете: шаг 5 показывает то же самое.
  function update(patch) {
    const next = { ...w, ...patch };
    setW(next);
    saveAnketa({ widget: next });
  }

  function copySnippet() {
    navigator.clipboard?.writeText(SNIPPET).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const notLive = !site.installed ? 'Появится на сайте, когда встанет код' : site.expired ? 'Снят с сайта — пробный период закончился' : null;
  return (
    <main className="min-h-screen bg-warm text-ink lg:flex">
      <SiteSidebar domain={site.domain} active="Виджет" user={user} />

      <section className="min-w-0 flex-1 px-5 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12 xl:px-20">
        <div className="mx-auto max-w-5xl">
          <SiteHeader title="Виджет" domain={site.domain} context="что видят посетители сайта">
            {site.installed && !site.expired && <p className="mt-4 max-w-2xl text-[15px] leading-6 text-ink/65">Проверили сегодня — вот что видят посетители {site.domain}.</p>}
          </SiteHeader>

          {!site.installed && (
            <section className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-warn/30 bg-warn/[0.06] p-6 sm:p-7">
              <div className="flex items-start gap-3">
                <WarnIcon size={19} className="mt-0.5 shrink-0 text-warn-ink" />
                <div>
                  <h2 className="text-lg font-bold tracking-[-0.02em]">Кода на сайте пока нет</h2>
                  <p className="mt-1 text-sm text-ink/60">Проверка занимает до 15 минут. Пока кода нет, посетители не видят ни баннер, ни подвал.</p>
                </div>
              </div>
              <Link
                href="/app/start/code"
                className={`inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1a1acc] ${RING}`}
              >
                Инструкция по установке
              </Link>
            </section>
          )}

          <Block
            title="Cookie-баннер"
            themeId="h-banner"
            on={w.bannerOn}
            onToggle={(v) => update({ bannerOn: v })}
            theme={w.bannerTheme}
            onTheme={(t) => update({ bannerTheme: t })}
            notLive={notLive}
            offNote="Баннер выключен — посетители его не видят."
            offWarning="Посетители не увидят запрос согласия перед использованием cookie."
          >
            <CookieBannerPreview theme={w.bannerTheme} />
          </Block>

          <Block
            title="Подвал сайта"
            themeId="h-footer"
            on={w.footerOn}
            onToggle={(v) => update({ footerOn: v })}
            theme={w.footerTheme}
            onTheme={(t) => update({ footerTheme: t })}
            notLive={notLive}
            offNote="Подвал сайта выключен — ссылки на документы и реквизиты не показываются."
            offWarning="Ссылки на документы и реквизиты компании перестанут быть постоянно доступны посетителям. 152-ФЗ ст.18.1 ч.2 требует, чтобы политика обработки персональных данных была опубликована и открывалась без ограничений."
          >
            <FooterPreview theme={w.footerTheme} />
          </Block>

          {/* Не «что видел посетитель» — у баннера нет интерактивного
              действия, — а «что опубликовано и когда». */}
          <p className="mt-6 text-[13px] leading-5 text-ink/60">
            Публикуем и датируем сами — если понадобится доказать, что было опубликовано и когда, ответ уже в системе, не в голове.
          </p>

          <section className="mt-6 rounded-2xl border border-line bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setCodeOpen(!codeOpen)}
              aria-expanded={codeOpen}
              aria-controls="install-code"
              className={`flex w-full items-center justify-between gap-3 px-6 py-4 text-left text-sm font-bold sm:px-7 ${RING}`}
            >
              Показать код установки
              <ChevronDownIcon size={16} className={`text-ink/40 transition-transform duration-300 ${codeOpen ? 'rotate-180' : ''}`} />
            </button>
            <div
              id="install-code"
              aria-hidden={!codeOpen}
              className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${codeOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
            >
              <div className="overflow-hidden">
                <div className="flex flex-col gap-3 px-6 pb-6 sm:flex-row sm:px-7">
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
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
