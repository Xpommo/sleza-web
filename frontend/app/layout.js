import './globals.css';
import CookieBanner from '../components/CookieBanner';

export const metadata = {
  title: 'ФОНАРИК // СКАНЕР — Аудит сайта по 152-ФЗ, 149-ФЗ, ЕРИР',
  description: 'Подсвечиваем нарушения. Бесплатная проверка сайта на соответствие 152-ФЗ, 149-ФЗ, ЕРИР, реестрам иноагентов. PDF-отчёт за 30 секунд.',
  keywords: '152-ФЗ, 149-ФЗ, ЕРИР, иноагенты, персональные данные, аудит сайта, соответствие закону, фонарик',
  openGraph: {
    title: 'ФОНАРИК // СКАНЕР — Аудит сайта по 152-ФЗ, 149-ФЗ, ЕРИР',
    description: 'Подсвечиваем нарушения. Бесплатная проверка: 152-ФЗ, 149-ФЗ, ЕРИР, реестры иноагентов. Результат за 30 секунд.',
    locale: 'ru_RU',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-warm text-ink min-h-screen antialiased">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
