'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
} from '../../../../components/app/AppIcons';
import { CookieBannerPreview, FooterPreview, ThemeSwitch, WIDGET_DEFAULTS, footerExtra, widgetSettings } from '../../../../components/app/WidgetPreviews';
import { RING, AnketaFrame } from '../_shared/AnketaChrome';
import { loadAnketa, markStepDone, saveAnketa } from '../_shared/anketaState';
import { DOCUMENTS } from '../../../../lib/docPackage';
import RequisitesModal from '../../site/_shared/RequisitesModal';
import AnswerModal from './AnswerModal';
import DocViewer from './DocViewer';

export default function DocumentsClient() {
  const router = useRouter();
  const [domain, setDomain] = useState('alfa-school.ru');
  const [answers, setAnswers] = useState({});
  // Открыт один документ за раз — сразу первый, а не пять свёрнутых строк.
  const [openDoc, setOpenDoc] = useState(DOCUMENTS[0].id);
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
    <AnketaFrame
      current={4}
      title="Пакет документов"
      nextLabel={answers.installed ? 'Готово' : 'Далее'}
      lead={
        answers.installed ? (
          <>Проверьте ответы, любой можно изменить: документы на сайте обновятся сами.</>
        ) : (
          <>Пять документов для <span className="font-semibold text-ink">{domain}</span> готовы. Проверьте ещё раз, любой ответ здесь можно изменить.</>
        )
      }
    >

            <DocViewer domain={domain} answers={answers} current={openDoc} onPick={setOpenDoc} onEdit={setEditing} />

            <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
              {/* Подписи превью — обычными подзаголовками: серые моно-капсы
                  сливались с фоном; «после установки» у подвала лишнее — и
                  так ясно, что сейчас его на сайте нет (владелец 23.09).
                  Подсказка про тему — одна на раздел, а не под каждым превью. */}
              <div className="mb-6">
                <h2 className="text-xl font-bold tracking-[-0.02em]">Вот что появится на сайте</h2>
                {/* Тема — переключателем прямо над превью, и она же сохраняется
                    в настройки «Виджета» (разбор текстов 25.09: владельца
                    волнует, впишется ли виджет в его дизайн). */}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span id="step5-theme" className="text-sm text-ink/60">Тема</span>
                  <ThemeSwitch
                    value={widget.bannerTheme === widget.footerTheme ? widget.bannerTheme : null}
                    onChange={(t) => {
                      const next = { ...widget, bannerTheme: t, footerTheme: t };
                      setWidget(next);
                      saveAnketa({ widget: next });
                    }}
                    labelledby="step5-theme"
                  />
                </div>
                <p className="mt-2 text-sm text-ink/60">Тему и показ баннера и подвала можно поменять потом в разделе «Виджет».</p>
              </div>

              <h3 className="mb-3 text-[15px] font-bold">Куки-баннер</h3>
              <CookieBannerPreview theme={widget.bannerTheme} />

              <h3 className="mb-3 mt-7 text-[15px] font-bold">Подвал сайта</h3>
              <FooterPreview theme={widget.footerTheme} extra={footerExtra(answers)} />

              <h3 className="mb-3 mt-7 text-[15px] font-bold">Маркировка в тексте страниц</h3>
              <div className="rounded-xl border border-line-2 bg-paper p-4">
                {/* Знак — капля 💧, как у Ивана (владелец 30.09: «ставим Слеза»), и сноска
                    внизу страницы: подсказку по наведению не видно на телефоне и не
                    слышно диктору, сноску — видно и слышно. */}
                <p className="text-[14px] leading-6">
                  …в интервью для издания «Пример»{' '}
                  <span title="Маркировка по реестрам" role="img" aria-label="Маркировка по реестрам" className="text-[13px]">
                    💧
                  </span>{' '}
                  сказал, что…
                </p>
                <p className="mt-2 border-t border-line pt-2 text-[12px] leading-4 text-ink/70">
                  Знаком <span role="img" aria-label="капля">💧</span> отмечены: «Пример» — демонстрационный пример маркировки.
                </p>
                <p className="mt-2 text-[12px] leading-4 text-ink/60">
                  Сами сверим страницы с официальными реестрами Минюста и Росфинмониторинга (иностранные агенты,
                  экстремистские и террористические организации) и промаркируем упоминания. Реестры меняются, следить за ними не придётся.
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
                  // Сайт уже работает — сюда пришли из «Документов» поправить
                  // ответ (владелец 26.09): назад туда же, а не к установке.
                  if (answers.installed) return router.push('/app/site/documents');
                  markStepDone(5);
                  router.push('/app/start/code');
                }}
                className={`flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-hover ${RING}`}
              >
                {answers.installed ? 'Готово' : 'Поставить код на сайт'} <ArrowRightIcon size={17} />
              </button>
            </div>
      {editing === 'requisites' && <RequisitesModal track={false} onClose={() => setEditing(null)} onSaved={reload} />}
      {editing && editing !== 'requisites' && <AnswerModal kind={editing} onClose={() => setEditing(null)} onSaved={reload} />}
    </AnketaFrame>
  );
}
