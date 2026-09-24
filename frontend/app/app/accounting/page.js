import AccountingClient from './AccountingClient';

// «Бухгалтерия» аккаунта (владелец 24.09): почта для документов, история
// операций по балансу и акты за оплаченные годы сайтов. Раньше — блок «Для
// бухгалтерии» внизу «Оплаты».
export const metadata = {
  title: 'Бухгалтерия — Слеза Белый Сайт',
  robots: { index: false, follow: false },
};

export default function AccountingPage() {
  return <AccountingClient />;
}
