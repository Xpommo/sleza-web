'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckIcon, CopyIcon, DocsIcon, LinkIcon } from '../../../../components/app/AppIcons';
import { DocRow, DocRowList, IconAction } from '../../../../components/app/DocRows';
import { CURRENT_USER } from '../../../../lib/appMock';
import { DOCUMENTS, SITE_ID, docOrigin, docUrl, editEvents } from '../../../../lib/docPackage';
import { accountUser, loadAnketa } from '../../start/_shared/anketaState';
import PdEmailModal from '../_shared/PdEmailModal';
import RequisitesModal from '../_shared/RequisitesModal';
import { siteAnketa } from '../_shared/sites';
import { widgetStopped } from '../_shared/subscription';
import { RING, SiteHeader, SiteSidebar } from '../_shared/SiteChrome';

const PACKAGE_URL = `cdn.sleza.media/${SITE_ID}`;

function formatDate(ms) {
  return new Date(ms).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function SiteDocumentsClient() {
  const router = useRouter();
  const [site, setSite] = useState(null);
  const [user, setUser] = useState(CURRENT_USER);
  const [copied, setCopied] = useState(false);
  const [copiedDoc, setCopiedDoc] = useState(null);
  const [reqOpen, setReqOpen] = useState(false);
  const [pdOpen, setPdOpen] = useState(false);

  useEffect(() => {
    const a = siteAnketa(loadAnketa());
    if (!a.domain) {
      router.replace('/app/sites');
      return;
    }
    setUser(accountUser(CURRENT_USER));
    setSite({
      domain: a.domain,
      installed: Boolean(a.installed),
      answers: a,
      stopped: widgetStopped(a, Date.now(), loadAnketa().billing?.topupInvoice),
      madeAt: a.trialStartedAt || Date.now(),
      edits: a.docEdits || [],
    });
  }, [router]);

  if (!site) return null;

  // Пока кода нет на сайте, документы собраны, но по адресам не открываются.
  // Обещать обратное нельзя — это единственная разница между экранами.
  const live = site.installed;
  const made = formatDate(site.madeAt);

  // После пробного периода без оплаты документы остаются видимыми (просмотр
  // честный, не шантаж), а копирование ссылок гаснет (макет, HANDOFF 6.15 п.8).
  const canCopy = live && !site.stopped;

  function copyDoc(doc) {
    navigator.clipboard?.writeText(`https://${docUrl(doc)}`).catch(() => {});
    setCopiedDoc(doc.id);
    setTimeout(() => setCopiedDoc(null), 2000);
  }

  function copyLink() {
    navigator.clipboard?.writeText(`https://${PACKAGE_URL}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-warm text-ink lg:flex">
      <SiteSidebar domain={site.domain} active="Документы" user={user} />

      <main id="content" tabIndex={-1} className="outline-none min-w-0 flex-1 px-5 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12 xl:px-20">
        <div className="mx-auto max-w-5xl">
          {/* Без вводной строки (владелец 24.09): про постоянные адреса говорит
              карточка пакета, про «откроется после установки» — строка версии у
              каждого документа, про версии и даты — «История изменений». */}
          <SiteHeader title="Документы" domain={site.domain} />

          <section className="mt-9 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7 lg:mt-0">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/[0.08] text-brand">
                <DocsIcon size={19} />
              </span>
              <div>
                <h2 className="text-lg font-bold tracking-[-0.02em]">Все документы сайта</h2>
                <p className="mt-1 text-sm text-ink/60">
                  {site.stopped ? 'Адрес за сайтом сохранён, документы откроются после оплаты' : live ? 'Один адрес на весь пакет, его же открывает подвал' : 'Адрес закрепим за сайтом, и он не изменится'}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <div className="flex h-12 min-w-0 shrink-0 items-center sm:flex-1 gap-3 rounded-xl border border-line bg-warm px-4 font-mono text-[13px] text-ink/70">
                <LinkIcon size={17} className="shrink-0 text-ink/35" />
                <span className="truncate">{PACKAGE_URL}</span>
              </div>
              <button
                type="button"
                onClick={copyLink}
                disabled={!canCopy}
                className={`inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 text-sm font-bold transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50 ${RING}`}
              >
                {copied ? <CheckIcon size={16} className="text-ok" /> : <CopyIcon size={16} />}
                {copied ? 'Скопировано' : 'Скопировать ссылку'}
              </button>
            </div>
          </section>

          <section className="mt-9">
            <div className="mb-5 flex items-end justify-between gap-4">
              {/* Заголовок раздела — той же ступени, что на остальных экранах
                  кабинета (18px): здесь был свой, крупнее, с кикером сверху. */}
              {/* У остановленной подписки «Актуальные» спорило с «Сняты с сайта»
                  на «Обзоре» (разбор 25.09). */}
              <div>
                <h2 className="text-lg font-bold tracking-[-0.02em]">{site.stopped ? 'Документы сайта' : 'Актуальные документы'}</h2>
                {site.stopped && <p className="mt-1 text-[13px] text-ink/60">Сняты с сайта, вернутся после оплаты.</p>}
              </div>
              <span className="shrink-0 text-xs font-semibold text-ink/60">{DOCUMENTS.length} документов</span>
            </div>
            {/* Зашёл за документом — взял его одним нажатием: «Открыть» и
                «Скопировать ссылку» прямо в строке, без раскрытия (правка
                владельца 23.09). Версия и дата — мелко под статусом. */}
            {/* Строки одинаковые (владелец 23.09 — «много кнопок, вразнобой»):
                название — ссылка на документ, справа одна иконка «Скопировать
                ссылку». Статус «Опубликован» был у всех одинаковым — снят; до
                установки кода это видно в строке версии. Правки — не карандашами
                по строкам, а отдельным блоком «Что можно изменить» ниже. */}
            <DocRowList actionsLabel="Ссылка" withStatus={false}>
              {DOCUMENTS.map((doc) => {
                const edits = site.edits.filter((e) => e.doc === doc.id);
                return (
                  <DocRow
                    key={doc.id}
                    doc={doc}
                    href={live ? `https://${docUrl(doc)}` : undefined}
                    note={docOrigin(doc, site.answers).line}
                    meta={`версия ${1 + edits.length} · ${formatDate(edits.at(-1)?.at || site.madeAt)}${live ? '' : ' · откроется после установки кода'}`}
                    actions={
                      <IconAction
                        label="Скопировать ссылку"
                        name={`Скопировать ссылку на «${doc.title}»`}
                        done={copiedDoc === doc.id ? 'Скопировано' : null}
                        icon={copiedDoc === doc.id ? CheckIcon : CopyIcon}
                        onClick={() => copyDoc(doc)}
                        disabled={!canCopy}
                        why={live ? 'Вернётся после оплаты' : 'Появится после установки кода'}
                      />
                    }
                  />
                );
              })}
            </DocRowList>
          </section>

          {/* Что клиент правит сам — в одном месте и названо прямо: реквизиты и
              почта для запросов о персональных данных. Остальное в документах
              собрано по ответам анкеты (решения владельца 23.09). */}
          <section className="mt-9 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7">
            <h2 className="text-lg font-bold tracking-[-0.02em]">Что можно изменить</h2>
            {/* Ответы анкеты — третьей строкой (владелец 26.09): менять их нужно
                редко, когда на сайте что-то изменилось, поэтому без отдельного
                раздела — ведём на шаг 5, где документы и «Изменить ответ». */}
            <p className="mt-1 text-[13px] text-ink/60">Документы обновятся сами, как только вы что-то поменяете.</p>
            <div className="mt-4 divide-y divide-line">
              {[
                ['Реквизиты владельца', [site.answers.companyName, site.answers.inn && `ИНН ${site.answers.inn}`].filter(Boolean).join(' · '), 'Изменить реквизиты', () => setReqOpen(true)],
                ['E-mail для запросов о персональных данных', site.answers.contacts?.pdContact || 'не указан', 'Изменить e-mail для запросов', () => setPdOpen(true)],
                ['Ответы анкеты', 'формы, счётчики, цели, рассылки', 'Изменить ответы анкеты', () => router.push('/app/start/documents')],
              ].map(([label, value, aria, onClick]) => (
                <div key={label} className="flex items-center justify-between gap-4 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{label}</p>
                    <p className="mt-0.5 break-words text-[12px] text-ink/60">{value}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onClick}
                    aria-label={aria}
                    className={`shrink-0 rounded-xl border border-line bg-white px-4 py-2 text-[13px] font-bold transition hover:border-brand hover:text-brand ${RING}`}
                  >
                    Изменить
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-9 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7">
            <h2 className="text-lg font-bold tracking-[-0.02em]">История изменений</h2>
            {/* «Публикуем и датируем сами» стояло под заголовком страницы
                (владелец 24.09: не наверху — это про версии). Здесь его
                подтверждает сама история; строка «Здесь будет видно каждую
                следующую версию…» влилась в неё. */}
            <p className="mt-1 text-[13px] leading-5 text-ink/60">
              Каждую версию публикуем и датируем сами. По этой истории видно, какая версия была на сайте и с какого дня.
            </p>
            {/* Линия соединяет записи, только когда их больше одной. */}
            <div className={`relative mt-6 space-y-6 ${site.edits.length ? 'before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-line' : ''}`}>
              {editEvents(site.edits).reverse().map((e) => (
                <div key={e.at} className="relative flex gap-4">
                  <span className="z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-4 border-white bg-brand" />
                  <div>
                    <p className="text-sm font-bold">
                      {formatDate(e.at)} · {e.title}
                    </p>
                    <p className="mt-1 text-sm leading-5 text-ink/60">{e.what}. Поправили в кабинете.</p>
                  </div>
                </div>
              ))}
              <div className="relative flex gap-4">
                <span className="z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-4 border-white bg-ok" />
                <div>
                  <p className="text-sm font-bold">{made} · Создана первая версия</p>
                  <p className="mt-1 text-sm leading-5 text-ink/60">
                    Реквизиты владельца, политики и согласия собраны по вашим ответам в анкете.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {!live && (
            <div className="mt-7 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink/60">Документы включатся на сайте сразу после установки кода.</p>
              <Link
                href="/app/start/code"
                className={`inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-hover ${RING}`}
              >
                Поставить код на сайт
              </Link>
            </div>
          )}
        </div>
      </main>
      {pdOpen && (
        <PdEmailModal
          onClose={() => setPdOpen(false)}
          onSaved={() => {
            const a = siteAnketa(loadAnketa());
            setSite((v) => ({ ...v, answers: a, edits: a.docEdits || [] }));
          }}
        />
      )}
      {reqOpen && (
        <RequisitesModal
          onClose={() => setReqOpen(false)}
          onSaved={() => {
            const a = siteAnketa(loadAnketa());
            setSite((v) => ({ ...v, answers: a, edits: a.docEdits || [] }));
          }}
        />
      )}
    </div>
  );
}
