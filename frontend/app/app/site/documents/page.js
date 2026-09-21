import SiteDocumentsClient from './SiteDocumentsClient';

// Документы конкретного сайта: постоянный адрес пакета, реестр версий и
// история изменений. Шаг 5 анкеты показывает тот же пакет до установки —
// состав документов у них общий (lib/docPackage.js).
export const metadata = {
  title: 'Документы сайта — Слеза Белый Сайт',
  robots: { index: false, follow: false },
};

export default function SiteDocumentsPage() {
  return <SiteDocumentsClient />;
}
