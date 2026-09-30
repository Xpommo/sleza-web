import MaketBar from '../../components/app/MaketBar';

// Кабинет — продукт «Слеза Белый Сайт», а корневой layout описывает сканер
// («ФОНАРИК — Проверка сайта…»): превью ссылки на кабинет в мессенджере
// показывало сканер (аудит 24.09). Переопределяем то, что видно в превью и
// поиске; заголовок вкладки у каждой страницы свой. JSON-LD сканера живёт в
// корневом layout и отсюда не снимается — для этого лендинг нужно вынести в
// свою группу маршрутов.
const DESCRIPTION = 'Личный кабинет «Слеза Белый Сайт»: документы для сайта, виджет и подписка.';

export const metadata = {
  description: DESCRIPTION,
  keywords: null,
  alternates: { canonical: '/app/sites' },
  openGraph: {
    title: 'Слеза Белый Сайт',
    description: DESCRIPTION,
    siteName: 'Слеза Белый Сайт',
    locale: 'ru_RU',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Слеза Белый Сайт',
    description: DESCRIPTION,
  },
  robots: { index: false, follow: false },
};

// Синий кабинета — #2a3bf0 (владелец 30.09: один синий, как у Ивана; был
// #1f1fe6). Токены brand / brand-hover / brand-soft в tailwind.config.js читают
// эти переменные; обёртка display: contents — вёрстку не трогает.
const CABINET_BLUE = {
  '--c-brand': '42 59 240', // #2a3bf0
  '--c-brand-hover': '28 42 184', // #1c2ab8
  '--c-brand-soft': '143 162 255', // #8fa2ff — синий на тёмном
};

// Общая обвязка всего /app: страница плюс панель «Макет» для перехода
// между экранами прототипа в нужном состоянии.
export default function AppLayout({ children }) {
  return (
    <div className="contents" style={CABINET_BLUE}>
      {children}
      <MaketBar />
    </div>
  );
}
