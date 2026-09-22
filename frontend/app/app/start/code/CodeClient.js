'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  CloseIcon,
  MailIcon,
  RefreshIcon,
} from '../../../../components/app/AppIcons';
import { RING, AnketaFrame, Field, Segmented, SectionHead } from '../_shared/AnketaChrome';
import { loadAnketa, saveAnketa } from '../_shared/anketaState';

const SITE_ID = '486312';

// Инструкция зависит от платформы, названной на «О сайте»: на документы она
// не влияет, а вот куда именно вставлять код — влияет только она.
const PLATFORM_STEPS = {
  'Тильда': [
    'Откройте настройки сайта → «Ещё» → «HTML-код для вставки внутрь head».',
    'Вставьте строку и сохраните.',
    'Опубликуйте сайт — без публикации изменения на него не попадают.',
  ],
  'WordPress': [
    'Откройте «Внешний вид» → «Редактор тем» → header.php.',
    'Вставьте строку перед закрывающим тегом </head>.',
    'Сохраните файл.',
  ],
  'Битрикс': [
    'Откройте шаблон сайта: «Настройки» → «Редактор шаблонов» → header.php.',
    'Вставьте строку перед закрывающим тегом </head>.',
    'Сохраните и сбросьте кеш сайта.',
  ],
  default: [
    'Откройте редактор сайта или панель управления.',
    'Найдите раздел для вставки кода в head или перед </body>.',
    'Вставьте строку и сохраните изменения.',
  ],
};

export default function CodeClient() {
  const router = useRouter();
  const [platform, setPlatform] = useState('');
  const [role, setRole] = useState('');
  const [mailTo, setMailTo] = useState('');
  const [domain, setDomain] = useState('');

  useEffect(() => {
    const a = loadAnketa();
    setDomain(a.domain || '');
    setPlatform(a.platform || '');
    setRole(a.role || '');
    setMailTo(a.personEmail || '');
  }, []);

  // Подрядчику выбор не показываем: он сам и есть тот, кому поручают,
  // ветка у него всегда «поставлю сам».
  const isContractor = role === 'Подрядчик';
  const [mode, setMode] = useState('Поставлю сам');
  const effectiveMode = isContractor ? 'Поставлю сам' : mode;

  const [copied, setCopied] = useState(false);
  const [probes, setProbes] = useState(0);
  const [found, setFound] = useState(false);
  const [failOpen, setFailOpen] = useState(false);
  const [doneOpen, setDoneOpen] = useState(false);
  const [sent, setSent] = useState(false);

  const snippet = `<script src="https://cdn.sleza.media/w.js" data-site="${SITE_ID}" async></script>`;
  const steps = PLATFORM_STEPS[platform] || PLATFORM_STEPS.default;

  function copyCode() {
    navigator.clipboard?.writeText(snippet).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Честная имитация, как и подтверждение почты раньше: первая проверка не
  // находит код (он мог не успеть попасть в кеш — это нормально, а не ошибка
  // человека), вторая находит. Неудача показывается попапом, а не блоком в
  // потоке: шаг и так длинный, а ответ на нажатие должен попасться на глаза.
  // «Проверяем…» на время проверки: без него кнопка неотличима от
  // сломанной (макет, 9.09).
  const [checking, setChecking] = useState(false);
  function checkScript() {
    if (checking) return;
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      const next = probes + 1;
      setProbes(next);
      if (next >= 2) setFound(true);
      else setFailOpen(true);
    }, 1200);
  }

  function startTrial() {
    saveAnketa({ installed: found, installMode: effectiveMode, trialStartedAt: Date.now() });
    setDoneOpen(true);
  }

  return (
    <AnketaFrame current={5} title="Установка" nextLabel="Готово" lead={<>Осталось добавить на сайт одну строку кода и проверить, что она встала. После этого включим документы и виджет на 24 часа бесплатно.</>}>

            <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
              {!isContractor && (
                <>
                  <SectionHead id="h-mode" title="Кто поставит код?" hint="Выберите удобный вариант установки" />
                  <div className="mt-5">
                    <Segmented options={['Поставлю сам', 'Поручу другому']} value={mode} onChange={setMode} ariaLabelledby="h-mode" />
                  </div>
                  <div className="my-7 h-px bg-line" />
                </>
              )}

              {effectiveMode === 'Поставлю сам' ? (
                <div className="space-y-7">
                  <div>
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-[15px] font-bold">Скопируйте код</h3>
                        <p className="mt-1 text-sm text-ink/60">Одна строка — ставится один раз и работает на всех страницах.</p>
                      </div>
                      <button
                        type="button"
                        onClick={copyCode}
                        className={`shrink-0 rounded-lg border border-line bg-white px-3 py-2 text-xs font-bold transition hover:border-brand hover:text-brand ${RING}`}
                      >
                        {copied ? '✓ Скопировано' : 'Скопировать код'}
                      </button>
                    </div>
                    <pre className="overflow-x-auto rounded-xl bg-ink p-5 font-mono text-[12px] leading-6 text-white/85">
                      <code>{snippet}</code>
                    </pre>
                  </div>

                  <div>
                    <h3 className="text-[15px] font-bold">
                      Вставьте на сайт{platform ? ` — ${platform}` : ''}
                    </h3>
                    <p className="mt-1 text-sm text-ink/60">
                      {platform
                        ? 'Инструкция под платформу, которую вы назвали на шаге «О сайте».'
                        : 'Платформа не указана — общая инструкция.'}
                    </p>
                    {/* Пункты списком, без кружков-номеров: нумерация внутри
                        «Шага 6 из 6» спорила со счётчиком самой анкеты. */}
                    <ul className="mt-4 space-y-2.5">
                      {steps.map((t) => (
                        <li key={t} className="flex gap-3 text-sm leading-5 text-ink/70">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Только на телефоне: лезть в админку сайта с телефона
                      нереалистично, честный сценарий — переслать себе и доделать
                      с компьютера. На компьютере человек и так за ним (макет). */}
                  <div className="rounded-xl border border-line bg-warm p-4 lg:hidden">
                    <h3 className="text-[15px] font-bold">Отправьте себе на почту</h3>
                    <p className="mt-1 text-sm text-ink/60">Удобнее с компьютера — пришлём код и инструкцию на вашу почту.</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      <Field
                        label="Почта"
                        placeholder="kirill@alfa-school.ru"
                        icon={MailIcon}
                        type="email"
                        value={mailTo}
                        onChange={(e) => {
                          setMailTo(e.target.value);
                          setSent(false);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setSent(true)}
                        className={`h-[52px] shrink-0 rounded-xl border border-line bg-white px-5 text-sm font-bold shadow-sm transition hover:border-brand hover:text-brand ${RING}`}
                      >
                        {sent ? '✓ Отправили' : 'Отправить'}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-line bg-warm p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-[15px] font-bold">Проверьте, что код заработал</h3>
                        <p className="mt-1 text-sm text-ink/60">Откроем ваш сайт и поищем строку кода на странице.</p>
                      </div>
                      {!found && (
                        <button
                          type="button"
                          onClick={checkScript}
                          disabled={checking}
                          aria-busy={checking}
                          className={`flex shrink-0 items-center gap-2 rounded-lg bg-white px-3.5 py-2.5 text-xs font-bold text-brand shadow-sm ring-1 ring-line transition hover:ring-brand disabled:cursor-wait disabled:text-ink/60 ${RING}`}
                        >
                          <RefreshIcon size={14} className={checking ? 'animate-spin' : ''} /> {checking ? 'Проверяем…' : 'Проверить скрипт на сайте'}
                        </button>
                      )}
                    </div>
                    {found && (
                      <p className="mt-3 flex items-center gap-2 rounded-lg bg-ok/10 px-3 py-2.5 text-[13px] font-semibold text-ok">
                        <CheckIcon size={16} /> Всё на месте. Осталось активировать пробный период — 24 часа документы и
                        виджет работают бесплатно.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-line bg-warm p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/[0.08] text-brand">
                      <MailIcon size={18} />
                    </span>
                    <div>
                      <h3 className="text-[15px] font-bold">Отправьте инструкцию ответственному</h3>
                      <p className="mt-1 text-sm text-ink/60">Ему уйдёт код и пошаговая инструкция под вашу платформу.</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <Field
                      label="Почта того, кто ведёт сайт"
                      placeholder="webmaster@alfa-school.ru"
                      icon={MailIcon}
                      type="email"
                      value={mailTo}
                      onChange={(e) => {
                        setMailTo(e.target.value);
                        setSent(false);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setSent(true)}
                      className={`h-[52px] shrink-0 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1a1acc] ${RING}`}
                    >
                      {sent ? '✓ Отправили' : 'Отправить инструкцию'}
                    </button>
                  </div>
                  <p className="mt-4 text-[13px] leading-5 text-ink/60">
                    Разбираться самим не обязательно — перешлите тому, кто ведёт сайт: разработчику, агентству или
                    веб-мастеру. Как только код появится на сайте, мы увидим это сами и напишем вам. Вернётесь в
                    кабинет по ссылке из письма и запустите пробный период — отсчёт начнётся с вашего нажатия, а не с
                    момента установки.
                  </p>
                </div>
              )}

              <div className="mt-8 border-t border-line pt-6">
                <button
                data-funnel-next
                  type="button"
                  onClick={startTrial}
                  className={`flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#1a1acc] ${RING}`}
                >
                  Активировать пробный период <ArrowRightIcon size={17} />
                </button>
                <p className="mt-3 text-center text-[13px] text-ink/60">
                  Пробный период пойдёт с момента активации, а не с момента установки.
                </p>
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => router.push('/app/sites')}
                    className={`rounded text-sm font-semibold text-ink/60 transition-colors hover:text-ink ${RING}`}
                  >
                    Поставлю позже →
                  </button>
                </div>
              </div>
            </section>

            {/* На телефоне эту пару повторяет нижняя панель — докрутив до конца,
                человек видел одни и те же кнопки дважды (правка владельца). */}
            <div className="mt-7 hidden gap-3 border-t border-line pt-5 lg:flex">
              <button
                type="button"
                onClick={() => router.push('/app/start/documents')}
                className={`flex h-[52px] items-center justify-center gap-2 rounded-xl border border-line bg-white px-6 text-sm font-bold shadow-sm transition hover:border-line-2 ${RING}`}
              >
                <ArrowLeftIcon size={17} /> Назад
              </button>
            </div>

      {failOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="fail-title"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 p-4"
        >
          <div className="mt-16 w-full max-w-[420px] rounded-2xl border border-line bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h3 id="fail-title" className="text-[17px] font-bold tracking-[-0.02em]">
                Пока не видим скрипт
              </h3>
              <button
                type="button"
                onClick={() => setFailOpen(false)}
                className={`rounded p-1 text-ink/40 hover:text-ink ${RING}`}
                aria-label="Закрыть"
              >
                <CloseIcon size={18} />
              </button>
            </div>
            {/* Текст и два выхода — из живого макета (modal-no-script): тупиковое
                «Понятно» оставляло человека один на один с проблемой. */}
            <p className="mt-3 text-[13px] leading-5 text-ink/60">
              Не нашли код на сайте{domain && <> <b className="font-bold text-ink">{domain}</b></>}. Проверьте, что строка
              вставлена и страница опубликована, и попробуйте ещё раз через минуту — иногда страница не успевает
              обновиться.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setFailOpen(false);
                  checkScript();
                }}
                className={`rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1a1acc] ${RING}`}
              >
                Проверить ещё раз
              </button>
              <button
                type="button"
                onClick={() => router.push('/app/support')}
                className={`rounded-xl px-3 py-3 text-sm font-semibold text-ink/60 hover:text-ink ${RING}`}
              >
                Написать в поддержку
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Финал анкеты. Текст зависит от того, нашли ли код: обещать
          «всё работает» там, где скрипта на странице нет, нельзя — но и
          держать человека на шаге из-за этого тоже незачем. */}
      {doneOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="done-title" className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 p-4">
          <div className="mt-16 w-full max-w-[440px] rounded-2xl border border-line bg-white p-6 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ok/10 text-ok">
              <CheckIcon size={22} />
            </span>
            <h3 id="done-title" className="mt-4 text-lg font-bold tracking-[-0.03em]">
              Пробный период активирован
            </h3>
            <p className="mt-3 text-[13px] leading-5 text-ink/65">
              {found
                ? 'Код на сайте нашли — документы и виджет уже работают. Первые 24 часа — бесплатно, дальше понадобится оплата.'
                : 'Код на сайте мы пока не видим: проверка занимает до 15 минут. Заходить в кабинет можно уже сейчас — как только код появится, документы и виджет включатся сами.'}
            </p>
            <button
                data-funnel-back
              type="button"
              onClick={() => router.push('/app/site')}
              className={`mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#1a1acc] ${RING}`}
            >
              Перейти в кабинет <ArrowRightIcon size={17} />
            </button>
          </div>
        </div>
      )}
    </AnketaFrame>
  );
}
