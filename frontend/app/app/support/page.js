import SupportClient from './SupportClient';

// Поддержка: частые вопросы про кабинет и обращения с ответами прямо здесь.
export const metadata = {
  title: 'Поддержка — Слеза Белый Сайт',
  robots: { index: false, follow: false },
};

export default function SupportPage() {
  return <SupportClient />;
}
