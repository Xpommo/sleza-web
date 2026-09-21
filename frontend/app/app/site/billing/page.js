import SiteBillingClient from './SiteBillingClient';

// Подписка конкретного сайта: тариф, способ оплаты, счёт, акты, отмена.
// Одна на сайт — у каждого сайта своя оплата.
export const metadata = {
  title: 'Подписка — Слеза Белый Сайт',
  robots: { index: false, follow: false },
};

export default function SiteBillingPage() {
  return <SiteBillingClient />;
}
