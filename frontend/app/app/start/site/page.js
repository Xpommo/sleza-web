import SiteClient from './SiteClient';

// Анкета «Слеза Белый Сайт», шаг 2 из 6 — сайт: адрес, сфера, платформа,
// аналитика, формы и сервисы.
export const metadata = {
  title: 'О сайте — Слеза Белый Сайт',
  description: 'Анкета подключения сайта: шаг 2 из 6.',
  robots: { index: false, follow: false },
};

export default function SitePage() {
  return <SiteClient />;
}
