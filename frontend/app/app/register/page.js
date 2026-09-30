import EntryClient from '../login/EntryClient';

// Прежний адрес регистрации — та же страница, что вход (владелец 30.09):
// ссылки из писем и закладок продолжают работать.
export const metadata = {
  title: 'Вход в кабинет — Слеза Белый Сайт',
  description: 'Войдите или создайте аккаунт, чтобы подготовить документы для сайта.',
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return <EntryClient />;
}
