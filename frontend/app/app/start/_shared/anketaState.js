// Ответы анкеты между шагами. В статическом макете все шаги жили на одной
// странице и делили состояние напрямую; здесь это отдельные маршруты, а
// зависимости между шагами настоящие: сфера с «О сайте» решает, какие цели
// показать на «Данных клиентов», а ответ про формы решает, показывать ли
// этот шаг вообще.
//
// sessionStorage, а не контекст: ответы должны пережить F5 посреди анкеты,
// но не должны оставаться в браузере после закрытия вкладки. Бэкенда это
// дерево по-прежнему не касается (см. frontend/CLAUDE.md).
import { CURRENT_USER } from '../../../../lib/appMock';

const KEY = 'anketa_v1';

export function loadAnketa() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.sessionStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

// Имя и почта в углу кабинета — то, что человек назвал на «Вашем профиле», а
// до этого — то, что мы о нём уже знаем со входа: через мессенджер приходит
// имя (в прототипе — из мока), почты нет; по почте — почта (signIn пишет её
// в personEmail). Владелец 29.09: в пустом кабинете стояла почта, которую
// человек не называл (мок при открытии через «Макет»), — почту берём только
// указанную. Никто не входил — как вход через Telegram (так же решает loadAuth).
export const NO_USER = { name: '', email: '' };

export function accountUser() {
  const a = loadAnketa();
  const byMessenger = (a.authVia || 'Telegram') !== 'почта';
  return { name: a.personName || (byMessenger ? CURRENT_USER.name : ''), email: a.personEmail || '' };
}

// Как подписать человека: именем, без имени — почтой, без обоих — «Мой
// аккаунт» (аватар тогда со значком, а не с буквой: initial пустой).
export function userLabel(user) {
  const title = user.name || user.email;
  if (!title) return { title: 'Мой аккаунт', sub: '', initial: '' };
  return { title, sub: user.name ? user.email : '', initial: title.slice(0, 1).toUpperCase() };
}

// Шаг засчитан, когда по нему нажали «Далее», — не когда в анкете появился
// какой-то его ответ: черновик пишется на каждое изменение, и по ответам уже
// не отличить начатый шаг от пройденного.
export function markStepDone(step) {
  saveAnketa({ stepsDone: Math.max(loadAnketa().stepsDone || 0, step) });
}

// Анкета целиком, без слияния с прежней: нужна при смене открытого сайта —
// ответы прежнего сайта не должны просочиться в новый.
export function replaceAnketa(next) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(next));
    announce();
  } catch {
    /* без хранилища прототип держит один сайт, как раньше */
  }
}

// Сохранение сообщает о себе событием: строка баланса в сайдбаре живёт вне
// экрана, который пополняет баланс, и без него показывала бы старую сумму.
function announce() {
  window.dispatchEvent(new Event('anketa:saved'));
}

export function saveAnketa(patch) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ ...loadAnketa(), ...patch }));
    announce();
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
