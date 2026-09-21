'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BurgerIcon,
  CheckIcon,
} from '../../../../components/app/AppIcons';
import { DocRow, DocRowList } from '../../../../components/app/DocRows';
import { CookieBannerPreview, FooterPreview, WIDGET_DEFAULTS, widgetSettings } from '../../../../components/app/WidgetPreviews';
import { RING, Logo, Progress, Sidebar } from '../_shared/AnketaChrome';
import { loadAnketa, markStepDone } from '../_shared/anketaState';
import { DOCUMENTS, docNote, docPreview, docUrl } from '../../../../lib/docPackage';

export default function DocumentsClient() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [domain, setDomain] = useState('alfa-school.ru');
  const [noCalls, setNoCalls] = useState(false);
  const [answers, setAnswers] = useState({});
  // Аккордеон: открыт один документ за раз — иначе список снова разъезжается
  // в полотно, от которого и уходили.
  const [openDoc, setOpenDoc] = useState(null);
  const [widget, setWidget] = useState(WIDGET_DEFAULTS);

  useEffect(() => {
    const saved = loadAnketa();
    if (saved.domain) setDomain(saved.domain);
    setNoCalls(saved.callsBase === false);
    setAnswers(saved);
    setWidget(widgetSettings(saved));
  }, []);

  return (
    <div className="min-h-screen bg-warm text-ink">
      <div className="flex min-h-screen">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} current={4} />
        {menuOpen && (
          <button aria-label="Закрыть меню" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-20 bg-ink/20 lg:hidden" />
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

            <div className="mb-7 flex items-end justify-between gap-4">
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-brand">Шаг 5 из 6</p>
                <h1 className="text-3xl font-bold tracking-[-0.04em] sm:text-[40px]">Пакет документов</h1>
                <p className="mt-3 max-w-2xl text-[15px] leading-6 text-ink/60 sm:text-[17px]">
                  Собрали пакет под <span className="font-semibold text-ink">{domain}</span>. Откройте любой документ —
                  покажем начало текста. Полностью он откроется на сайте после установки.
                </p>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-line bg-white px-3 py-2 text-xs font-semibold text-ink/55 shadow-sm sm:flex">
                <CheckIcon size={16} className="text-ok" /> Пакет собран
              </div>
            </div>

            <Progress current={4} />

            <section className="mb-7">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-[-0.02em]">Пакет документов собран</h2>
                  <p className="mt-1 text-sm text-ink/55">Пять документов, собранных по вашим ответам</p>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-ok">
                  <CheckIcon size={15} /> Всё готово
                </span>
              </div>
              <DocRowList>
                {DOCUMENTS.map((doc) => (
                  <DocRow
                    key={doc.id}
                    doc={doc}
                    note={docNote(doc, noCalls)}
                    status={{ tone: 'ok', label: 'Готово' }}
                    open={openDoc === doc.id}
                    onToggle={() => setOpenDoc(openDoc === doc.id ? null : doc.id)}
                  >
                    <p className="text-[13px] leading-5 text-ink/70">{docPreview(doc, { ...answers, domain })}</p>
                    <p className="mt-3 font-mono text-[11px] text-ink/45">{docUrl(doc)} — откроется после установки</p>
                  </DocRow>
                ))}
              </DocRowList>
            </section>

            <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-[-0.02em]">Вот что появится на сайте</h2>
                  <p className="mt-1 text-sm text-ink/55">Виджет ставится одной строкой кода на следующем шаге</p>
                </div>
              </div>

              <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.09em] text-ink/50">
                cookie-баннер при первом заходе
              </p>
              <CookieBannerPreview theme={widget.bannerTheme} />

              <p className="mb-2 mt-6 font-mono text-[10.5px] uppercase tracking-[0.09em] text-ink/50">
                подвал сайта после установки
              </p>
              <FooterPreview theme={widget.footerTheme} />

              <p className="mb-2 mt-6 font-mono text-[10.5px] uppercase tracking-[0.09em] text-ink/50">
                маркировка в тексте страниц
              </p>
              <div className="rounded-xl border border-line-2 bg-paper p-4">
                <p className="text-[14px] leading-6">
                  …в интервью для издания «Пример»
                  <span title="Маркировано Слезой" className="ml-0.5 align-super text-[10px] font-bold text-brand">
                    ✱
                  </span>{' '}
                  сказал, что…
                </p>
                <p className="mt-2 text-[12px] leading-4 text-ink/55">
                  Сами сверим страницы с реестрами регулятора — иностранные агенты, экстремистские и террористические
                  организации — и промаркируем упоминания. Реестры меняются, следить за ними не придётся.
                </p>
              </div>
            </section>

            <div className="mt-7 flex gap-3 border-t border-line pt-5">
              <button
                type="button"
                onClick={() => router.push('/app/start/requisites')}
                className={`flex h-[52px] items-center justify-center gap-2 rounded-xl border border-line bg-white px-6 text-sm font-bold shadow-sm transition hover:border-line-2 ${RING}`}
              >
                <ArrowLeftIcon size={17} /> Назад
              </button>
              <button
                type="button"
                onClick={() => {
                  markStepDone(5);
                  router.push('/app/start/code');
                }}
                className={`flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#1a1acc] ${RING}`}
              >
                Поставить код на сайт <ArrowRightIcon size={17} />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
