'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
} from '../../../../components/app/AppIcons';
import { DocRow, DocRowList } from '../../../../components/app/DocRows';
import { CookieBannerPreview, FooterPreview, WIDGET_DEFAULTS, widgetSettings } from '../../../../components/app/WidgetPreviews';
import { RING, AnketaFrame } from '../_shared/AnketaChrome';
import { loadAnketa, markStepDone } from '../_shared/anketaState';
import { DOCUMENTS, docOrigin, docPreview, docUrl } from '../../../../lib/docPackage';

export default function DocumentsClient() {
  const router = useRouter();
  const [domain, setDomain] = useState('alfa-school.ru');
  const [answers, setAnswers] = useState({});
  // Аккордеон: открыт один документ за раз — иначе список снова разъезжается
  // в полотно, от которого и уходили.
  const [openDoc, setOpenDoc] = useState(null);
  const [widget, setWidget] = useState(WIDGET_DEFAULTS);

  useEffect(() => {
    const saved = loadAnketa();
    if (saved.domain) setDomain(saved.domain);
    setAnswers(saved);
    setWidget(widgetSettings(saved));
  }, []);

  return (
    <AnketaFrame current={4} title="Пакет документов" lead={<>Собрали пакет под <span className="font-semibold text-ink">{domain}</span>. Откройте любой документ — покажем начало текста. Полностью он откроется на сайте после установки.</>}>

            <section className="mb-7">
              <p className="mb-3 text-sm text-ink/60">Нажмите на документ, чтобы прочитать начало.</p>
              <DocRowList>
                {DOCUMENTS.map((doc) => (
                  <DocRow
                    key={doc.id}
                    doc={doc}
                    note={docOrigin(doc, answers).line}
                    status={{ tone: 'ok', label: 'Готово' }}
                    open={openDoc === doc.id}
                    onToggle={() => setOpenDoc(openDoc === doc.id ? null : doc.id)}
                  >
                    <p className="text-[13px] leading-5 text-ink/70">{docPreview(doc, { ...answers, domain })}</p>
                    <p className="mt-3 font-mono text-[11px] text-ink/60">{docUrl(doc)} — откроется после установки</p>
                    {/* Вторая половина петли: ответ виден в документе, и из
                        документа можно вернуться ровно к тому ответу. */}
                    <p className="mt-3 text-[12px] text-ink/60">
                      {docOrigin(doc, answers).why} ·{' '}
                      <button
                        type="button"
                        onClick={() => router.push(docOrigin(doc, answers).step)}
                        className={`whitespace-nowrap rounded font-bold text-ink/60 hover:text-ink ${RING}`}
                      >
                        Изменить ответ →
                      </button>
                    </p>
                  </DocRow>
                ))}
              </DocRowList>
            </section>

            <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-[-0.02em]">Вот что появится на сайте</h2>
                  <p className="mt-1 text-sm text-ink/60">Виджет ставится одной строкой кода на следующем шаге</p>
                </div>
              </div>

              <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.09em] text-ink/60">
                cookie-баннер при первом заходе
              </p>
              <CookieBannerPreview theme={widget.bannerTheme} />

              <p className="mb-2 mt-6 font-mono text-[10.5px] uppercase tracking-[0.09em] text-ink/60">
                подвал сайта после установки
              </p>
              <FooterPreview theme={widget.footerTheme} />

              <p className="mb-2 mt-6 font-mono text-[10.5px] uppercase tracking-[0.09em] text-ink/60">
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
                <p className="mt-2 text-[12px] leading-4 text-ink/60">
                  Сами сверим страницы с реестрами регулятора — иностранные агенты, экстремистские и террористические
                  организации — и промаркируем упоминания. Реестры меняются, следить за ними не придётся.
                </p>
              </div>
            </section>

            {/* На телефоне эту пару повторяет нижняя панель — докрутив до конца,
                человек видел одни и те же кнопки дважды (правка владельца). */}
            <div className="mt-7 hidden gap-3 border-t border-line pt-5 lg:flex">
              <button
                type="button"
                onClick={() => router.push('/app/start/requisites')}
                className={`flex h-[52px] items-center justify-center gap-2 rounded-xl border border-line bg-white px-6 text-sm font-bold shadow-sm transition hover:border-line-2 ${RING}`}
              >
                <ArrowLeftIcon size={17} /> Назад
              </button>
              <button
                data-funnel-next
                data-funnel-back
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
    </AnketaFrame>
  );
}
