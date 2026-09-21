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
// Пока анкета не пройдена, показываем данные аккаунта из мока.
export function accountUser(fallback) {
  const a = loadAnketa();
  return {
    name: a.personName || fallback.name,
    email: a.personEmail || fallback.email,
  };
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
