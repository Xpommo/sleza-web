// Одна вежливая live-область на страницу: статусы («Оплачено до …», «Код
// найден», «Скопировано», «Обращение отправлено») должны быть слышны
// скринридеру, а не только видны (разбор 24.09: в кабинете не было ни одного
// aria-live). Область создаётся при первом сообщении и живёт до ухода со
// страницы; текст очищается и ставится заново, чтобы повтор тоже озвучился.
export function announce(message) {
  if (typeof document === 'undefined' || !message) return;
  let el = document.getElementById('sr-status');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sr-status';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.className = 'sr-only';
    document.body.appendChild(el);
  }
  el.textContent = '';
  setTimeout(() => {
    el.textContent = message;
  }, 60);
}
