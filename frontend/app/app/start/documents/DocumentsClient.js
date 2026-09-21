'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BurgerIcon,
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  DocsIcon,
  ShieldCheckIcon,
} from '../../../../components/app/AppIcons';
import { RING, Logo, Progress, Sidebar } from '../_shared/AnketaChrome';
import { loadAnketa } from '../_shared/anketaState';

const SITE_ID = '486312';

// Пакет фиксирован: пять документов из структуры 1+2+2. Названия — по закону,
// который документ закрывает, а не по внутреннему имени файла.
const DOCUMENTS = [
  {
    id: '01',
    title: '149-ФЗ · реквизиты владельца',
    note: 'Виджет внизу страниц откроет их по данным из анкеты.',
    preview: 'ООО «Альфа Образование» · ИНН 7701234567 · ОГРН 1157746112233 · 119019, Москва, ул. Воздвиженка, д. 10…',
  },
  {
    id: '02',
    title: '152-ФЗ · политика обработки cookie',
    note: 'Подключим cookie-баннер и текст политики.',
    preview:
      'Настоящая Политика определяет порядок использования файлов cookie и аналогичных технологий на сайте {domain}, включая аналитику и работу виджета…',
  },
  {
    id: '03',
    title: '152-ФЗ · политика обработки персональных данных',
    note: 'Соберём под вашу сферу и способ сбора контактов.',
    preview:
      'Настоящая Политика в отношении обработки персональных данных определяет порядок и условия обработки персональных данных Оператором: ООО «Альфа Образование». Цели обработки: запись на занятия, ответы на обращения…',
  },
  {
    id: '12',
    title: '152-ФЗ · согласие на обработку персональных данных',
    note: 'Текст согласия для форм на сайте.',
    preview:
      'Настоящим я свободно, своей волей и в своём интересе даю согласие на обработку моих персональных данных Оператору — ООО «Альфа Образование» — в целях записи на занятия, обработки обращений…',
  },
  {
    id: '13',
    title: '38-ФЗ, ч.1 ст.18 · согласие на получение рекламных сообщений',
    // Документ в пакете при любом ответе — меняется только объяснение,
    // зачем он тому, кто сейчас по базе не пишет.
    note: 'Текст согласия на письма и звонки по базе клиентов.',
    noteIfNoCalls: 'Входит в пакет — понадобится, как только начнёте писать по базе.',
    preview:
      'Настоящим я даю согласие на получение рекламных и информационных сообщений от ООО «Альфа Образование» по телефону, в мессенджерах и на почту…',
  },
];

// Пилюли подвала. Cookie и маркировка заперты: согласие на cookie уже дано
// в баннере, маркировка обязательна по закону — тумблера там быть не может.
const PILLS = [
  {
    id: 'cookie',
    label: 'Cookie',
    locked: true,
    meta: '152-ФЗ, ст.3, 6, 9',
    title: 'Обработка cookie',
    body: 'Сайт использует файлы cookie для аналитики и корректной работы сервисов. Согласие вы уже дали в баннере при заходе на сайт — отдельно отключить его здесь нельзя. Состав собираемых данных и цели — в политике ниже.',
    lockNote: 'Обязательное согласие — уже подтверждено',
    links: ['Политика обработки cookie →'],
  },
  {
    id: 'pd',
    label: 'Персональные данные',
    meta: '152-ФЗ, ст.9',
    title: 'Согласие на обработку персональных данных',
    body: 'Разрешает сайту обрабатывать данные, которые вы оставляете в формах — имя, телефон, email. Действует сразу на все формы сайта: включили здесь — включено везде, и наоборот.',
    toggle: true,
    links: ['Политика обработки персональных данных →', 'Согласие на обработку персональных данных →'],
  },
  {
    id: 'marketing',
    label: 'Реклама',
    meta: 'ч.1 ст.18 №38-ФЗ «О рекламе» · ч.4.1 ст.14.3 КоАП',
    title: 'Согласие на получение рекламных сообщений',
    body: 'Разрешает присылать вам рекламные сообщения: письма, сообщения в мессенджерах и звонки.',
    hint: 'Сначала включите согласие на персональные данные — без него рассылка недоступна.',
    toggle: true,
    links: ['Согласие на получение рекламных сообщений →'],
  },
  {
    id: 'marking',
    label: 'Маркировка',
    locked: true,
    meta: 'реестры Минюста и Росфинмониторинга',
    title: 'Маркировка',
    body: 'Скрипт Слезы автоматически маркирует на сайте упоминания лиц и организаций из реестров: иностранные агенты, экстремистские и террористические организации, а также упоминания наркотических веществ.',
    lockNote: 'Обязательно по закону',
  },
];

function DocumentCard({ doc, domain, noCalls }) {
  const [open, setOpen] = useState(false);
  const note = noCalls && doc.noteIfNoCalls ? doc.noteIfNoCalls : doc.note;
  return (
    <article className="rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:border-brand/30 hover:shadow-md">
      <div className="flex items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/[0.08] text-brand">
          <DocsIcon size={22} />
        </span>
        <span className="rounded-full bg-ok/10 px-2.5 py-1 text-[10px] font-bold text-ok">Готово</span>
      </div>
      <h3 className="mt-4 min-h-10 text-[15px] font-bold leading-5">{doc.title}</h3>
      <p className="mt-2 min-h-10 text-sm leading-5 text-ink/55">{note}</p>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`mt-4 inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs font-bold text-ink/70 transition-colors hover:border-brand hover:text-brand ${RING}`}
      >
        Посмотреть <ChevronDownIcon size={14} className={open ? 'rotate-180' : ''} />
      </button>
      {open && (
        <div className="mt-4 rounded-xl bg-warm p-4">
          <p className="text-[13px] leading-5 text-ink/70">{doc.preview.replace('{domain}', domain)}</p>
          <p className="mt-3 font-mono text-[11px] text-ink/45">
            cdn.sleza.media/{SITE_ID}/{doc.id} — откроется после установки
          </p>
        </div>
      )}
    </article>
  );
}

export default function DocumentsClient() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [domain, setDomain] = useState('alfa-school.ru');
  const [noCalls, setNoCalls] = useState(false);
  const [openPill, setOpenPill] = useState(null);
  const [pdOn, setPdOn] = useState(false);
  const [marketingOn, setMarketingOn] = useState(false);

  useEffect(() => {
    const saved = loadAnketa();
    if (saved.domain) setDomain(saved.domain);
    setNoCalls(saved.callsBase === false);
  }, []);

  // Реклама не включается, пока не дано согласие на ПДн: рассылать письма
  // человеку, который не разрешил обрабатывать свои данные, нельзя.
  function togglePd() {
    const next = !pdOn;
    setPdOn(next);
    if (!next) setMarketingOn(false);
  }

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
              <div className="grid items-start gap-4 md:grid-cols-2">
                {DOCUMENTS.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} domain={domain} noCalls={noCalls} />
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-[-0.02em]">Вот что появится на сайте</h2>
                  <p className="mt-1 text-sm text-ink/55">Виджет ставится одной строкой кода на следующем шаге</p>
                </div>
              </div>

              {/* Баннер информационный: кнопки «Отклонить» в нём нет
                  намеренно — 152-ФЗ не требует отказа для простого
                  уведомления, и обещать управление, которого нет, нельзя. */}
              <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.09em] text-ink/50">
                cookie-баннер при первом заходе
              </p>
              <div className="rounded-xl border border-line-2 bg-paper p-4">
                <div className="flex flex-col gap-4 rounded-xl bg-ink p-5 text-white sm:flex-row sm:items-center">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                    <ShieldCheckIcon size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold">Сайт использует cookie</h4>
                    <p className="mt-1.5 text-[12px] leading-4 text-white/70">
                      Нужны для аналитики и корректной работы сервисов на сайте. Нажимая «Принять и продолжить», вы
                      соглашаетесь с условиями обработки cookie. Отключить их можно в настройках браузера.
                    </p>
                    <p className="mt-2 text-[11px] text-white/50">Политика обработки cookie →</p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg bg-white px-4 py-2.5 text-xs font-bold text-ink transition-colors hover:bg-white/90"
                  >
                    Принять и продолжить
                  </button>
                </div>
                <p className="mt-3 text-[12px] text-ink/50">
                  Подстроится под тему браузера посетителя — здесь показан тёмный вариант.
                </p>
              </div>

              <p className="mb-2 mt-6 font-mono text-[10.5px] uppercase tracking-[0.09em] text-ink/50">
                подвал сайта после установки
              </p>
              <div className="rounded-xl border border-line-2 bg-paper p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-ink px-4 py-3 text-white">
                  <span className="flex items-center gap-2 text-[13px] font-bold">
                    <span className="h-2 w-3 rounded-sm bg-brand-soft" /> Слеза
                  </span>
                  <span className="h-4 w-px bg-white/20" />
                  {PILLS.map((pill) => (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setOpenPill(openPill === pill.id ? null : pill.id)}
                      aria-expanded={openPill === pill.id}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${RING} ${
                        openPill === pill.id ? 'border-white/60 bg-white/15 text-white' : 'border-white/20 text-white/80 hover:text-white'
                      }`}
                    >
                      {pill.label}
                      {pill.locked && <span className="text-[10px] text-white/50">🔒</span>}
                    </button>
                  ))}
                  <a className="ml-auto cursor-pointer text-[12px] font-semibold text-white/70 underline-offset-2 hover:underline">
                    Реквизиты
                  </a>
                </div>

                {openPill && (
                  <div className="mt-3 rounded-xl border border-line bg-white p-4 shadow-sm">
                    {PILLS.filter((p) => p.id === openPill).map((pill) => {
                      const isMarketing = pill.id === 'marketing';
                      const checked = isMarketing ? marketingOn : pdOn;
                      return (
                        <div key={pill.id}>
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-mono text-[10.5px] uppercase tracking-[0.09em] text-ink/50">{pill.meta}</p>
                            <button
                              type="button"
                              onClick={() => setOpenPill(null)}
                              className={`rounded p-1 text-ink/40 hover:text-ink ${RING}`}
                              aria-label="Закрыть"
                            >
                              <CloseIcon size={16} />
                            </button>
                          </div>
                          <h4 className="mt-1 text-[15px] font-bold">{pill.title}</h4>
                          <p className="mt-2 text-[13px] leading-5 text-ink/60">{pill.body}</p>
                          {isMarketing && !pdOn && (
                            <p className="mt-3 rounded-lg bg-warn/10 px-3 py-2 text-[12.5px] text-ink/70">{pill.hint}</p>
                          )}
                          {pill.toggle && (
                            <label className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-warm px-3 py-2.5">
                              <span className="text-[13px] font-semibold">Моё согласие</span>
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={isMarketing && !pdOn}
                                onChange={() => (isMarketing ? setMarketingOn(!marketingOn) : togglePd())}
                                className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-line-2 transition-colors checked:bg-brand disabled:cursor-not-allowed disabled:opacity-40"
                              />
                            </label>
                          )}
                          {pill.lockNote && (
                            <p className="mt-3 flex items-center gap-2 rounded-lg bg-warm px-3 py-2.5 text-[12.5px] font-semibold text-ink/60">
                              🔒 {pill.lockNote}
                            </p>
                          )}
                          {pill.links && (
                            <div className="mt-3 flex flex-col gap-1.5">
                              {pill.links.map((l) => (
                                <span key={l} className="cursor-pointer text-[12.5px] font-semibold text-brand hover:text-ink">
                                  {l}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="mt-3 text-[12px] text-ink/50">
                  Подстроится под тему браузера посетителя — здесь показан тёмный вариант.
                </p>
              </div>

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
                onClick={() => router.push('/app/start/code')}
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
