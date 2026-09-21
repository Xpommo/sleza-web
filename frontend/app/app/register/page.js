import RegisterClient from './RegisterClient';

// Вход в продукт: регистрация перед анкетой подключения сайта.
export const metadata = {
  title: 'Регистрация — Слеза Белый Сайт',
  description: 'Создайте аккаунт, чтобы подготовить документы для сайта.',
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return <RegisterClient />;
}
