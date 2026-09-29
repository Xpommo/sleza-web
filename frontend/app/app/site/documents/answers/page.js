import SiteAnswersClient from './SiteAnswersClient';

// Ответы анкеты работающего сайта — подстраница «Документов»: правка ответа
// выпускает новые версии документов (владелец 26.09 и 29.09).
export const metadata = {
  title: 'Ответы анкеты — Слеза Белый Сайт',
  robots: { index: false, follow: false },
};

export default function SiteAnswersPage() {
  return <SiteAnswersClient />;
}
