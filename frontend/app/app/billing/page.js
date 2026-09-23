import BillingClient from './BillingClient';

// Подписка аккаунта: у каждого сайта своя строка — тариф, год, оплата,
// отключение; общие на все сайты — способ оплаты, плательщик, акты.
export const metadata = {
  title: 'Подписка — Слеза Белый Сайт',
  robots: { index: false, follow: false },
};

export default function BillingPage() {
  return <BillingClient />;
}
