// Данные страницы проекта — макет. Находки и статьи взяты в том виде, в каком их
// выдаёт сканер; формулировка «что делаем» написана заново: в бесплатном отчёте она
// продаёт, а в кабинете объясняет уже оплаченную работу.

import { PROJECTS, CHECK_NAMES, counts, plural } from './appMock';

// Граница продукта: четыре проверки закрывает подписка, две закрыть за клиента
// нельзя в принципе. Обещать кнопку там, где мы бессильны, — вводить в заблуждение:
// человек решит, что локализация аналитики закрыта, а там штраф до 18 млн.
export const CLOSED_BY = { US: 'us', CLIENT: 'client' };

export const CHECK_DETAILS = {
  '152-ФЗ': {
    title: '152-ФЗ · персональные данные',
    closedBy: CLOSED_BY.US,
    finding: 'На /contacts форма заявки отправляется без согласия на обработку данных. Политики конфиденциальности на сайте нет.',
    law: 'КоАП 13.11 ч.1 · до 100 000 ₽',
    weDo: 'Соберём политику и текст согласия по вашим данным, подключим через виджет. Обновим, когда изменится закон.',
    youDo: null,
  },
  '149-ФЗ': {
    title: '149-ФЗ · реквизиты владельца',
    closedBy: CLOSED_BY.US,
    finding: 'В подвале нет ИНН и ОГРН. Наименование указано, но не совпадает с ЕГРЮЛ по форме собственности.',
    law: 'КоАП 13.11 ч.1 · рекомендация, штраф не предусмотрен',
    weDo: 'Выведем реквизиты в подвал через виджет — сверенные с ЕГРЮЛ.',
    youDo: null,
  },
  'ЕРИР': {
    title: 'ЕРИР · маркировка рекламы',
    closedBy: CLOSED_BY.CLIENT,
    finding: 'На /courses рекламный блок партнёра без пометки «реклама» и без ERID.',
    law: '38-ФЗ ст. 18.1 · до 500 000 ₽',
    weDo: null,
    youDo: 'Получить ERID у оператора рекламных данных и проставить пометку. Пришлём инструкцию и проверим результат следующим сканом.',
  },
  'Оферта': {
    title: 'Оферта · условия продажи',
    closedBy: CLOSED_BY.US,
    finding: 'Оплата на сайте принимается, публичной оферты с ценами и условиями возврата нет.',
    law: 'ЗоЗПП ст. 8, 10 · до 10 000 ₽ и требования потребителя',
    weDo: 'Соберём оферту по вашим ценам и условиям — данные возьмём из анкеты.',
    youDo: null,
  },
  'Куки': {
    title: 'Куки · согласие на трекинг',
    closedBy: CLOSED_BY.US,
    finding: 'Яндекс.Метрика ставит _ym_uid до того, как посетитель что-либо выбрал. Баннера с отказом нет.',
    law: '152-ФЗ ст. 9 · до 100 000 ₽',
    weDo: 'Подключим баннер с реальным отказом и cookie-политику. Трекинг будет ждать выбора посетителя.',
    youDo: null,
  },
  'Google Analytics': {
    title: 'Google Analytics · данные уходят за рубеж',
    closedBy: CLOSED_BY.CLIENT,
    finding: 'analytics.google.com/g/collect срабатывает на всех страницах: IP и поведение посетителей уходят на серверы в США.',
    law: '152-ФЗ ст. 18 ч.5 · КоАП 13.11 ч.8 — до 18 000 000 ₽',
    weDo: null,
    youDo: 'Локализация не лечится документами: нужно отключить GA или перейти на аналитику с серверами в РФ. Разберём варианты и проверим переход.',
  },
};

// Статус берётся у самой проверки — тот же источник, что у полоски на карточке.
export function projectChecks(project) {
  return CHECK_NAMES.map(name => ({
    name,
    status: project.checks[name] || 'ok',
    ...CHECK_DETAILS[name],
  }));
}

export const STATUS_TONE = {
  violation: 'danger',
  risk: 'warn',
  recommendation: 'brand',
  ok: 'ok',
};

export const STATUS_WORD = {
  violation: 'нарушение',
  risk: 'риск',
  recommendation: 'рекомендация',
  ok: 'в норме',
};

// Что именно закроет подписка, а что придётся сделать клиенту.
export function splitByOwner(checks) {
  const problems = checks.filter(c => c.status !== 'ok');
  return {
    problems,
    weClose:  problems.filter(c => c.closedBy === CLOSED_BY.US),
    youClose: problems.filter(c => c.closedBy === CLOSED_BY.CLIENT),
  };
}

// Документы: версия и причина изменения — это и есть подписка в чистом виде.
// Разовую сборку клиент может купить где угодно; платит он за то, что документ
// обновляется, когда меняется закон.
export function projectDocuments(project) {
  const has = project.docs !== 'none';
  const fresh = project.docs === 'ok';
  if (!has) {
    return [
      { name: 'Политика конфиденциальности', state: 'none' },
      { name: 'Согласие на обработку ПДн',   state: 'none' },
      { name: 'Политика в отношении cookie', state: 'none' },
      { name: 'Публичная оферта',            state: 'none' },
    ];
  }
  return [
    { name: 'Политика конфиденциальности', state: fresh ? 'ok' : 'outdated', version: 3,
      date: '12.06.2026', reason: 'изменился 152-ФЗ: локализация данных' },
    { name: 'Согласие на обработку ПДн', state: fresh ? 'ok' : 'outdated', version: 2,
      date: '03.04.2026', reason: 'добавлена цель — рассылка' },
    { name: 'Политика в отношении cookie', state: 'ok', version: 1,
      date: '04.06.2026', reason: 'первая версия' },
    // «не собран» не может иметь версию и дату — иначе строка противоречит сама себе
    fresh
      ? { name: 'Публичная оферта', state: 'ok', version: 1, date: '04.06.2026', reason: 'первая версия' }
      : { name: 'Публичная оферта', state: 'none' },
  ];
}

export const DOC_STATE = {
  ok:       { text: 'актуальна', tone: 'ok', order: 2 },
  outdated: { text: 'требует обновления', tone: 'warn', order: 1 },
  none:     { text: 'не собран', tone: 'danger', order: 0 },
};

// Непорядок читается первым: сначала то, чего нет, потом устаревшее, актуальное — вниз.
export function sortedDocuments(project) {
  return [...projectDocuments(project)].sort(
    (a, b) => DOC_STATE[a.state].order - DOC_STATE[b.state].order);
}

// Подписка на сайт, но платёжные данные — на уровне аккаунта: у человека с тремя
// сайтами одна карта, и три места для неё создают путаницу. В проекте только статус.
export const PRICE = '2 990 ₽/мес';

// Честные сроки вместо «около 5 минут»: анкету человек заполняет сам за пять минут,
// а документы собирает юрист — это дни. Обещать пять минут на пакет значит обмануть
// ровно там, где продаётся доверие.
export const TIMING = {
  form: '5 минут на анкету',
  docs: 'документы будут готовы за 2 рабочих дня',
};

// История — доказательство, что подписка работает: видно, что происходило без
// участия клиента.
export function projectTimeline(project) {
  const v = counts(project).violations;
  const base = [
    { date: '31.07.2026', kind: 'scan',   text: `Проверка: ${v} ${plural(v, 'нарушение', 'нарушения', 'нарушений')}` },
    { date: '12.06.2026', kind: 'doc',    text: 'Политика обновлена до v3 — изменился 152-ФЗ' },
    { date: '04.06.2026', kind: 'widget', text: 'Виджет установлен на сайт' },
    { date: '02.06.2026', kind: 'doc',    text: 'Собран первый пакет документов' },
    { date: '01.06.2026', kind: 'scan',   text: 'Первая проверка после добавления сайта' },
  ];
  return project.docs === 'none' ? base.filter(e => e.kind === 'scan') : base;
}

export function getProject(id) {
  return PROJECTS.find(p => p.id === id) || null;
}
