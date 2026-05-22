import './globals.css';

export const metadata = {
  title: 'СЛЕЗА // ПРОВЕРКА — Аудит сайта на соответствие законам РФ',
  description: 'Бесплатная проверка сайта на соответствие 152-ФЗ, 149-ФЗ, ЕРИР, реестрам иноагентов. Находим нарушения до проверки Роскомнадзора.',
  keywords: '152-ФЗ, 149-ФЗ, ЕРИР, иноагенты, персональные данные, аудит сайта, соответствие закону, sleza',
  openGraph: {
    title: 'СЛЕЗА // ПРОВЕРКА — Аудит сайта на соответствие законам РФ',
    description: 'Бесплатная проверка: 152-ФЗ, 149-ФЗ, ЕРИР, реестры иноагентов. Результат за 30 секунд.',
    locale: 'ru_RU',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body className="bg-neutral-950 text-neutral-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
