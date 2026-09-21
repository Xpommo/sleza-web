import SiteOverviewClient from './SiteOverviewClient';

// Обзор конкретного сайта: состояние подписки, документов и последние
// события. Разделы сайта живут здесь, аккаунтные — на уровне «Мои сайты».
export const metadata = {
  title: 'Обзор сайта — Слеза Белый Сайт',
  robots: { index: false, follow: false },
};

export default function SiteOverviewPage() {
  return <SiteOverviewClient />;
}
