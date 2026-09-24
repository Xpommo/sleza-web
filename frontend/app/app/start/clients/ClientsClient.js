'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, ArrowRightIcon } from '../../../../components/app/AppIcons';
import { RING, AnketaFrame, SectionHead, Tile } from '../_shared/AnketaChrome';
import { PD_FIELDS, PURPOSES, PURPOSE_MAP, purposeLabel } from '../../../../lib/anketaOptions';
import { loadAnketa, markStepDone, saveAnketa } from '../_shared/anketaState';

// Порядок вопросов (владелец 23.09): что собираете → зачем → рассказываете
// ли об акциях. Каждый следующий опирается на предыдущий: из собранных
// контактов берутся каналы для согласия на рекламу, а «Да» на последний
// вопрос добавляет цель «информирование об акциях» в согласие и политику.
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

  // Без ответа по умолчанию — как у роли, сферы и платформы: отвечает
  // человек, а не мы. Раньше стояло «Да», а «Нет» встречало окно-уговор.
  const [promo, setPromo] = useState(null);
  const [promoError, setPromoError] = useState(null);
  const [promoWhy, setPromoWhy] = useState(false);
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
    if (typeof a.callsBase === 'boolean') setPromo(a.callsBase ? 'Да' : 'Нет');
    setRestored(true);
  }, []);

  const answers = () => ({ purposes, pdFields: fields, callsBase: promo === null ? undefined : promo === 'Да' });

  // Черновик пишется на каждое изменение, а не только по «Далее»: иначе
  // «Назад» и F5 теряют всё, что набрано на этом шаге. Пишем только после
  // восстановления — иначе пустые значения первой отрисовки затрут анкету.
  useEffect(() => {
    if (restored) saveAnketa(answers());
  }, [restored, purposes, fields, promo]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(list, setList, value) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function handleNext() {
    let ok = true;

    if (fields.length === 0) {
      setFieldsError('Отметьте хотя бы одно — без состава данных политику и согласие составить нельзя.');
      ok = false;
    } else {
      setFieldsError(null);
    }

    // Проверяем только видимые цели: набор зависит от сферы.
    if (purposes.length === 0) {
      setPurposeError('Отметьте хотя бы одну цель — без них в политике нечего описывать.');
      ok = false;
    } else {
      setPurposeError(null);
    }

    if (!promo) {
      setPromoError('Ответьте «Да» или «Нет» — от ответа зависят согласие и политика.');
      ok = false;
    } else {
      setPromoError(null);
    }

    if (!ok) return;
    saveAnketa(answers());
    markStepDone(3);
    router.push('/app/start/requisites');
  }

  return (
    <AnketaFrame current={2} title="Данные клиентов" lead={<>Как вы работаете с контактами клиентов — от этого зависят согласия у форм на сайте.</>}>

            <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
              <div className="border-b border-line pb-7">
                <SectionHead
                  id="h-fields"
                  title="Какие данные собираете"
                  required
                  whyOpen={fieldsWhy}
                  onWhy={() => setFieldsWhy(!fieldsWhy)}
                  why="Состав данных — обязательная часть политики и согласия, поэтому перечисляем его точно."
                />
                <div className="mt-5 grid gap-3 sm:grid-cols-2" role="group" aria-labelledby="h-fields">
                  {PD_FIELDS.map((f) => (
                    <Tile
                      key={f.value}
                      title={f.label}
                      compact
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

              <div className="border-b border-line py-7">
                <SectionHead
                  id="h-purpose"
                  title="Цели сбора контактов"
                  required
                  whyOpen={purposeWhy}
                  onWhy={() => setPurposeWhy(!purposeWhy)}
                  why="Цель обработки — обязательная часть согласия: отмеченное впишем в согласие и в политику."
                />
                <div className="mt-5 grid gap-3 sm:grid-cols-2" role="group" aria-labelledby="h-purpose">
                  {visiblePurposes.map((p) => (
                    <Tile
                      key={p.value}
                      title={purposeLabel(p.value, sphere)}
                      compact
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

              <div className="pt-7">
                <SectionHead
                  id="h-promo"
                  title="Рассказываете клиентам об акциях и новинках?"
                  required
                  whyOpen={promoWhy}
                  onWhy={() => setPromoWhy(!promoWhy)}
                  why="Звонить и писать клиентам об акциях можно только с их согласия — если рассказываете, впишем эту цель в согласие и политику."
                />
                <div className="mt-5 inline-flex rounded-xl border border-line bg-warm p-1" role="group" aria-labelledby="h-promo">
                  {['Да', 'Нет'].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setPromo(item);
                        setPromoError(null);
                      }}
                      aria-pressed={promo === item}
                      className={`min-w-24 rounded-lg px-7 py-2.5 text-sm font-bold transition-all ${RING} ${
                        promo === item ? 'bg-brand text-white shadow-sm' : 'text-ink/80 hover:text-ink'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                {/* «Нет» часто отвечают те, у кого рассылок нет, но менеджеры
                    звонят клиентам с новинками — это тоже реклама, и на неё нужно
                    согласие (владелец 24.09). Подсвечиваем именно этот случай. */}
                {promo === 'Нет' && (
                  <p className="mt-3 max-w-2xl text-[13px] leading-5 text-ink/60">
                    Звонок или сообщение клиенту о новинке — тоже реклама, даже от менеджера: если такое бывает, ответьте
                    «Да». Согласие на рекламу в пакете будет при любом ответе.
                  </p>
                )}
                {promoError && <p className="mt-3 text-[12px] font-semibold text-danger">{promoError}</p>}
              </div>
            </section>

            {/* На телефоне эту пару повторяет нижняя панель — докрутив до конца,
                человек видел одни и те же кнопки дважды (правка владельца). */}
            <div className="mt-7 hidden gap-3 border-t border-line pt-5 lg:flex">
              <button
                data-funnel-back
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
    </AnketaFrame>
  );
}
