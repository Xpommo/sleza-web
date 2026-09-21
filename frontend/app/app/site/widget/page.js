import SiteWidgetClient from './SiteWidgetClient';

// Виджет конкретного сайта: состояние скрипта, тема cookie-баннера и
// подвала, превью того, что видит посетитель. Маркировка без настроек —
// она обязательна по закону.
export const metadata = {
  title: 'Виджет сайта — Слеза Белый Сайт',
  robots: { index: false, follow: false },
};

export default function SiteWidgetPage() {
  return <SiteWidgetClient />;
}
