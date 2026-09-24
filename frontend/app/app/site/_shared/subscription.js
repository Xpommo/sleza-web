// Подписка по сайту. Одна на сайт, а не на аккаунт: у каждого сайта свои
// документы, свой виджет и своя оплата (правило кабинета, frontend/CLAUDE.md).
// Состояние выводится из анкеты в одном месте — обзор, таблица сайтов и карточка
// в «Моих сайтах» не должны расходиться в том, оплачен ли сайт.

export const PRICE = 12000;
export const PRICE_LABEL = '12 000 ₽';
// Пробный период — 5 дней с момента, когда код найден на сайте (решение
// владельца 23.09; было 24 часа с нажатия «Активировать»). За сутки через
// подрядчика не успевали даже поставить код.
export const TRIAL_DAYS = 5;
export const TRIAL_MS = TRIAL_DAYS * 24 * 3600 * 1000;
// Линейка тарифов не утверждена: названия — заглушки из макета, цена одна.
export const TARIFFS = ['Тариф Х', 'Тариф У', 'Тариф Z'];

// notstarted — пробный период не запущен (анкета или установка не закончены);
// trial — идут 5 дней; expired — они прошли, оплаты нет;
// pending — выставлен счёт, ждём перевод; paid — оплачено.
export function subState(a, now = Date.now()) {
  const b = a.billing || {};
  if (b.paidAt) return 'paid';
  if (b.invoice) return 'pending';
  if (!a.trialStartedAt) return 'notstarted';
  return now > a.trialStartedAt + TRIAL_MS ? 'expired' : 'trial';
}

export function formatDate(ms) {
  return new Date(ms).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Оплаченный срок: с начала оплаченного года на years лет вперёд (ручное
// продление добавляет к сроку 12 месяцев — партнёрская программа, 14.09).
export function paidPeriod(paidAt, years = 1) {
  const from = new Date(paidAt);
  const to = new Date(paidAt);
  to.setFullYear(to.getFullYear() + (years || 1));
  to.setDate(to.getDate() - 1);
  return {
    from: formatDate(from),
    to: formatDate(to),
    renew: formatDate(to.getTime() + 24 * 3600 * 1000),
    years: `${from.getFullYear()}–${from.getFullYear() + (years || 1)}`,
  };
}

// Когда закончится пробный период — точка, с которой начнётся оплаченный
// год, если оплатить заранее: пробные дни не сгорают.
export function trialEndAt(a) {
  return a.trialStartedAt ? a.trialStartedAt + TRIAL_MS : null;
}

// Последний день пробного периода — одна дата вместо таймера на каждом
// экране: таймер при годовой подписке давил, а не помогал.
export function trialEnds(a) {
  return formatDate(a.trialStartedAt + TRIAL_MS - 1);
}

export function formatLeft(ms) {
  if (ms <= 0) return 'истёк';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h} ч ${m} мин`;
}
