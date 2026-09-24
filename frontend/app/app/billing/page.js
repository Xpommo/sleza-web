import BillingClient from './BillingClient';

// «Оплата» аккаунта: баланс; у каждого сайта своя строка — тариф, год, оплата,
// отключение; общие на все сайты — способ пополнения и плательщик. Акты — в
// «Бухгалтерии».
export const metadata = {
  title: 'Оплата — Слеза Белый Сайт',
  robots: { index: false, follow: false },
};

export default function BillingPage() {
  return <BillingClient />;
}
