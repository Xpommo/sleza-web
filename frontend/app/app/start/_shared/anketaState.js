// Ответы анкеты между шагами. В статическом макете все шаги жили на одной
// странице и делили состояние напрямую; здесь это отдельные маршруты, а
// зависимости между шагами настоящие: сфера с «О сайте» решает, какие цели
// показать на «Данных клиентов», а ответ про формы решает, показывать ли
// этот шаг вообще.
//
// sessionStorage, а не контекст: ответы должны пережить F5 посреди анкеты,
// но не должны оставаться в браузере после закрытия вкладки. Бэкенда это
// дерево по-прежнему не касается (см. frontend/CLAUDE.md).
const KEY = 'anketa_v1';

export function loadAnketa() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.sessionStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

// Имя и почта в углу кабинета — те, что человек назвал на «Ваш профиль».
// До этого — только то, что мы о нём уже знаем: при входе через мессенджер
// имя приходит из него (в прототипе — из мока), почты ещё нет; при входе по
// почте есть почта, а имени нет. Чужие «Кирилл» или director@… рядом с тем,
// что человек ввёл сам, выглядели как чужой аккаунт. Если никто не входил
// (экран открыт панелью «Макет») — мок целиком, как в макете.
export function accountUser(fallback) {
  const a = loadAnketa();
  const byMail = a.authVia === 'почта';
  const byMessenger = Boolean(a.authVia) && !byMail;
  return {
    name: a.personName || (byMail ? '' : fallback.name),
    email: a.personEmail || (byMessenger ? '' : fallback.email),
  };
}

// Как подписать человека, пока имени нет: почтой. Первая буква — для аватара.
export function userLabel(user) {
  const title = user.name || user.email;
  return { title, sub: user.name ? user.email : '', initial: title.slice(0, 1).toUpperCase() };
}

// Шаг засчитан, когда по нему нажали «Далее», — не когда в анкете появился
// какой-то его ответ: черновик пишется на каждое изменение, и по ответам уже
// не отличить начатый шаг от пройденного.
export function markStepDone(step) {
  saveAnketa({ stepsDone: Math.max(loadAnketa().stepsDone || 0, step) });
}

export function saveAnketa(patch) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ ...loadAnketa(), ...patch }));
  } catch {
    // приватный режим или переполнение — анкета продолжает работать,
    // просто следующий шаг покажет полный набор целей вместо суженного
  }
}

// Чем человек входит в кабинет. Способ, которым он только что вошёл, сразу
// считается привязанным — он и есть тот, через который человек уже прошёл
// (живой макет). Почта привязана всегда: вход по коду из письма есть у
// любого аккаунта, поэтому в списке мессенджеров её нет. Пока никто не
// входил (панель «Макет» открыла экран напрямую) — как в макете, Telegram.
export function loadAuth() {
  const a = loadAnketa();
  const via = a.authVia || 'Telegram';
  return { via, messengers: a.messengers || (via === 'почта' ? {} : { [via]: true }) };
}

export function signIn(via, email) {
  const a = loadAnketa();
  // Первый вход — привязано только то, чем вошли, без макетного Telegram.
  const messengers = a.authVia ? loadAuth().messengers : {};
  saveAnketa({
    authVia: via,
    messengers: via === 'почта' ? messengers : { ...messengers, [via]: true },
    // Почта, на которую пришёл код, — это и есть почта аккаунта; уже
    // названную на шаге «Ваш профиль» вход не перетирает.
    ...(email && !a.personEmail ? { personEmail: email } : {}),
  });
}

export function setMessenger(name, on) {
  saveAnketa({ messengers: { ...loadAuth().messengers, [name]: on } });
}

// Куда вернуться из Настроек и Поддержки: в них заходят из любого раздела
// кабинета, и жёсткий «← Обзор» уводил не туда (живой макет).
const RETURN_KEY = 'cabinet_return_v1';

export function rememberReturn(path) {
  try {
    window.sessionStorage.setItem(RETURN_KEY, path);
  } catch {
    /* без хранилища «Назад» просто ведёт в «Мои сайты» */
  }
}

export function returnPath() {
  try {
    return window.sessionStorage.getItem(RETURN_KEY) || '/app/sites';
  } catch {
    return '/app/sites';
  }
}
