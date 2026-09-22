'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, ArrowRightIcon, CloseIcon, ShieldCheckIcon } from '../../../../components/app/AppIcons';
import { CURRENT_USER } from '../../../../lib/appMock';
import { RING, AnketaFrame, SectionHead, Tile } from '../_shared/AnketaChrome';
import { PD_FIELDS, PURPOSES, PURPOSE_MAP } from '../../../../lib/anketaOptions';
import { loadAnketa, markStepDone, saveAnketa } from '../_shared/anketaState';

export default function ClientsClient() {
  const router = useRouter();

  // Сфера приходит с прошлого шага. Без неё показываем полный набор целей:
  // лишние пункты человек просто не отметит, а пустого экрана не бывает.
  const [sphere, setSphere] = useState('other');
  useEffect(() => {
    const saved = loadAnketa().sphere;
    if (saved && PURPOSE_MAP[saved]) setSphere(saved);
  }, []);
  const visiblePurposes = PURPOSES.filter((p) => (PURPOSE_MAP[sphere] || PURPOSE_MAP.other).includes(p.value));

  const [purposes, setPurposes] = useState([]);
  const [purposeError, setPurposeError] = useState(null);
  const [purposeWhy, setPurposeWhy] = useState(false);

  const [fields, setFields] = useState([]);
  const [fieldsError, setFieldsError] = useState(null);
  const [fieldsWhy, setFieldsWhy] = useState(false);

  const [calls, setCalls] = useState('Да');
  const [restored, setRestored] = useState(false);

  // Возврат на шаг («Назад», F5, «Продолжить анкету» из списка сайтов)
  // показывает то, что уже ответили: ответы лежат в анкете, и терять их
  // между экранами нельзя. Читаем после монтирования — страница статическая,
  // и первая отрисовка должна совпасть с серверной.
  useEffect(() => {
    const a = loadAnketa();
    // Цели, которых для текущей сферы нет, снимаются: сферу могли поменять
    // на прошлом шаге, а невидимая отметка уехала бы в согласие (как в
    // макете, 17.09 — «цель оставалась отмеченной после смены сферы»).
    const allowed = PURPOSE_MAP[a.sphere] || PURPOSE_MAP.other;
    if (a.purposes?.length) setPurposes(a.purposes.filter((v) => allowed.includes(v)));
    if (a.pdFields?.length) setFields(a.pdFields);
    if (typeof a.callsBase === 'boolean') setCalls(a.callsBase ? 'Да' : 'Нет');
    setRestored(true);
  }, []);

  // Черновик пишется на каждое изменение, а не только по «Далее»: иначе
  // «Назад» и F5 теряют всё, что набрано на этом шаге. Пишем только после
  // восстановления — иначе пустые значения первой отрисовки затрут анкету.
  useEffect(() => {
    if (restored) saveAnketa({ purposes, pdFields: fields, callsBase: calls === 'Да' });
  }, [restored, purposes, fields, calls]);
  const [callsWhy, setCallsWhy] = useState(false);
  const [noCallsOpen, setNoCallsOpen] = useState(false);

  function toggle(list, setList, value) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function goNext() {
    saveAnketa({ purposes, pdFields: fields, callsBase: calls === 'Да' });
    markStepDone(3);
    router.push('/app/start/requisites');
  }

  function handleNext() {
    let ok = true;

    // Проверяем только видимые цели: набор зависит от сферы.
    if (purposes.length === 0) {
      setPurposeError('Отметьте хотя бы одну цель — без них в политике нечего описывать.');
      ok = false;
    } else {
      setPurposeError(null);
    }

    if (fields.length === 0) {
      setFieldsError('Отметьте хотя бы одно — без состава данных политику и согласие составить нельзя.');
      ok = false;
    } else {
      setFieldsError(null);
    }

    if (!ok) return;

    // Ответ «Нет» — не запрет, а повод предупредить один раз: документ в
    // пакете есть, и если однажды напишут по базе, согласие уже будет.
    if (calls === 'Нет') {
      setNoCallsOpen(true);
      return;
    }
    goNext();
  }

  return (
    <AnketaFrame current={2} title="Данные клиентов" lead={<>Как вы работаете с контактами клиентов. От этого зависят согласия и тексты, которые встанут у форм на сайте.</>}>

            <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
              <div className="border-b border-line pb-7">
                <SectionHead
                  id="h-purpose"
                  title="Цели сбора контактов"
                  required
                  hint="Отметьте всё, что подходит — по этим целям соберём формулировки согласия и текст у форм на сайте."
                  whyOpen={purposeWhy}
                  onWhy={() => setPurposeWhy(!purposeWhy)}
                  why="Цель обработки — обязательная часть согласия: использовать данные для цели, которая в нём не названа, нельзя. Поэтому отмеченное определяет, что будет написано в согласии и в тексте у формы на сайте."
                />
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="group" aria-labelledby="h-purpose">
                  {visiblePurposes.map((p) => (
                    <Tile
                      key={p.value}
                      title={p.label}
                      description={p.hint}
                      selected={purposes.includes(p.value)}
                      onClick={() => {
                        toggle(purposes, setPurposes, p.value);
                        setPurposeError(null);
                      }}
                    />
                  ))}
                </div>
                {purposeError && <p className="mt-3 text-[12px] font-semibold text-danger">{purposeError}</p>}
              </div>

              <div className="border-b border-line py-7">
                <SectionHead
                  id="h-fields"
                  title="Какие данные собираете"
                  required
                  hint="Что посетитель вводит в формы на сайте. Из отмеченного соберём состав данных в политике и в согласии — перечислить его там обязательно."
                  whyOpen={fieldsWhy}
                  onWhy={() => setFieldsWhy(!fieldsWhy)}
                  why="Состав данных — вторая обязательная часть и политики, и согласия, наравне с целью. Перечислять его нужно точно: если в документе написан Telegram, а вы пишете в WhatsApp, документ неточен."
                />
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="group" aria-labelledby="h-fields">
                  {PD_FIELDS.map((f) => (
                    <Tile
                      key={f.value}
                      title={f.label}
                      description={f.hint}
                      compact={!f.hint}
                      selected={fields.includes(f.value)}
                      onClick={() => {
                        toggle(fields, setFields, f.value);
                        setFieldsError(null);
                      }}
                    />
                  ))}
                </div>
                {fieldsError && <p className="mt-3 text-[12px] font-semibold text-danger">{fieldsError}</p>}
              </div>

              <div className="pt-7">
                <SectionHead
                  id="h-calls"
                  title="Звонки и письма по базе клиентов"
                  required
                  hint="Ответьте, обращаетесь ли вы к клиентам из своей базы — звонком, в мессенджере или письмом."
                  whyOpen={callsWhy}
                  onWhy={() => setCallsWhy(!callsWhy)}
                  why="Ответ определяет, какие каналы будут названы в согласии на рекламные сообщения. Сам документ входит в пакет в любом случае: рассылка по своей базе без такого согласия незаконна — так требует 38-ФЗ ч.1 ст.18."
                />
                <div
                  className="mt-5 inline-flex rounded-xl border border-line bg-warm p-1"
                  role="group"
                  aria-labelledby="h-calls"
                >
                  {['Да', 'Нет'].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCalls(item)}
                      aria-pressed={calls === item}
                      className={`min-w-24 rounded-lg px-7 py-2.5 text-sm font-bold transition-all ${RING} ${
                        calls === item ? 'bg-brand text-white shadow-sm' : 'text-ink/80 hover:text-ink'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* На телефоне эту пару повторяет нижняя панель — докрутив до конца,
                человек видел одни и те же кнопки дважды (правка владельца). */}
            <div className="mt-7 hidden gap-3 border-t border-line pt-5 lg:flex">
              <button
                type="button"
                onClick={() => router.push('/app/start/site')}
                className={`flex h-[52px] items-center justify-center gap-2 rounded-xl border border-line bg-white px-6 text-sm font-bold shadow-sm transition hover:border-line-2 ${RING}`}
              >
                <ArrowLeftIcon size={17} /> Назад
              </button>
              <button
                data-funnel-next
                type="button"
                onClick={handleNext}
                className={`flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#1a1acc] ${RING}`}
              >
                Далее <ArrowRightIcon size={17} />
              </button>
            </div>

      {noCallsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="no-calls-title"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 p-4"
        >
          <div className="mt-16 w-full max-w-[420px] rounded-2xl border border-line bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h3 id="no-calls-title" className="text-[17px] font-bold tracking-[-0.02em]">
                Если однажды начнёте писать по базе
              </h3>
              <button
                type="button"
                onClick={() => setNoCallsOpen(false)}
                className={`rounded p-1 text-ink/40 hover:text-ink ${RING}`}
                aria-label="Закрыть"
              >
                <CloseIcon size={18} />
              </button>
            </div>
            <p className="mt-3 text-[13px] leading-5 text-ink/60">
              Вы ответили, что не пишете и не звоните по базе клиентов. Если однажды отправите письмо или сообщение по
              базе, на это нужно предварительное согласие адресата — так требует 38-ФЗ ч.1 ст.18. Согласие уже входит в
              ваш пакет, доплачивать за него не нужно.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setNoCallsOpen(false);
                  setCalls('Да');
                }}
                className={`rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#1a1acc] ${RING}`}
              >
                Вернуться и отметить
              </button>
              <button
                data-funnel-back
                type="button"
                onClick={() => {
                  setNoCallsOpen(false);
                  goNext();
                }}
                className={`rounded-xl px-3 py-3 text-sm font-semibold text-ink/60 transition-colors hover:text-ink ${RING}`}
              >
                Понятно, дальше
              </button>
            </div>
          </div>
        </div>
      )}
    </AnketaFrame>
  );
}
