'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, ArrowRightIcon, BurgerIcon, CloseIcon, ShieldCheckIcon } from '../../../../components/app/AppIcons';
import { CURRENT_USER } from '../../../../lib/appMock';
import { RING, Logo, Progress, Sidebar, SectionHead, Tile } from '../_shared/AnketaChrome';
import { loadAnketa, saveAnketa } from '../_shared/anketaState';

// Восемь целей на весь продукт: видны только те, что относятся к сфере,
// выбранной на «О сайте». Ни одна не отмечена по умолчанию — это реальный
// выбор, а не декорация: цель обработки уходит в согласие дословно.
const PURPOSES = [
  { value: 'booking', label: 'Записать на приём/занятие', hint: 'форма записи, кнопка «Записаться», запись на приём, занятие или демо' },
  { value: 'order', label: 'Оформить и передать заказ', hint: 'корзина, кнопка «Купить», оформление доставки' },
  { value: 'property', label: 'Показать объект, записать на просмотр', hint: 'заявка на просмотр, подбор объекта' },
  { value: 'consult', label: 'Проконсультировать по услуге', hint: 'форма «Задать вопрос», расчёт стоимости, бриф' },
  { value: 'contract', label: 'Заключить и исполнить договор', hint: 'подписание договора, счета, закрывающие документы' },
  { value: 'payment', label: 'Принять оплату онлайн', hint: 'оплата картой на сайте, ссылка на оплату' },
  { value: 'inquiry', label: 'Ответить на обращение', hint: 'форма обратной связи, «Заказать звонок», чат на сайте' },
  { value: 'promo', label: 'Рассказывать об акциях и новых предложениях', hint: 'рассылка, подписка на новости, письма об акциях' },
];

// Матрица «сфера → цели» собрана вместе с владельцем: у интернет-магазина и
// у салона списки разные. «Другое» показывает все восемь — человек, не
// нашедший свою сферу, должен видеть самый широкий список, а не самый узкий.
const PURPOSE_MAP = {
  school: ['booking', 'consult', 'payment', 'inquiry', 'promo'],
  kids: ['booking', 'consult', 'payment', 'inquiry', 'promo'],
  bizserv: ['consult', 'contract', 'payment', 'inquiry', 'promo'],
  homeserv: ['consult', 'contract', 'inquiry', 'promo'],
  beauty: ['booking', 'inquiry', 'promo'],
  medicine: ['booking', 'consult', 'inquiry', 'promo'],
  shop: ['order', 'payment', 'inquiry', 'promo'],
  food: ['order', 'payment', 'inquiry', 'promo'],
  realty: ['property', 'consult', 'contract', 'inquiry', 'promo'],
  finance: ['consult', 'contract', 'inquiry', 'promo'],
  media: ['consult', 'inquiry', 'promo'],
  it: ['booking', 'consult', 'contract', 'payment', 'inquiry', 'promo'],
  manuf: ['booking', 'consult', 'contract', 'inquiry', 'promo'],
  other: PURPOSES.map((p) => p.value),
};

const PD_FIELDS = [
  { value: 'name', label: 'Имя', hint: 'или ФИО, если нужно в договор' },
  { value: 'phone', label: 'Телефон' },
  { value: 'email', label: 'Email' },
  { value: 'messenger', label: 'Мессенджер', hint: 'Telegram, WhatsApp, MAX — напишем в документе те, что отметите' },
  { value: 'address', label: 'Адрес доставки', hint: 'если возите заказы' },
  { value: 'birth', label: 'Дата рождения', hint: 'запись на приём, скидки по возрасту' },
];

export default function ClientsClient() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

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
  const [callsWhy, setCallsWhy] = useState(false);
  const [noCallsOpen, setNoCallsOpen] = useState(false);

  function toggle(list, setList, value) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function goNext() {
    saveAnketa({ purposes, pdFields: fields, callsBase: calls === 'Да' });
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
    <div className="min-h-screen bg-warm text-ink">
      <div className="flex min-h-screen">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} current={2} />
        {menuOpen && (
          <button
            aria-label="Закрыть меню"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-20 bg-ink/20 lg:hidden"
          />
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

            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-brand">Шаг 3 из 6</p>
                <h1 className="text-3xl font-bold tracking-[-0.04em] sm:text-[40px]">Данные клиентов</h1>
                <p className="mt-3 max-w-2xl text-[15px] leading-6 text-ink/60 sm:text-[17px]">
                  Как вы работаете с контактами клиентов. От этого зависят согласия и тексты, которые встанут у форм
                  на сайте.
                </p>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-line bg-white px-3 py-2 text-xs font-semibold text-ink/55 shadow-sm sm:flex">
                <ShieldCheckIcon size={16} className="text-brand" /> Защищённая форма
              </div>
            </div>

            <Progress current={2} />

            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">
                {CURRENT_USER.name.slice(0, 1)}
              </div>
              <div>
                <p className="font-bold">{CURRENT_USER.name}</p>
                <p className="text-sm text-ink/55">вход через Telegram</p>
              </div>
            </div>

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
                {purposeError && <p className="mt-3 text-[12.5px] font-semibold text-danger">{purposeError}</p>}
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
                {fieldsError && <p className="mt-3 text-[12.5px] font-semibold text-danger">{fieldsError}</p>}
              </div>

              <div className="pt-7">
                <SectionHead
                  id="h-calls"
                  title="Звонки и письма по базе клиентов"
                  required
                  hint="Ответьте, обращаетесь ли вы к клиентам из своей базы — звонком, в мессенджере или письмом."
                  whyOpen={callsWhy}
                  onWhy={() => setCallsWhy(!callsWhy)}
                  why="Ответ определяет формулировку согласия на рекламные сообщения — какие каналы в нём названы. Без него рассылка по своей базе не законна (38-ФЗ ч.1 ст.18)."
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
                        calls === item ? 'bg-brand text-white shadow-sm' : 'text-ink/55 hover:text-ink'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <div className="mt-7 flex gap-3 border-t border-line pt-5">
              <button
                type="button"
                onClick={() => router.push('/app/start/site')}
                className={`flex h-[52px] items-center justify-center gap-2 rounded-xl border border-line bg-white px-6 text-sm font-bold shadow-sm transition hover:border-line-2 ${RING}`}
              >
                <ArrowLeftIcon size={17} /> Назад
              </button>
              <button
                type="button"
                onClick={handleNext}
                className={`flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#1a1acc] ${RING}`}
              >
                Далее <ArrowRightIcon size={17} />
              </button>
            </div>
          </div>
        </main>
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
                type="button"
                onClick={() => {
                  setNoCallsOpen(false);
                  goNext();
                }}
                className={`rounded-xl px-3 py-3 text-sm font-semibold text-ink/55 transition-colors hover:text-ink ${RING}`}
              >
                Понятно, дальше
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
