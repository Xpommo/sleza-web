import RequisitesClient from './RequisitesClient';

// Анкета «Слеза Белый Сайт», шаг 4 из 6 — данные, которые печатаются в
// документах и в реквизитах на сайте.
export const metadata = {
  title: 'Реквизиты — Слеза Белый Сайт',
  description: 'Анкета подключения сайта: шаг 4 из 6.',
  robots: { index: false, follow: false },
};

export default function RequisitesPage() {
  return <RequisitesClient />;
}
