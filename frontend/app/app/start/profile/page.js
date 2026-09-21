import ProfileClient from './ProfileClient';

// Анкета «Слеза Белый Сайт», шаг 1 из 6 — профиль владельца кабинета.
// Заменяет собой старую scan-based мини-анкету в ../anketa (та отвечает
// за другой, уже не целевой сценарий — см. PRODUCT.md, «Intake is
// anketa-driven, not scan-driven»).
export const metadata = {
  title: 'Ваш профиль — Слеза Белый Сайт',
  description: 'Анкета подключения сайта: шаг 1 из 6.',
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return <ProfileClient />;
}
