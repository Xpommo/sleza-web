import AccountingClient from './AccountingClient';

// «Баланс и платежи» → вкладка «Документы» (владелец 24.09): почта для
// документов и акты за оплаченные годы сайтов. Вкладка «Платежи» —
// /app/billing.
export const metadata = {
  title: 'Документы об оплате — Слеза Белый Сайт',
  robots: { index: false, follow: false },
};

export default function AccountingPage() {
  return <AccountingClient />;
}
