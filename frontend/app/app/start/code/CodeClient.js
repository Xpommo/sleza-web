'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  CloseIcon,
  CopyIcon,
  LinkIcon,
  MailIcon,
  RefreshIcon,
} from '../../../../components/app/AppIcons';
import { TelegramIcon } from '../../../../components/app/AuthBits';
import { EMAIL_RE } from '../../../../lib/validate';
import { PLATFORMS } from '../../../../lib/anketaOptions';
import { RING, AnketaFrame, Field, SectionHead } from '../_shared/AnketaChrome';
import { loadAnketa, saveAnketa } from '../_shared/anketaState';
import { PRICE_LABEL, TRIAL_DAYS, trialEnds } from '../../site/_shared/subscription';
import { MAIN, setCurrentSite } from '../../site/_shared/sites';
import { useDialog } from '../../site/_shared/SiteChrome';

const SITE_ID = '486312';
// Страница с инструкцией: код и шаги под платформу — её и пересылают
// исполнителю. Ссылка короче и надёжнее простыни текста в мессенджере, код в
// переписке не ломается. В прототипе адрес условный.
const INSTRUCTION_URL = `https://cdn.sleza.media/${SITE_ID}/install`;

// «Шаги установки для Тильды» — платформа в родительном падеже.
const PLATFORM_FOR = { 'Тильда': 'Тильды', 'WordPress': 'WordPress', 'Битрикс': 'Битрикса' };

const SHARE_BTN = `inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-bold shadow-sm transition hover:border-brand hover:text-brand ${RING}`;

// Инструкция зависит от платформы, названной на «О сайте»: на документы она
// не влияет, а вот куда именно вставлять код — влияет только она.
const PLATFORM_STEPS = {
  'Тильда': [
    'Откройте настройки сайта → «Ещё» → «HTML-код для вставки внутрь head».',
    'Вставьте строку и сохраните.',
    'Опубликуйте сайт: без публикации изменения на него не попадают.',
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

const MODES = ['Поставлю сам', 'Поручу другому'];

// «Кто поставит код?» — вкладками, а не сегментом (владелец 23.09): это
// переключение инструкции, а не ответ, который попадёт в документы, поэтому
// одна вкладка всегда открыта. Сегмент с синей подложкой выглядел выбранным
// за клиента ответом и спорил с главной кнопкой шага.
function ModeTabs({ mode, onChange }) {
  const refs = useRef([]);
  function onKey(e, i) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const j = (i + (e.key === 'ArrowRight' ? 1 : MODES.length - 1)) % MODES.length;
    onChange(MODES[j]);
    refs.current[j]?.focus();
  }
  return (
    <div role="tablist" aria-labelledby="h-mode" className="mt-4 flex gap-7 border-b border-line">
      {MODES.map((m, i) => (
        <button
          key={m}
          ref={(el) => (refs.current[i] = el)}
          type="button"
          role="tab"
          id={`mode-tab-${i}`}
          aria-selected={mode === m}
          aria-controls="mode-panel"
          tabIndex={mode === m ? 0 : -1}
          onClick={() => onChange(m)}
          onKeyDown={(e) => onKey(e, i)}
          className={`-mb-px rounded-t-md border-b-2 pb-3 pt-1 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
            mode === m ? 'border-ink text-ink' : 'border-transparent text-ink/60 hover:text-ink'
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

export default function CodeClient() {
  const router = useRouter();
  const [platform, setPlatform] = useState('');
  // Платформу можно поправить прямо здесь: ошибиться на шаге «О сайте» —
  // обычное дело, а возвращаться ради неё в анкету незачем (владелец 24.09).
  const [platformPick, setPlatformPick] = useState(false);
  function changePlatform(p) {
    setPlatform(p);
    saveAnketa({ platform: p });
    setPlatformPick(false);
  }
  const [role, setRole] = useState('');
  // Почта «себе» (только на телефоне) и почта исполнителя — разные поля:
  // раньше они делили одно, и исполнителю по умолчанию стояла почта клиента.
  const [selfMail, setSelfMail] = useState('');
  const [selfSent, setSelfSent] = useState(false);
  const [selfError, setSelfError] = useState(null);
  const [mailTo, setMailTo] = useState('');
  const [mailError, setMailError] = useState(null);
  const [mailOpen, setMailOpen] = useState(false);
  // Чем поделились: mail | tg | copy | share. После этого вместо кнопок —
  // что произошло и что дальше, и главной становится «Перейти в кабинет».
  const [shared, setShared] = useState(null);
  const [canShare, setCanShare] = useState(false);
  const [domain, setDomain] = useState('');

  useEffect(() => {
    const a = loadAnketa();
    setDomain(a.domain || '');
    setPlatform(a.platform || '');
    setRole(a.role || '');
    setSelfMail(a.personEmail || '');
    // Системное меню «Поделиться» (на телефоне — с MAX, WhatsApp, Telegram):
    // у MAX нет ссылки для выбора собеседника, как у Telegram, — только так.
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    // Вернулись на шаг, когда код уже найден, — показываем найденное, а не
    // просим проверять заново.
    if (a.installed && a.trialStartedAt) {
      setFound(true);
      setTrialTo(trialEnds(a));
    }
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
  // Окно «Пока не видим код» — как окна «Баланса и платежей»: фокус внутрь, Tab по
  // кругу, Escape закрывает (failOpen перезапускает хук при открытии).
  const failRef = useRef(null);
  useDialog(failRef, () => setFailOpen(false), failOpen);
  const [trialTo, setTrialTo] = useState('');

  const shareText = `Инструкция по установке кода на ${domain || 'сайт'}`;
  function shareMail() {
    const v = mailTo.trim();
    if (!EMAIL_RE.test(v)) {
      setMailError(v ? 'Нужен e-mail вида name@site.ru.' : 'Укажите e-mail того, кто ведёт сайт.');
      return;
    }
    setShared({ kind: 'mail', to: v });
  }
  function shareTelegram() {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(INSTRUCTION_URL)}&text=${encodeURIComponent(shareText)}`, '_blank', 'noopener');
    setShared({ kind: 'tg' });
  }
  function shareCopy() {
    navigator.clipboard?.writeText(INSTRUCTION_URL).catch(() => {});
    setShared({ kind: 'copy' });
  }
  async function shareSystem() {
    try {
      await navigator.share({ title: shareText, text: shareText, url: INSTRUCTION_URL });
      setShared({ kind: 'share' });
    } catch {
      /* закрыли меню — ничего не отправили */
    }
  }
  function sendSelf() {
    if (!EMAIL_RE.test(selfMail.trim())) {
      setSelfError('Нужен e-mail вида name@site.ru.');
      return;
    }
    setSelfSent(true);
  }

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
  // Код найден — ключевой момент подключения: фокус на сообщение, скринридер
  // прочтёт его сам (разбор 24.09: кнопка размонтировалась, фокус падал на
  // body, статус молчал).
  const foundRef = useRef(null);
  useEffect(() => {
    if (found) foundRef.current?.focus();
  }, [found]);
  function checkScript() {
    if (checking) return;
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      const next = probes + 1;
      setProbes(next);
      if (next >= 2) onFound();
      else setFailOpen(true);
    }, 1200);
  }

  // Пробный период стартует сам, как только код найден (решение владельца
  // 23.09): «поставил код — заработало», без отдельной кнопки «Активировать».
  // Отсчёт — с момента, когда документы реально на сайте, не раньше.
  function onFound() {
    const a = { installed: true, installMode: effectiveMode, trialStartedAt: Date.now() };
    saveAnketa(a);
    setFound(true);
    setTrialTo(trialEnds(a));
  }

  return (
    <AnketaFrame current={5} title="Установка" nextLabel={found || (effectiveMode === 'Поручу другому' && shared) ? 'В кабинет' : effectiveMode === 'Поставлю сам' ? 'Проверить' : canShare ? 'Поделиться' : 'Отправить'} lead={<>Как только код встанет на сайт, включим документы и виджет на {TRIAL_DAYS} дней бесплатно.</>}>

            <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
              {!isContractor && (
                <>
                  <SectionHead id="h-mode" title="Способ установки" />
                  <ModeTabs mode={mode} onChange={setMode} />
                </>
              )}

              <div
                {...(!isContractor && { role: 'tabpanel', id: 'mode-panel', 'aria-labelledby': `mode-tab-${MODES.indexOf(mode)}` })}
                className={isContractor ? '' : 'pt-7'}
              >
                {effectiveMode === 'Поставлю сам' ? (
                  <div className="space-y-7">
                    <div>
                      <div className="mb-3">
                        <h3 className="text-[15px] font-bold">Скопируйте код</h3>
                        <p className="mt-1 text-sm text-ink/60">Строка ставится один раз и работает на всех страницах.</p>
                      </div>
                      {/* Копирование — привычной иконкой в углу кода, как в
                          документации: кнопку-надпись над кодом не замечали
                          (владелец 23.09). После нажатия — галочка и «Скопировано». */}
                      <div className="relative">
                        <pre className="overflow-x-auto rounded-xl bg-ink p-5 pr-14 font-mono text-[12px] leading-6 text-white/85">
                          <code>{snippet}</code>
                        </pre>
                        <button
                          type="button"
                          onClick={copyCode}
                          aria-label={copied ? 'Скопировано' : 'Скопировать код'}
                          title="Скопировать код"
                          className={`absolute right-2.5 top-2.5 inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition ${
                            copied ? 'bg-ok text-white' : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                          } ${RING}`}
                        >
                          {copied ? <CheckIcon size={15} /> : <CopyIcon size={16} />}
                          {copied && 'Скопировано'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-[15px] font-bold">
                        Вставьте на сайт{platform ? ` (${platform})` : ''}
                      </h3>
                      <p className="mt-1 text-sm text-ink/60">
                        {platform
                          ? 'Инструкция под платформу, которую вы назвали на шаге «О сайте».'
                          : 'Платформа не указана, поэтому инструкция общая.'}{' '}
                        <button
                          type="button"
                          onClick={() => setPlatformPick(!platformPick)}
                          aria-expanded={platformPick}
                          className={`rounded font-semibold text-brand hover:text-ink ${RING}`}
                        >
                          Другая платформа?
                        </button>
                      </p>
                      {platformPick && (
                        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Платформа сайта">
                          {PLATFORMS.map((p) => (
                            <button
                              key={p}
                              type="button"
                              aria-pressed={platform === p}
                              onClick={() => changePlatform(p)}
                              className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${RING} ${
                                platform === p ? 'border-brand bg-brand/[0.06] text-brand' : 'border-line bg-white text-ink/70 hover:border-line-2 hover:text-ink'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      )}
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
                      <h3 className="text-[15px] font-bold">Отправьте себе на e-mail</h3>
                      <p className="mt-1 text-sm text-ink/60">Удобнее с компьютера: пришлём код и инструкцию на ваш e-mail.</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                        <Field
                          label="E-mail" required
                          placeholder="kirill@alfa-school.ru"
                          icon={MailIcon}
                          type="email"
                          value={selfMail}
                          onChange={(e) => {
                            setSelfMail(e.target.value);
                            setSelfSent(false);
                            setSelfError(null);
                          }}
                          error={selfError}
                        />
                        <button
                          type="button"
                          onClick={sendSelf}
                          className={`h-[52px] shrink-0 rounded-xl border border-line bg-white px-5 text-sm font-bold shadow-sm transition hover:border-brand hover:text-brand ${RING}`}
                        >
                          {selfSent ? '✓ Отправили' : 'Отправить'}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-line bg-warm p-4">
                      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                        <div>
                          <h3 className="text-[15px] font-bold">Проверьте, что код заработал</h3>
                          <p className="mt-1 text-sm text-ink/60">Проверим, появился ли код на вашем сайте.</p>
                        </div>
                        {!found && (
                          <button
                            data-funnel-next
                            type="button"
                            onClick={checkScript}
                            // aria-disabled, а не disabled: отключённая кнопка теряет
                            // фокус, и после окна «Пока не видим код» он падал на body.
                            aria-disabled={checking}
                            aria-busy={checking}
                            className={`flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-hover sm:w-auto ${checking ? 'cursor-wait bg-brand/70' : ''} ${RING}`}
                          >
                            <RefreshIcon size={16} className={checking ? 'animate-spin' : ''} /> {checking ? 'Проверяем…' : 'Проверить код на сайте'}
                          </button>
                        )}
                      </div>
                      {found && (
                        <div ref={foundRef} tabIndex={-1} className={`mt-3 flex items-start gap-2 rounded-lg bg-ok/10 px-3 py-2.5 text-[13px] leading-5 text-ok-ink outline-none ${RING}`}>
                          <CheckIcon size={16} className="mt-0.5 shrink-0" />
                          <p>
                            <b className="font-bold">Код найден, документы и виджет уже работают.</b> Бесплатно до {trialTo}, дальше
                            {PRICE_LABEL} в год. Напомним письмом за день до конца.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-line bg-warm p-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/[0.08] text-brand">
                        <LinkIcon size={18} />
                      </span>
                      <div>
                        <h3 className="text-[15px] font-bold">Отправьте инструкцию тому, кто ведёт сайт</h3>
                        <p className="mt-1 text-sm text-ink/60">В ней код и шаги установки{PLATFORM_FOR[platform] ? ` для ${PLATFORM_FOR[platform]}` : ''}.</p>
                      </div>
                    </div>
                    {/* С исполнителем чаще переписываются в мессенджере, чем по
                        почте (владелец 23.09): делимся ссылкой на инструкцию любым
                        способом. На телефоне — системное меню (там и MAX); на
                        компьютере — Telegram, у которого есть выбор собеседника. */}
                    {!shared ? (
                      <>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {canShare ? (
                            <button
                              data-funnel-next
                              type="button"
                              onClick={shareSystem}
                              className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-hover ${RING}`}
                            >
                              <LinkIcon size={16} /> Поделиться
                            </button>
                          ) : (
                            <button data-funnel-next type="button" onClick={shareTelegram} className={SHARE_BTN}>
                              <TelegramIcon size={18} /> Telegram
                            </button>
                          )}
                          <button type="button" onClick={() => setMailOpen(!mailOpen)} aria-expanded={mailOpen} className={SHARE_BTN}>
                            <MailIcon size={17} /> E-mail
                          </button>
                          <button type="button" onClick={shareCopy} className={SHARE_BTN}>
                            <CopyIcon size={16} /> Скопировать ссылку
                          </button>
                        </div>
                        {mailOpen && (
                          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                            <Field
                              label="E-mail того, кто ведёт сайт" required
                              placeholder="webmaster@alfa-school.ru"
                              icon={MailIcon}
                              type="email"
                              autoComplete="off"
                              value={mailTo}
                              onChange={(e) => {
                                setMailTo(e.target.value);
                                setMailError(null);
                              }}
                              error={mailError}
                            />
                            <button
                              type="button"
                              onClick={shareMail}
                              className={`h-[52px] shrink-0 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-hover ${RING}`}
                            >
                              Отправить
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="mt-4 flex items-start gap-3 rounded-xl border border-ok/25 bg-ok/[0.06] p-4">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ok text-white">
                          <CheckIcon size={12} />
                        </span>
                        <div>
                          <p className="text-sm font-bold">
                            {{
                              mail: `Инструкцию отправили на ${shared.to}`,
                              tg: 'Открыли Telegram. Выберите, кому отправить инструкцию',
                              copy: 'Ссылку на инструкцию скопировали. Отправьте её исполнителю',
                              share: 'Инструкцией поделились',
                            }[shared.kind]}
                          </p>
                          <p className="mt-1 text-[13px] leading-5 text-ink/65">
                            Когда код появится на сайте, мы увидим это сами, и пробный период на {TRIAL_DAYS} дней начнётся
                            автоматически.
                          </p>
                          {/* Скопировали — ссылка перед глазами, её можно выделить
                              или скопировать снова; «Отправить ещё раз» после
                              копирования звучало бессмысленно (владелец 23.09). */}
                          {shared.kind === 'copy' && (
                            <p className="mt-2 flex items-center gap-2">
                              <span className="min-w-0 break-all font-mono text-[12px] text-ink/70">{INSTRUCTION_URL}</span>
                              <button type="button" onClick={shareCopy} aria-label="Скопировать ссылку" title="Скопировать ссылку" className={`shrink-0 rounded p-1 text-ink/60 hover:text-brand ${RING}`}>
                                <CopyIcon size={15} />
                              </button>
                            </p>
                          )}
                          <button type="button" onClick={() => setShared(null)} className={`mt-2 rounded text-[13px] font-semibold text-brand hover:text-ink ${RING}`}>
                            Выбрать другой способ
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Пока кода нет — заметка и «позже»; когда найден (или
                  инструкцию отправили), «Перейти в кабинет» встаёт вниз, рядом
                  с «Назад», как «Далее» на остальных шагах (владелец 24.09). */}
              {!(found || (effectiveMode === 'Поручу другому' && shared)) && (
                <div className="mt-8 flex flex-col items-center gap-3 border-t border-line pt-6 text-center">
                  <p className="text-[13px] leading-5 text-ink/60">
                    После пробного периода подписка стоит {PRICE_LABEL} в год.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push(effectiveMode === 'Поручу другому' ? '/app/site' : '/app/sites')}
                    className={`rounded text-sm font-semibold text-ink/60 transition-colors hover:text-ink ${RING}`}
                  >
                    {effectiveMode === 'Поручу другому' ? 'Перейти в кабинет →' : 'Поставлю позже →'}
                  </button>
                </div>
              )}
            </section>

            {/* На телефоне эту пару повторяет нижняя панель — докрутив до конца,
                человек видел одни и те же кнопки дважды (правка владельца). */}
            <div className="mt-7 hidden gap-3 border-t border-line pt-5 lg:flex">
              <button
                data-funnel-back
                type="button"
                onClick={() => router.push('/app/start/documents')}
                className={`flex h-[52px] items-center justify-center gap-2 rounded-xl border border-line bg-white px-6 text-sm font-bold shadow-sm transition hover:border-line-2 ${RING}`}
              >
                <ArrowLeftIcon size={17} /> Назад
              </button>
              {(found || (effectiveMode === 'Поручу другому' && shared)) && (
                <button
                  data-funnel-next
                  type="button"
                  onClick={() => {
                    setCurrentSite(MAIN);
                    router.push('/app/site');
                  }}
                  className={`flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-hover ${RING}`}
                >
                  Перейти в кабинет <ArrowRightIcon size={17} />
                </button>
              )}
            </div>

      {failOpen && (
        <div
          ref={failRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="fail-title"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 p-4 outline-none"
        >
          <div className="mt-16 w-full max-w-[420px] rounded-2xl border border-line bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h3 id="fail-title" className="text-lg font-bold tracking-[-0.02em]">
                Пока не видим код
              </h3>
              <button
                type="button"
                onClick={() => setFailOpen(false)}
                className={`-m-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink/60 transition hover:bg-warm hover:text-ink ${RING}`}
                aria-label="Закрыть"
              >
                <CloseIcon size={18} />
              </button>
            </div>
            {/* Текст и два выхода — из живого макета (modal-no-script): тупиковое
                «Понятно» оставляло человека один на один с проблемой. */}
            <p className="mt-3 text-[13px] leading-5 text-ink/60">
              Не нашли код на сайте{domain && <> <b className="font-bold text-ink">{domain}</b></>}. Проверьте, что строка
              вставлена и страница опубликована, и попробуйте ещё раз через минуту: иногда страница не успевает
              обновиться.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setFailOpen(false);
                  checkScript();
                }}
                className={`rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-hover ${RING}`}
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

    </AnketaFrame>
  );
}
