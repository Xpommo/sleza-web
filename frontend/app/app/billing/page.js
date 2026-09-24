import BillingClient from './BillingClient';

// «Баланс и платежи» → вкладка «Платежи» (владелец 24.09): баланс, пополнение,
// способ оплаты, история операций. Сайты, их тариф и оплата года — в «Моих
// сайтах», вид «Таблица» (тот же BillingClient, mode="sites").
export const metadata = {
  title: 'Баланс и платежи — Слеза Белый Сайт',
  robots: { index: false, follow: false },
};

export default function BillingPage() {
  return <BillingClient />;
}
