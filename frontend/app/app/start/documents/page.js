import DocumentsClient from './DocumentsClient';

// Анкета «Слеза Белый Сайт», шаг 5 из 6 — собранный пакет документов и
// превью того, что появится на сайте после установки.
export const metadata = {
  title: 'Пакет документов — Слеза Белый Сайт',
  description: 'Анкета подключения сайта: шаг 5 из 6.',
  robots: { index: false, follow: false },
};

export default function DocumentsPage() {
  return <DocumentsClient />;
}
