// Варианты ответов анкеты. Лежат отдельно, потому что их называют два
// места: сами шаги анкеты и документы, которые показывают, из каких ответов
// собраны (петля «ответ → результат» живого макета). Название варианта в
// документе должно совпадать с тем, что человек отметил, дословно.

// Тот же список и тот же порядок опций, что в анкете (cabinet-mvp.html):
// «regulated» нигде сейчас не показывается (владелец снял оговорку 8
// сентября) — поле оставлено, чтобы вернуть предупреждение без повторного
// разбора, когда до этого дойдёт очередь.
export const SPHERES = [
  { value: 'school', label: 'Онлайн-школа, курсы, репетиторство' },
  { value: 'kids', label: 'Детский центр, кружки, секции', regulated: true },
  { value: 'bizserv', label: 'Услуги для бизнеса (консалтинг, бухгалтерия, юр. услуги)' },
  { value: 'homeserv', label: 'Бытовые услуги (ремонт, клининг)' },
  { value: 'beauty', label: 'Красота и здоровье (салон, барбершоп, фитнес)' },
  { value: 'medicine', label: 'Медицина, клиники', regulated: true },
  { value: 'shop', label: 'Интернет-магазин' },
  { value: 'food', label: 'Кафе, ресторан, доставка еды' },
  { value: 'realty', label: 'Недвижимость' },
  { value: 'finance', label: 'Финансы, страхование', regulated: true },
  { value: 'media', label: 'СМИ, онлайн-издание', regulated: true },
  { value: 'it', label: 'IT, SaaS, разработка' },
  { value: 'manuf', label: 'Производство' },
  { value: 'other', label: 'Другое' },
];

export const PLATFORMS = ['Тильда', 'WordPress', 'Битрикс', 'Другое'];

// Без подписей в карточках и без «Не знаю» (правка владельца 23.09): зачем
// нужен ответ, говорит «Зачем это нужно» у вопроса, а «Не знаю» толкало
// отвечать наугад там, где человек может посмотреть. С подписью ушло и
// обещание «предупредим о рисках» у Google Analytics, ничем не подкреплённое.
export const ANALYTICS = [
  { value: 'metrika', label: 'Яндекс.Метрика' },
  { value: 'ga', label: 'Google Analytics' },
  { value: 'none', label: 'Ничего из этого нет', exclusive: true },
];

export const FEATURES = [
  { value: 'order', label: 'Оплата и оформление заказа на сайте' },
  { value: 'cabinet', label: 'Личный кабинет' },
  { value: 'chat', label: 'Чаты, всплывающие формы, обратный звонок' },
  { value: 'none', label: 'Ничего из этого нет', exclusive: true },
];

// Восемь целей на весь продукт: видны только те, что относятся к сфере,
// выбранной на «О сайте». Ни одна не отмечена по умолчанию — это реальный
// выбор, а не декорация: цель обработки уходит в согласие дословно.
export const PURPOSES = [
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
export const PURPOSE_MAP = {
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

export const PD_FIELDS = [
  { value: 'name', label: 'Имя', hint: 'или ФИО, если нужно в договор' },
  { value: 'phone', label: 'Телефон' },
  { value: 'email', label: 'Email' },
  { value: 'messenger', label: 'Мессенджер', hint: 'Telegram, WhatsApp, MAX — напишем в документе те, что отметите' },
  { value: 'address', label: 'Адрес доставки', hint: 'если возите заказы' },
  { value: 'birth', label: 'Дата рождения', hint: 'запись на приём, скидки по возрасту' },
];

