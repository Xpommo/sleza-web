import LoginClient from './LoginClient';

// Экран входа в личный кабинет. Пока макет: авторизации в проекте нет.
// noindex — служебная страница, в поиске ей делать нечего (в sitemap.js её тоже нет).
export const metadata = {
  title: 'Вход в кабинет — ШтрафКонтроль',
  description: 'Вход в личный кабинет ШтрафКонтроль.',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginClient />;
}
