import SettingsClient from './SettingsClient';

// Настройки аккаунта: контакты и способы входа — общие для всех сайтов.
export const metadata = {
  title: 'Настройки — Слеза Белый Сайт',
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return <SettingsClient />;
}
