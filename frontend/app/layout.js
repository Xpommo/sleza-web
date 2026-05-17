import './globals.css';

export const metadata = {
  title: 'Слеза — проверка соответствия',
  description: 'Аудит российских сайтов: 152-ФЗ, 149-ФЗ, ЕРИР, иноагенты, наркотики',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body className="bg-gray-950 text-gray-100 min-h-screen font-mono">
        {children}
      </body>
    </html>
  );
}
