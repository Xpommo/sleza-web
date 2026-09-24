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
import { DOCUMENTS, MARK, docOrigin, docPreview } from '../../../../lib/docPackage';
import RequisitesModal from '../../site/_shared/RequisitesModal';
import AnswerModal, { QUESTION_TITLES } from './AnswerModal';

// Превью с выделенными ответами: свои данные внутри юридического текста —
// то, что показывает «документ собран под вас», а не шаблон (владелец 23.09:
// голое начало документа ничего не давало).
function MarkedText({ text }) {
  const parts = String(text).split(MARK);
  return parts.map((part, i) =>
    i % 2 ? (
      <mark key={i} className="rounded bg-brand/10 px-0.5 font-semibold text-ink">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export default function DocumentsClient() {
  const router = useRouter();
  const [domain, setDomain] = useState('alfa-school.ru');
  const [answers, setAnswers] = useState({});
  // Аккордеон: открыт один документ за раз — иначе список снова разъезжается
  // в полотно, от которого и уходили.
  const [openDoc, setOpenDoc] = useState(null);
  const [widget, setWidget] = useState(WIDGET_DEFAULTS);
  // Какой ответ правят сейчас — окно с одним этим вопросом.
  const [editing, setEditing] = useState(null);
  const reload = () => setAnswers(loadAnketa());

  useEffect(() => {
    const saved = loadAnketa();
    if (saved.domain) setDomain(saved.domain);
    setAnswers(saved);
    setWidget(widgetSettings(saved));
  }, []);

  return (
    <AnketaFrame current={4} title="Пакет документов" lead={<>Пять документов для <span className="font-semibold text-ink">{domain}</span> собраны по вашим ответам — в тексте они выделены. Целиком документы появятся на сайте после установки кода.</>}>

            <section className="mb-7">
              <DocRowList withStatus={false}>
                {DOCUMENTS.map((doc) => (
                  <DocRow
                    key={doc.id}
                    doc={doc}
                    note={docOrigin(doc, answers).line}
                    open={openDoc === doc.id}
                    onToggle={() => setOpenDoc(openDoc === doc.id ? null : doc.id)}
                  >
                    <p className="text-[13px] leading-6 text-ink/70">
                      <MarkedText text={docPreview(doc, { ...answers, domain })} />
                    </p>
                    {/* Вторая половина петли: ответ виден в документе, и прямо
                        отсюда правится ровно тот ответ, из которого взяты данные,
                        — окном, без возврата в анкету (владелец 24.09). */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-ink/60">
                      <span>Изменить ответ:</span>
                      {docOrigin(doc, answers).sources.map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setEditing(k)}
                          className={`rounded-lg border border-line bg-white px-2.5 py-1 font-semibold text-ink/80 transition hover:border-brand hover:text-brand ${RING}`}
                        >
                          {QUESTION_TITLES[k]}
                        </button>
                      ))}
                    </div>
                  </DocRow>
                ))}
              </DocRowList>
            </section>

            <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
              {/* Подписи превью — обычными подзаголовками: серые моно-капсы
                  сливались с фоном; «после установки» у подвала лишнее — и
                  так ясно, что сейчас его на сайте нет (владелец 23.09).
                  Подсказка про тему — одна на раздел, а не под каждым превью. */}
              <div className="mb-6">
                <h2 className="text-xl font-bold tracking-[-0.02em]">Вот что появится на сайте</h2>
                {(widget.bannerTheme === 'Авто' || widget.footerTheme === 'Авто') && (
                  <p className="mt-1 text-sm text-ink/60">Цвета подстроятся под тему браузера посетителя — здесь показан тёмный вариант.</p>
                )}
              </div>

              <h3 className="mb-3 text-[15px] font-bold">Куки-баннер</h3>
              <CookieBannerPreview theme={widget.bannerTheme} note={false} />

              <h3 className="mb-3 mt-7 text-[15px] font-bold">Подвал сайта</h3>
              <FooterPreview theme={widget.footerTheme} note={false} />

              <h3 className="mb-3 mt-7 text-[15px] font-bold">Маркировка в тексте страниц</h3>
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
      {editing === 'requisites' && <RequisitesModal track={false} onClose={() => setEditing(null)} onSaved={reload} />}
      {editing && editing !== 'requisites' && <AnswerModal kind={editing} onClose={() => setEditing(null)} onSaved={reload} />}
    </AnketaFrame>
  );
}
