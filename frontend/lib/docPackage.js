// Состав пакета документов. Лежит отдельно, потому что один и тот же набор
// показывают два экрана: шаг 5 анкеты (что соберём) и «Документы» внутри
// сайта (что опубликовано). Разойтись они не должны.
//
// Пакет фиксирован: пять документов из структуры 1+2+2. Название — то, как
// человек думает о документе («согласие на рассылки»), закон — мелкой
// справкой рядом (решение 23.09: раньше строка начиналась с «38-ФЗ, ч.1 ст.18 · …»).
import { ANALYTICS, PD_FIELDS, PROMO_PURPOSE, PURPOSES } from './anketaOptions';

export const SITE_ID = '486312';

export const DOCUMENTS = [
  {
    id: '01',
    title: 'Реквизиты владельца',
    law: '149-ФЗ',
    preview: (v) => [v.operator, v.inn && `ИНН ${v.inn}`, v.ogrn, v.address].filter(Boolean).join(' · ') + '…',
  },
  {
    id: '02',
    title: 'Политика обработки cookie',
    law: '152-ФЗ',
    preview: (v) =>
      `Настоящая Политика определяет порядок использования файлов cookie и аналогичных технологий на сайте ${v.domain}, включая аналитику и работу виджета…`,
  },
  {
    id: '03',
    title: 'Политика обработки персональных данных',
    law: '152-ФЗ',
    preview: (v) =>
      `Настоящая Политика в отношении обработки персональных данных определяет порядок и условия обработки персональных данных Оператором: ${v.operator}. Цели обработки: ${v.purposes}…`,
  },
  {
    id: '12',
    title: 'Согласие на обработку персональных данных',
    law: '152-ФЗ',
    preview: (v) =>
      `Настоящим я свободно, своей волей и в своём интересе даю согласие на обработку моих персональных данных (${v.fields}) Оператору — ${v.operator} — в целях: ${v.purposes}…`,
  },
  {
    id: '13',
    title: 'Согласие на получение рекламных сообщений',
    law: '38-ФЗ',
    preview: (v) => `Настоящим я даю согласие на получение рекламных и информационных сообщений от ${v.operator} ${v.channels}…`,
  },
];

// Цели и состав данных — в той форме, в какой они стоят в тексте документа.
const PURPOSE_TEXT = {
  booking: 'запись на приём или занятие',
  order: 'оформление и передача заказа',
  property: 'показ объектов и запись на просмотр',
  consult: 'консультирование по услугам',
  contract: 'заключение и исполнение договора',
  payment: 'приём оплаты',
  inquiry: 'ответы на обращения',
  promo: 'информирование об акциях и новых предложениях',
};
const FIELD_TEXT = {
  name: 'имя или фамилия, имя, отчество',
  phone: 'номер телефона',
  email: 'адрес электронной почты',
  messenger: 'аккаунт в мессенджере',
  address: 'адрес доставки',
  birth: 'дата рождения',
};

// Оператор — так, как он называется в документах: ИП — с приставкой,
// самозанятый — по ФИО.
export function operatorName(a) {
  const n = a.companyName || '';
  if (!n) return '[наименование с шага «Реквизиты»]';
  return a.owner === 'ИП' && !/^ИП\s/.test(n) ? `ИП ${n}` : n;
}

// Цели сайта: отмеченные на шаге и «информирование об акциях», если на
// вопрос «Рассказываете клиентам об акциях и новинках?» ответили «Да».
export function sitePurposes(a) {
  const own = (a.purposes || []).filter((v) => v !== 'promo');
  return a.callsBase ? [...own, 'promo'] : own;
}

// Каналы в согласии на рекламу — из того, что сайт собирает: писать клиенту
// можно только туда, куда он оставил контакт. Раньше каналы были одни на всех.
const CHANNEL_TEXT = { phone: 'по телефону (звонки и SMS)', messenger: 'в мессенджерах', email: 'на почту' };
// Короткие названия — для строки под документом, не для текста документа.
const CHANNEL_SHORT = { phone: 'телефон (звонки и SMS)', messenger: 'мессенджеры', email: 'почта' };
export function adChannels(a, short = false) {
  const names = short ? CHANNEL_SHORT : CHANNEL_TEXT;
  return ['phone', 'messenger', 'email'].filter((f) => (a.pdFields || []).includes(f)).map((f) => names[f]);
}
function andList(items) {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} и ${items[items.length - 1]}`;
}

// То, что взято из ответов, в превью выделено (шаг 5): человек видит свои
// данные внутри юридического текста — это и показывает, что документ собран
// под него, а не шаблон. Маркеры разбирает MarkedText на шаге 5; заглушки
// («по ответам шага…») не выделяются — это не ответ.
export const MARK = /\u0001([^\u0002]*)\u0002/;
const mark = (v) => (v ? `\u0001${v}\u0002` : v);

// Превью собирается из ответов анкеты — раньше в нём стояли данные чужой
// компании из макета, и человек видел в своём документе чужого оператора.
export function docPreview(doc, a) {
  const ogrnLabel = a.owner === 'ИП' ? 'ОГРНИП' : 'ОГРН';
  const purposes = sitePurposes(a).map((x) => PURPOSE_TEXT[x]).filter(Boolean).join(', ');
  const fields = (a.pdFields || []).map((x) => FIELD_TEXT[x]).filter(Boolean).join(', ');
  const channels = andList(adChannels(a));
  return doc.preview({
    domain: a.domain ? mark(a.domain) : 'вашем сайте',
    operator: a.companyName ? mark(operatorName(a)) : operatorName(a),
    inn: mark(a.inn),
    ogrn: a.ogrn && a.owner !== 'Самозанятый' ? `${ogrnLabel} ${mark(a.ogrn)}` : '',
    address: mark(a.address),
    purposes: purposes ? mark(purposes) : 'по ответам шага «Данные клиентов»',
    fields: fields ? mark(fields) : 'состав — по ответам анкеты',
    channels: channels ? mark(channels) : 'по телефону, в мессенджерах и на почту',
  });
}

// Из каких ответов собран документ (живой макет, очередь 3, 18.09): вторая
// строка документа называет сами ответы, а не обещает «соберём под вас» —
// одинаковое при любых ответах обещание и было тем «за этим ничего нет»,
// с которым приходило ревью. line — строка под названием, why и step — в
// раскрытом документе: откуда собрано и куда вернуться, чтобы поменять.
const label = (list, v) => list.find((o) => o.value === v)?.label;
const lower = (x) => x.charAt(0).toLowerCase() + x.slice(1);

export function docOrigin(doc, a) {
  const analytics = a.analytics || [];
  const features = a.features || [];
  const named = (vals, list) => vals.filter((v) => v !== 'none').map((v) => label(list, v)).filter(Boolean);
  switch (doc.id) {
    case '01':
      return {
        line: `Владелец: ${operatorName(a)}${a.inn ? `, ИНН ${a.inn}` : ''}.`,
        why: 'Собрано по ответам «Владелец сайта» и «Данные из реестра»',
        step: '/app/start/requisites',
      };
    case '02': {
      // «Другое» — не название счётчика: в документ идёт то, что человек вписал.
      const n = named(analytics.filter((v) => v !== 'other'), ANALYTICS);
      if (analytics.includes('other') && a.analyticsOther?.trim()) n.push(a.analyticsOther.trim());
      return {
        line: n.length
          ? `Названы счётчики: ${n.join(', ')}.`
          : analytics.includes('none')
            ? 'Счётчиков нет — описаны только технические cookie.'
            : 'Счётчики — по ответу «Счётчики на сайте».',
        why: 'Собрано по ответу «Счётчики на сайте»',
        step: '/app/start/site',
      };
    }
    case '03': {
      const purposes = sitePurposes(a).map((v) => label([...PURPOSES, PROMO_PURPOSE], v)).filter(Boolean).map(lower);
      return {
        line: purposes.length ? `Названы цели: ${purposes.join(', ')}.` : 'Цели — по ответу «Цели сбора контактов».',
        why: 'Собрано по ответам «Сфера деятельности» и «Цели сбора контактов»',
        step: '/app/start/clients',
      };
    }
    case '12': {
      // Согласие собираем мы, а подключает его к формам сайта сам клиент —
      // обещать «встанет туда, где собираете контакты» нельзя (владелец 23.09).
      const f = (a.pdFields || []).map((v) => label(PD_FIELDS, v)).filter(Boolean).map(lower);
      const noForms = features.length > 0 && features.every((v) => v === 'none');
      return {
        line: noForms
          ? 'Форм на сайте нет — согласие понадобится, когда форма появится.'
          : `${f.length ? `Названы данные: ${f.join(', ')}. ` : ''}Ссылку на согласие добавьте в формы сайта.`,
        why: 'Собрано по ответам «Какие данные собираете» и «Цели сбора контактов»',
        step: '/app/start/clients',
      };
    }
    default: {
      // Документ в пакете при любом ответе; каналы — из собранных контактов.
      const ch = adChannels(a, true);
      return {
        line:
          a.callsBase === false
            ? 'Об акциях вы не рассказываете — документ пригодится, когда начнёте.'
            : a.callsBase
              ? ch.length
                ? `Названы каналы: ${andList(ch)}.`
                : 'Названы все каналы — телефона, почты и мессенджера в формах нет.'
              : 'Понадобится, когда начнёте рассказывать клиентам об акциях.',
        why: 'Собрано по ответам «Какие данные собираете» и «Рассказываете клиентам об акциях и новинках?»',
        step: '/app/start/clients',
      };
    }
  }
}

// Правки документов из кабинета — для истории и ленты событий. Одна правка
// может выпустить новые версии нескольких документов (почта для запросов
// стоит и в политике, и в согласии), и в ленте это одно событие, а не два.
export function editEvents(edits = []) {
  const byAt = new Map();
  edits.forEach((e) => {
    const g = byAt.get(e.at) || { at: e.at, what: e.what, docs: [] };
    const title = DOCUMENTS.find((d) => d.id === (e.doc || '01'))?.title;
    if (title && !g.docs.includes(title)) g.docs.push(title);
    byAt.set(e.at, g);
  });
  return [...byAt.values()].map((g) => {
    const names = g.docs.map((t) => `«${t}»`).join(' и ');
    return {
      ...g,
      title: `${names}, ${g.docs.length > 1 ? 'новые версии' : 'новая версия'}`,
      text: `Обновили ${g.docs.length > 1 ? 'документы' : 'документ'} ${names} — ${lower(g.what || '')}`,
    };
  });
}

export function docUrl(doc) {
  return `cdn.sleza.media/${SITE_ID}/${doc.id}`;
}
