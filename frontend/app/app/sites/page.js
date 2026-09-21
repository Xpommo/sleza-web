import SitesClient from './SitesClient';

// Точка входа после регистрации: список сайтов аккаунта. Пустой — отсюда
// человек уходит в анкету подключения.
export const metadata = {
  title: 'Мои сайты — Слеза Белый Сайт',
  robots: { index: false, follow: false },
};

export default function SitesPage() {
  return <SitesClient />;
}
