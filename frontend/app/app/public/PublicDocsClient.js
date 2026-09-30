'use client';

// Страница документов сайта для посетителя — по макету Ивана «Виджет и реестр
// документов» (владелец 30.09: рисуем). Слева список документов, справа текст;
// сначала — приветствие, документ не выбран; повторное нажатие на открытый
// документ возвращает к приветствию. Версия и дата — в самом документе, список
// прежних версий по нажатию. Ссылка на документ копируется там же.
//
// Тема — та же, что у подвала на сайте клиента (пять тонов, WidgetPreviews).
// Наш знак «Слеза» — маленький, в углу (владелец 30.09: «можно оставить, если
// это просто наш знак»): страница на нашем адресе, не на сайте клиента.
// Без подписей вроде «Собрала и приглядывает».
//
// Слово «реестр» из макета Ивана не взято: в продукте «реестры» — это списки
// Минюста и Росфинмониторинга (маркировка), а здесь — документы сайта.

import { useEffect, useRef, useState } from 'react';
import { ArrowLeftIcon, CheckIcon, ChevronDownIcon, CopyIcon, DocsIcon } from '../../../components/app/AppIcons';
import { TearMark } from '../../../components/app/AuthBits';
import { skinStyle, widgetSettings } from '../../../components/app/WidgetPreviews';
import { DOCUMENTS, SITE_ID, docPreview, docUrl, operatorName } from '../../../lib/docPackage';
import { announce } from '../../../lib/announce';
import { loadAnketa } from '../start/_shared/anketaState';
import { siteAnketa } from '../site/_shared/sites';

const RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--w-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--w-bg)]';
const MUTED = 'text-[color:var(--w-muted)]';
const LINE = 'border-[color:var(--w-line)]';

const formatDate = (ms) => new Date(ms).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
const plain = (s) => s.replace(/[\u0001\u0002]/g, '');

// Версии документа: первая — когда пакет собран, дальше — каждая правка из
// кабинета (те же правки, что в «Истории изменений»). Посетителю — только
// номер и дата: «Изменён ответ …» — язык кабинета, не его.
function versionsOf(docId, a) {
  const made = a.trialStartedAt || Date.now();
  const edits = (a.docEdits || []).filter((e) => e.doc === docId);
  return [{ n: 1, at: made }, ...edits.map((e, i) => ({ n: i + 2, at: e.at }))].reverse();
}

const has = (v) => v === 'Есть' || v === 'Да';
const LICENSE_KIND = { medicine: 'Лицензия на медицинскую деятельность', school: 'Лицензия на образовательную деятельность', kids: 'Лицензия на образовательную деятельность' };

// «Реквизиты владельца» — то, что клиент подтвердил на шаге 4.
function requisiteRows(a) {
  const c = a.contacts || {};
  const b = a.bank || {};
  const rows = [
    ['Владелец сайта', operatorName(a)],
    ['ИНН', a.inn],
    a.owner === 'ООО' && ['КПП', a.kpp],
    a.owner !== 'Самозанятый' && [a.owner === 'ИП' ? 'ОГРНИП' : 'ОГРН', a.ogrn],
    a.owner !== 'Самозанятый' && [a.owner === 'ООО' ? 'Юридический адрес' : 'Адрес', a.address],
    ['Адрес для писем', c.postAddress],
    ['Расчётный счёт', b.account],
    ['Банк', b.bank],
    ['БИК', b.bik],
    ['Корреспондентский счёт', b.corr],
    ['E-mail', c.companyMail],
    ['Телефон', c.companyPhone],
    ['E-mail для запросов о персональных данных', c.pdSame ? c.companyMail : c.pdContact],
    a.license && has(a.license.has) && [LICENSE_KIND[a.sphere] || 'Лицензия', [a.license.no && `№ ${a.license.no}`, a.license.date, a.license.org].filter(Boolean).join(', ')],
    a.mediaReg && has(a.mediaReg.has) && ['Свидетельство о регистрации СМИ', [a.mediaReg.no, a.mediaReg.date, a.mediaReg.org].filter(Boolean).join(', ')],
    has(a.itAccred) && ['ИТ-аккредитация', a.itAccredNo && `№ ${a.itAccredNo}`],
    has(a.softRegistry) && ['Реестр российского ПО', a.softRegistryNo && `№ ${a.softRegistryNo}`],
  ];
  return rows.filter((r) => r && r[1]);
}

function useCopy() {
  const [done, setDone] = useState(null);
  function copy(key, url) {
    navigator.clipboard?.writeText(url).catch(() => {});
    announce('Ссылка скопирована');
    setDone(key);
    setTimeout(() => setDone(null), 2000);
  }
  return [done, copy];
}

function VersionMenu({ versions }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const cur = versions[0];
  // Закрывается по Escape и по нажатию мимо — как любое раскрытие.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !box.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="doc-versions"
        className={`tap inline-flex h-9 items-center gap-1.5 rounded-lg border ${LINE} px-3 font-mono text-[13px] ${MUTED} transition hover:bg-[color:var(--w-hover)] hover:text-[color:var(--w-text)] ${RING}`}
      >
        версия {cur.n} от {formatDate(cur.at)}
        <ChevronDownIcon size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul id="doc-versions" className={`absolute left-0 top-[calc(100%+6px)] z-20 min-w-[240px] rounded-xl border ${LINE} bg-[color:var(--w-bg)] p-1.5 shadow-lg`}>
          {versions.map((v, i) => (
            <li key={v.n} className={`flex items-center justify-between gap-4 whitespace-nowrap rounded-lg px-3 py-2 font-mono text-[13px] ${i === 0 ? 'text-[color:var(--w-text)]' : MUTED}`}>
              <span>
                версия {v.n} от {formatDate(v.at)}
              </span>
              {i === 0 && <span className="font-sans text-[12px] font-semibold">действует</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ShareHub({ copied, onCopy }) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className={`mt-5 inline-flex h-11 items-center gap-2 rounded-xl border ${LINE} px-4 text-[14px] font-semibold transition hover:bg-[color:var(--w-hover)] ${RING}`}
    >
      {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
      {copied ? 'Скопировано' : 'Скопировать ссылку на страницу'}
    </button>
  );
}

export default function PublicDocsClient() {
  const [a, setA] = useState(null);
  const [docId, setDocId] = useState(null);
  const [copied, copy] = useCopy();
  const pane = useRef(null);

  useEffect(() => {
    const s = siteAnketa(loadAnketa());
    setA(s.domain ? s : {});
    const read = () => {
      const id = new URLSearchParams(window.location.search).get('doc');
      setDocId(DOCUMENTS.some((d) => d.id === id) ? id : null);
    };
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);

  if (!a) return null;

  // Прототип: страница читает анкету из этой вкладки. Открытая сама по себе,
  // без кабинета, она пустая — так и говорим.
  if (!a.domain) {
    return (
      <main id="content" className="mx-auto max-w-xl px-5 py-16 text-ink">
        <h1 className="text-[28px] font-bold tracking-[-0.045em]">Документы сайта</h1>
        <p className="mt-3 text-[15px] leading-6 text-ink/60">Макет: откройте эту страницу из кабинета, «Документы» → название документа. Здесь она показывает документы того сайта, который открыт в кабинете.</p>
      </main>
    );
  }

  const theme = widgetSettings(a).footerTheme;
  const doc = DOCUMENTS.find((d) => d.id === docId) || null;

  // Выбор документа — ссылкой с ?doc=, чтобы адрес можно было скопировать и
  // «Назад» в браузере работал. Нажали открытый ещё раз — к приветствию.
  function pick(e, id) {
    e.preventDefault();
    const next = id === docId ? null : id;
    window.history.pushState(null, '', next ? `?doc=${next}` : window.location.pathname);
    setDocId(next);
    requestAnimationFrame(() => pane.current?.focus());
  }

  const hubUrl = `https://cdn.sleza.media/${SITE_ID}`;

  return (
    <div style={skinStyle(theme)} className="min-h-screen min-h-dvh bg-[color:var(--w-bg)] text-[color:var(--w-text)]">
      <header className={`sticky top-0 z-10 border-b ${LINE} bg-[color:var(--w-bg)]`}>
        <div className="mx-auto flex max-w-6xl items-start justify-between gap-4 px-5 py-5 sm:px-8">
          <div className="min-w-0">
            <h1 className="text-[20px] font-bold leading-7 tracking-[-0.03em] sm:text-[28px] sm:leading-9">Документы сайта</h1>
            <p className={`mt-1 text-[13px] leading-5 ${MUTED}`}>
              <a href={`https://${a.domain}`} target="_blank" rel="noopener noreferrer" className={`tap rounded font-semibold text-[color:var(--w-text)] hover:underline ${RING}`}>
                {a.domain} →<span className="sr-only"> (откроется в новой вкладке)</span>
              </a>
              <span className="mx-1.5" aria-hidden="true">·</span>
              {operatorName(a)}
            </p>
          </div>
          <a
            href="https://sleza.media"
            target="_blank"
            rel="noopener noreferrer"
            className={`tap mt-1 flex shrink-0 items-center gap-1.5 rounded-lg text-[13px] font-semibold ${MUTED} hover:text-[color:var(--w-text)] ${RING}`}
          >
            <TearMark size={18} className="text-[color:var(--w-accent)]" />
            Слеза<span className="sr-only"> (откроется в новой вкладке)</span>
          </a>
        </div>
      </header>

      {/* main — вся рабочая часть: на телефоне без выбранного документа виден
          только список, и область main должна быть и тогда. */}
      <main id="content" className="mx-auto grid max-w-6xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12 lg:py-10">
        {/* На телефоне открытый документ занимает экран, список — по «← Все документы». */}
        <nav aria-label="Документы" className={doc ? 'hidden lg:block' : ''}>
          {!doc && (
            <div className="mb-5 lg:hidden">
              <p className={`text-[15px] leading-6 ${MUTED}`}>Реквизиты владельца, политики обработки данных и тексты согласий сайта {a.domain}.</p>
              <ShareHub copied={copied === 'hub'} onCopy={() => copy('hub', hubUrl)} />
            </div>
          )}
          <ul className="flex flex-col gap-1">
            {DOCUMENTS.map((d) => (
              <li key={d.id}>
                <a
                  href={`?doc=${d.id}`}
                  onClick={(e) => pick(e, d.id)}
                  aria-current={d.id === docId ? 'page' : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold leading-5 transition ${RING} ${
                    d.id === docId ? 'bg-[color:var(--w-hover)] text-[color:var(--w-text)]' : `${MUTED} hover:bg-[color:var(--w-hover)] hover:text-[color:var(--w-text)]`
                  }`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${d.id === docId ? 'bg-[color:var(--w-accent-soft)] text-[color:var(--w-accent)]' : 'bg-[color:var(--w-hover)]'}`}>
                    <DocsIcon size={16} />
                  </span>
                  {d.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div ref={pane} tabIndex={-1} className={`min-w-0 outline-none ${doc ? '' : 'hidden lg:block'}`}>
          {doc ? (
            <article className="max-w-[68ch]">
              <a href="?" onClick={(e) => pick(e, doc.id)} className={`tap mb-6 inline-flex items-center gap-2 rounded text-[14px] font-semibold ${MUTED} hover:text-[color:var(--w-text)] lg:hidden ${RING}`}>
                <ArrowLeftIcon size={16} /> Все документы
              </a>
              <div className="flex flex-wrap items-center gap-2">
                <VersionMenu key={doc.id} versions={versionsOf(doc.id, a)} />
                <button
                  type="button"
                  onClick={() => copy(doc.id, `https://${docUrl(doc)}`)}
                  aria-label={`Скопировать ссылку на «${doc.title}»`}
                  title="Скопировать ссылку"
                  className={`tap flex h-9 w-9 items-center justify-center rounded-lg border ${LINE} ${MUTED} transition hover:bg-[color:var(--w-hover)] hover:text-[color:var(--w-text)] ${RING}`}
                >
                  {copied === doc.id ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                </button>
              </div>
              <h2 className="mt-5 text-[20px] font-bold leading-7 tracking-[-0.02em] sm:text-[28px] sm:leading-9">{doc.title}</h2>
              <p className={`mt-1 font-mono text-[12px] ${MUTED}`}>{doc.law}</p>

              {doc.id === '01' ? (
                <dl className={`mt-6 divide-y ${LINE} border-y ${LINE} text-[15px] leading-6`}>
                  {requisiteRows(a).map(([k, v]) => (
                    <div key={k} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)] sm:gap-6">
                      <dt className={`text-[13px] leading-6 ${MUTED}`}>{k}</dt>
                      <dd className="min-w-0 break-words">{v}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <>
                  <p className="mt-6 text-[15px] leading-7">{plain(docPreview(doc, a))}</p>
                  {/* Полных текстов в макете нет: их готовят юристы (владелец 28.09). */}
                  <p className={`mt-6 rounded-xl border border-dashed ${LINE} px-4 py-3 text-[13px] leading-5 ${MUTED}`}>
                    Макет: полный текст документа готовят юристы. Выше — начало, собранное по ответам анкеты.
                  </p>
                </>
              )}
            </article>
          ) : (
            <section className="max-w-[60ch]">
              <h2 className="text-[20px] font-bold leading-7 tracking-[-0.02em]">Все документы сайта в одном месте</h2>
              <p className={`mt-3 text-[15px] leading-6 ${MUTED}`}>
                Реквизиты владельца, политики обработки данных и тексты согласий сайта {a.domain}. Выберите документ в списке: у каждого указаны версия и дата.
              </p>
              <ShareHub copied={copied === 'hub'} onCopy={() => copy('hub', hubUrl)} />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
