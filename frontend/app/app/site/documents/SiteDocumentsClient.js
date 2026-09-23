'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckIcon, CopyIcon, DocsIcon, ExternalIcon, LinkIcon, PencilIcon } from '../../../../components/app/AppIcons';
import { DocRow, DocRowList, IconAction } from '../../../../components/app/DocRows';
import { CURRENT_USER } from '../../../../lib/appMock';
import { DOCUMENTS, SITE_ID, docOrigin, docUrl, editEvents } from '../../../../lib/docPackage';
import { accountUser, loadAnketa } from '../../start/_shared/anketaState';
import PdEmailModal from '../_shared/PdEmailModal';
import RequisitesModal from '../_shared/RequisitesModal';
import { siteAnketa } from '../_shared/sites';
import { subState } from '../_shared/subscription';
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
      expired: subState(a) === 'expired',
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
  const canCopy = live && !site.expired;

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
    <main className="min-h-screen bg-warm text-ink lg:flex">
      <SiteSidebar domain={site.domain} active="Документы" user={user} />

      <section className="min-w-0 flex-1 px-5 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12 xl:px-20">
        <div className="mx-auto max-w-5xl">
          <SiteHeader title="Документы" domain={site.domain} context="версии и причины изменений">
            <p className="mt-4 max-w-2xl text-[15px] leading-6 text-ink/60">
              {live
                ? 'Открыты по постоянным адресам — ссылки в подвале сайта не ломаются. Когда меняется закон, мы переписываем текст и поднимаем версию.'
                : 'Собраны по вашим ответам. Откроются по постоянным адресам, как только на сайте появится код.'}
            </p>
          </SiteHeader>

          <section className="mt-9 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/[0.08] text-brand">
                <DocsIcon size={19} />
              </span>
              <div>
                <h2 className="text-lg font-bold tracking-[-0.02em]">Все документы сайта</h2>
                <p className="mt-1 text-sm text-ink/60">
                  {live ? 'Один адрес на весь пакет — его же открывает подвал' : 'Адрес закрепим за сайтом — он не изменится'}
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
              <h2 className="text-lg font-bold tracking-[-0.02em]">Актуальные документы</h2>
              <span className="shrink-0 text-xs font-semibold text-ink/60">{DOCUMENTS.length} документов</span>
            </div>
            {/* Зашёл за документом — взял его одним нажатием: «Открыть» и
                «Скопировать ссылку» прямо в строке, без раскрытия (правка
                владельца 23.09). Версия и дата — мелко под статусом. */}
            <DocRowList actionsLabel="Действия">
              {DOCUMENTS.map((doc) => {
                const edits = site.edits.filter((e) => e.doc === doc.id);
                return (
                  <DocRow
                    key={doc.id}
                    doc={doc}
                    note={docOrigin(doc, site.answers).line}
                    status={live ? { tone: 'ok', label: 'Опубликован' } : { tone: 'warn', label: 'Ждёт кода' }}
                    meta={`версия ${1 + edits.length} · ${formatDate(edits.at(-1)?.at || site.madeAt)}`}
                    actions={
                      <>
                        {/* Открыть можно и после пробного периода: опубликованные
                            страницы остаются доступны по ссылке (решение 24.08);
                            гаснет только копирование (HANDOFF 6.15 п.8). */}
                        <IconAction
                          label="Открыть"
                          icon={ExternalIcon}
                          href={`https://${docUrl(doc)}`}
                          disabled={!live}
                          why="Откроется после установки кода"
                        />
                        <IconAction
                          label="Скопировать ссылку"
                          done={copiedDoc === doc.id ? 'Скопировано' : null}
                          icon={copiedDoc === doc.id ? CheckIcon : CopyIcon}
                          onClick={() => copyDoc(doc)}
                          disabled={!canCopy}
                          why={live ? 'Вернётся после оплаты' : 'Появится после установки кода'}
                        />
                        {/* Клиент сам правит реквизиты и почту для запросов о
                            персональных данных (она стоит в политике и в
                            согласии) — окном поверх списка, здесь же. */}
                        {doc.id === '01' && <IconAction label="Изменить реквизиты" icon={PencilIcon} onClick={() => setReqOpen(true)} />}
                        {(doc.id === '03' || doc.id === '12') && (
                          <IconAction label="Изменить почту для запросов" icon={PencilIcon} onClick={() => setPdOpen(true)} />
                        )}
                      </>
                    }
                  />
                );
              })}
            </DocRowList>
          </section>

          <section className="mt-9 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7">
            <h2 className="text-lg font-bold tracking-[-0.02em]">История изменений</h2>
            {/* Линия соединяет записи, только когда их больше одной. */}
            <div className={`relative mt-6 space-y-6 ${site.edits.length ? 'before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-line' : ''}`}>
              {editEvents(site.edits).reverse().map((e) => (
                <div key={e.at} className="relative flex gap-4">
                  <span className="z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-4 border-white bg-brand" />
                  <div>
                    <p className="text-sm font-bold">
                      {formatDate(e.at)} · {e.title}
                    </p>
                    <p className="mt-1 text-sm leading-5 text-ink/60">{e.what} — поправили в кабинете.</p>
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
            <p className="mt-6 border-t border-line pt-5 text-[13px] leading-5 text-ink/60">
              Здесь будет видно каждую следующую версию и причину, по которой мы её выпустили.
            </p>
          </section>

          {!live && (
            <div className="mt-7 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink/60">Документы включатся на сайте сразу после установки кода.</p>
              <Link
                href="/app/start/code"
                className={`inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1a1acc] ${RING}`}
              >
                Поставить код на сайт
              </Link>
            </div>
          )}
        </div>
      </section>
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
    </main>
  );
}
