import CodeClient from './CodeClient';

// Анкета «Слеза Белый Сайт», шаг 6 из 6 — установка скрипта на сайт.
// Маршрут /code, а не /install: последний занят старой scan-воронкой.
export const metadata = {
  title: 'Установка — Слеза Белый Сайт',
  description: 'Анкета подключения сайта: шаг 6 из 6.',
  robots: { index: false, follow: false },
};

export default function CodePage() {
  return <CodeClient />;
}
