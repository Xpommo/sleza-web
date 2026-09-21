'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckIcon, CopyIcon, DocsIcon, LinkIcon } from '../../../../components/app/AppIcons';
import { DocRow, DocRowList } from '../../../../components/app/DocRows';
import { CURRENT_USER } from '../../../../lib/appMock';
import { DOCUMENTS, SITE_ID, docNote, docUrl } from '../../../../lib/docPackage';
import { accountUser, loadAnketa } from '../../start/_shared/anketaState';
import { RING, SiteSidebar } from '../_shared/SiteChrome';

const PACKAGE_URL = `cdn.sleza.media/${SITE_ID}`;

function formatDate(ms) {
  return new Date(ms).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function SiteDocumentsClient() {
  const router = useRouter();
  const [site, setSite] = useState(null);
  const [user, setUser] = useState(CURRENT_USER);
  const [openDoc, setOpenDoc] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const a = loadAnketa();
    if (!a.domain) {
      router.replace('/app/sites');
      return;
    }
    setUser(accountUser(CURRENT_USER));
    setSite({
      domain: a.domain,
      installed: Boolean(a.installed),
      noCalls: a.callsBase === false,
      madeAt: a.trialStartedAt || Date.now(),
    });
  }, [router]);

  if (!site) return null;

  // Пока кода нет на сайте, документы собраны, но по адресам не открываются.
  // Обещать обратное нельзя — это единственная разница между экранами.
  const live = site.installed;
  const made = formatDate(site.madeAt);

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
          <header>
            <p className="mb-3 font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-brand">{site.domain}</p>
            <h1 className="text-[28px] font-bold tracking-[-0.045em] sm:text-[36px]">Документы</h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-6 text-ink/55">
              {live
                ? 'Открыты по постоянным адресам — ссылки в подвале сайта не ломаются. Когда меняется закон, мы переписываем текст и поднимаем версию.'
                : 'Собраны по вашим ответам. Откроются по постоянным адресам, как только на сайте появится код.'}
            </p>
          </header>

          <section className="mt-9 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/[0.08] text-brand">
                <DocsIcon size={19} />
              </span>
              <div>
                <h2 className="text-lg font-bold tracking-[-0.02em]">Все документы сайта</h2>
                <p className="mt-1 text-sm text-ink/55">
                  {live ? 'Один адрес на весь пакет — его же открывает подвал' : 'Адрес закрепим за сайтом — он не изменится'}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <div className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-xl border border-line bg-warm px-4 font-mono text-[13px] text-ink/70">
                <LinkIcon size={17} className="shrink-0 text-ink/35" />
                <span className="truncate">{PACKAGE_URL}</span>
              </div>
              <button
                type="button"
                onClick={copyLink}
                className={`inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 text-sm font-bold transition hover:border-brand hover:text-brand ${RING}`}
              >
                {copied ? <CheckIcon size={16} className="text-ok" /> : <CopyIcon size={16} />}
                {copied ? 'Скопировано' : 'Скопировать ссылку'}
              </button>
            </div>
          </section>

          <section className="mt-9">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-ink/45">Реестр</p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em]">Актуальные документы</h2>
              </div>
              <span className="shrink-0 text-xs font-semibold text-ink/45">{DOCUMENTS.length} документов</span>
            </div>
            <DocRowList>
              {DOCUMENTS.map((doc) => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  note={docNote(doc, site.noCalls)}
                  status={live ? { tone: 'ok', label: 'Опубликован' } : { tone: 'warn', label: 'Ждёт кода' }}
                  open={openDoc === doc.id}
                  onToggle={() => setOpenDoc(openDoc === doc.id ? null : doc.id)}
                >
                  <p className="text-[13px] font-semibold">Версия 1 · от {made}</p>
                  <p className="mt-1.5 text-[13px] leading-5 text-ink/60">
                    {live
                      ? 'Действует. Следующая версия появится, только если изменится закон или ваши данные, — мы напишем об этом письмом.'
                      : 'Текст готов и ждёт установки кода: до неё адрес не открывается.'}
                  </p>
                  <p className="mt-3 font-mono text-[11px] text-ink/45">
                    {docUrl(doc)}
                    {!live && ' — откроется после установки'}
                  </p>
                </DocRow>
              ))}
            </DocRowList>
          </section>

          <section className="mt-9 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-7">
            <p className="text-sm font-semibold text-ink/45">История изменений</p>
            {/* Соединительной линии нет: запись пока одна, и вести её некуда.
                Появится вторая версия — появится и линия. */}
            <div className="mt-6 space-y-6">
              <div className="relative flex gap-4">
                <span className="z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-4 border-white bg-brand" />
                <div>
                  <p className="text-sm font-bold">{made} · Создана первая версия</p>
                  <p className="mt-1 text-sm leading-5 text-ink/55">
                    Реквизиты владельца, политики и согласия собраны по вашим ответам в анкете.
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-6 border-t border-line pt-5 text-[13px] leading-5 text-ink/50">
              Здесь будет видно каждую следующую версию и причину, по которой мы её выпустили. Сверяем закон сами —
              следить за изменениями вам не придётся.
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
    </main>
  );
}
