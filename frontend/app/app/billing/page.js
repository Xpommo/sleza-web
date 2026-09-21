import BillingClient from './BillingClient';

// Подписка аккаунта: тариф, способ оплаты, счёт и акты — общие на все
// сайты. Состояние и отключение конкретного сайта — в его «Обзоре».
export const metadata = {
  title: 'Подписка — Слеза Белый Сайт',
  robots: { index: false, follow: false },
};

export default function BillingPage() {
  return <BillingClient />;
}
