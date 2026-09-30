// Общее для анкеты (index.html) и страницы ответов (answers.html):
// адрес приёмника, задания, варианты ответов и сборка отчёта.
(function () {
  // Адрес веб-приложения Apps Script (…/exec). Выдаёт Google после развёртывания, см. README.md.
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbyZArPOeoQrfEdlMBPPoEHcMs6IeAe_8d9x5-5cfykON7x61FsJs5sv_0d90n0MC4c7/exec';

  const CABINET = 'https://xpommo.github.io/sleza-web/anketa/app/register/';

  const OPTIONS = {
    'about.role': ['Владелец бизнеса', 'Маркетолог', 'Разработчик или веб-студия', 'Юрист', 'Другое'],
    'about.device': ['Компьютер', 'Телефон', 'Планшет'],
    'about.site': ['Да, свой', 'Веду чужой', 'Нет'],
    'final.pay': ['Да', 'Скорее да', 'Скорее нет', 'Нет'],
    'final.nps': ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
  };
  const STATUS = ['Сразу', 'С трудом', 'Не получилось', 'Пропустил'];
  const PAIN = ['Мелочь', 'Раздражало', 'Застрял'];

  const TASKS = [
    { id: 'register', title: 'Первый экран и регистрация', where: 'Регистрация',
      todo: 'Откройте кабинет. Сначала 10 секунд просто смотрите на экран, ничего не нажимая. Потом зарегистрируйтесь любым способом.',
      ask: 'Своими словами: что это за сервис и что он вам даст?' },
    { id: 'profile', title: 'Ваш профиль', where: 'Анкета · шаг 1',
      todo: 'Заполните шаг о себе и перейдите дальше.' },
    { id: 'site', title: 'О сайте', where: 'Анкета · шаг 2',
      todo: 'Введите адрес своего сайта или выдуманный, выберите сферу, платформу и счётчики.',
      ask: 'Было понятно, зачем спрашивают каждый вопрос?' },
    { id: 'clients', title: 'Данные клиентов', where: 'Анкета · шаг 3',
      todo: 'Отметьте, где и какие данные сайт собирает, зачем, и рассылаете ли акции.',
      ask: 'Были вопросы, на которые не знали, что ответить? Какие?' },
    { id: 'requisites', title: 'Реквизиты', where: 'Анкета · шаг 4',
      todo: 'Выберите форму владения и введите ИНН (10 цифр для ООО, 12 для ИП). Проверьте, что подставилось, и перейдите дальше.',
      ask: 'Понятно, зачем сервису реквизиты и контакты?' },
    { id: 'documents', title: 'Пакет документов', where: 'Анкета · шаг 5',
      todo: 'Посмотрите собранные документы. Откройте хотя бы два и попробуйте изменить один ответ прямо из документа.',
      ask: 'Какие документы вы получите? Верите, что они собраны под ваш сайт?' },
    { id: 'code', title: 'Установка кода', where: 'Анкета · шаг 6',
      todo: 'Выберите «Поставлю сам» или «Поручу другому» и доведите шаг до перехода в кабинет.',
      ask: 'Смогли бы поставить этот код на свой сайт сами? Если нет, что бы сделали?' },
    { id: 'overview', title: 'Обзор сайта', where: 'Кабинет · Обзор',
      todo: 'Осмотрите первый экран кабинета, ничего не нажимая.',
      ask: 'До какого числа сервис бесплатен и сколько будет стоить дальше? Что от вас сейчас требуется?' },
    { id: 'docs', title: 'Документы сайта', where: 'Кабинет · Документы',
      todo: 'Откройте любой документ. Затем поменяйте почту для запросов о персональных данных или реквизиты.',
      ask: 'Нашли, где это меняется? Что, по-вашему, произошло с документами после правки?' },
    { id: 'widget', title: 'Виджет', where: 'Кабинет · Виджет',
      todo: 'Откройте раздел «Виджет».',
      ask: 'Что увидят посетители вашего сайта?' },
    { id: 'pay', title: 'Оплата года', where: 'Мои сайты / Обзор',
      todo: 'Оплатите год для своего сайта. Деньги не спишутся.',
      ask: 'Сколько и когда с вас спишут в следующий раз? Включилось ли автопродление?' },
    { id: 'billing', title: 'Баланс и платежи', where: 'Меню аккаунта',
      todo: 'Найдите историю платежей и место, где взять закрывающие документы для бухгалтерии.' },
    { id: 'second', title: 'Второй сайт', where: 'Мои сайты',
      todo: 'Добавьте ещё один сайт, пройдите пару шагов анкеты и вернитесь к первому сайту.',
      ask: 'Понятно ли, что второй сайт оплачивается отдельно?' },
    { id: 'support', title: 'Поддержка, настройки, выход', where: 'Меню аккаунта',
      todo: 'Найдите, где задать вопрос. Откройте настройки. Выйдите и войдите снова.' },
  ];

  const trim = (s) => String(s || '').trim();
  const filledBugs = (r) => (r.bugs || []).filter((b) => b && (trim(b.what) || b.screen));
  const doneCount = (r) => TASKS.filter((t) => ((r.tasks || {})[t.id] || {}).status).length;

  function reportText(r) {
    const L = [];
    const a = r.about || {};
    L.push('ТЕСТ КАБИНЕТА «СЛЕЗА БЕЛЫЙ САЙТ»');
    L.push(`Кто: ${a.name || 'без имени'} · ${a.role || '—'} · ${a.device || '—'}${a.browser ? ' · ' + a.browser : ''} · свой сайт: ${a.site || '—'}`);
    L.push('');
    TASKS.forEach((t, i) => {
      const x = (r.tasks || {})[t.id] || {};
      if (!x.status && !x.problem && !x.ask) { L.push(`${i + 1}. ${t.title} — не заполнено`); return; }
      L.push(`${i + 1}. ${t.title} — ${x.status || 'без оценки'}${x.pain ? ' · ' + x.pain : ''}`);
      if (trim(x.ask)) L.push(`   ${t.ask} → ${trim(x.ask)}`);
      if (trim(x.problem)) L.push(`   Проблема: ${trim(x.problem)}`);
    });
    const bugs = filledBugs(r);
    L.push(''); L.push(`ОШИБКИ (${bugs.length})`);
    bugs.forEach((b, i) => L.push(`${i + 1}. [${b.screen || 'экран не указан'}] ${trim(b.what)}${trim(b.expect) ? ' / ожидал: ' + trim(b.expect) : ''}`));
    const f = r.final || {};
    L.push(''); L.push('ИТОГ');
    L.push(`Заплатил бы 12 000 ₽/год: ${f.pay || '—'}${trim(f.payWhy) ? ' — ' + trim(f.payWhy) : ''}`);
    L.push(`Посоветует: ${f.nps ?? '—'} из 10`);
    if (trim(f.top)) L.push(`Главные проблемы: ${trim(f.top)}`);
    if (trim(f.words)) L.push(`Непонятные слова: ${trim(f.words)}`);
    if (trim(f.extra)) L.push(`Лишнее: ${trim(f.extra)}`);
    if (trim(f.missing)) L.push(`Не хватило: ${trim(f.missing)}`);
    if (trim(f.liked)) L.push(`Понравилось: ${trim(f.liked)}`);
    return L.join('\n');
  }

  // Строка таблицы: читаемые колонки для человека + полный JSON для страницы ответов.
  function toRow(r) {
    const a = r.about || {}, f = r.final || {};
    const row = {
      'Имя': a.name, 'Роль': a.role, 'Устройство': a.device, 'Браузер': a.browser, 'Свой сайт': a.site,
      'Заданий отмечено': `${doneCount(r)} из ${TASKS.length}`,
    };
    TASKS.forEach((t, i) => {
      const x = (r.tasks || {})[t.id] || {};
      const n = `${i + 1}. ${t.title}`;
      row[`${n}: результат`] = x.status;
      row[`${n}: мешало`] = x.pain;
      if (t.ask) row[`${n}: ответ`] = x.ask;
      row[`${n}: проблема`] = x.problem;
    });
    const bugs = filledBugs(r);
    row['Ошибок'] = bugs.length;
    row['Ошибки'] = bugs.map((b, i) => `${i + 1}. [${b.screen || '—'}] ${trim(b.what)}${trim(b.expect) ? ' / ожидал: ' + trim(b.expect) : ''}`).join('\n');
    Object.assign(row, {
      'Заплатил бы': f.pay, 'Почему': f.payWhy, 'Посоветует (0–10)': f.nps,
      'Главные проблемы': f.top, 'Непонятные слова': f.words, 'Лишнее': f.extra,
      'Не хватило': f.missing, 'Понравилось': f.liked,
      'Данные (JSON)': JSON.stringify(r),
    });
    return row;
  }

  window.USABILITY = { ENDPOINT, CABINET, OPTIONS, STATUS, PAIN, TASKS, reportText, toRow, doneCount, filledBugs };
})();
