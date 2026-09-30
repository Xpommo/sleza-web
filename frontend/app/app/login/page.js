import EntryClient from './EntryClient';

// Вход и регистрация — одна страница (владелец 30.09): пароля нет, «войти» и
// «создать аккаунт» — одно действие. Прототип: сессия не создаётся.
export const metadata = {
  title: 'Вход в кабинет — Слеза Белый Сайт',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <EntryClient />;
}
