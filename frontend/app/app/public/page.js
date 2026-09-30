import PublicDocsClient from './PublicDocsClient';

// Страница документов сайта, которую видит посетитель: сюда ведут ссылки из
// подвала и из форм клиента. В продукте она живёт на cdn.sleza.media/<id>,
// в прототипе — здесь (владелец 30.09: рисуем по макету Ивана).
export const metadata = {
  title: 'Документы сайта',
  robots: { index: false, follow: false },
};

export default function PublicDocsPage() {
  return <PublicDocsClient />;
}
