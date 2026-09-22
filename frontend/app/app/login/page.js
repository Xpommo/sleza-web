import LoginClient from './LoginClient';

// Вход в кабинет «Слеза Белый Сайт». Прототип: сессия не создаётся.
export const metadata = {
  title: 'Вход в кабинет — Слеза Белый Сайт',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginClient />;
}
