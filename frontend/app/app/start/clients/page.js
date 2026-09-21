import ClientsClient from './ClientsClient';

// Анкета «Слеза Белый Сайт», шаг 3 из 6 — что и зачем собирается с
// посетителей: цели, состав данных, рассылки по базе.
export const metadata = {
  title: 'Данные клиентов — Слеза Белый Сайт',
  description: 'Анкета подключения сайта: шаг 3 из 6.',
  robots: { index: false, follow: false },
};

export default function ClientsPage() {
  return <ClientsClient />;
}
