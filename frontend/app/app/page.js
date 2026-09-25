import AppRedirect from './AppRedirect';

// /app — вход в кабинет «Слеза Белый Сайт»: сразу в «Мои сайты». Раньше здесь
// открывался старый прототип «Проекты — ШтрафКонтроль» (аудит 24.09), чужое
// имя по самому естественному адресу кабинета. Старый список проектов больше
// не отдаётся; его файл и /app/project/[id] остались в группе (dashboard).
export const metadata = {
  title: 'Мои сайты — Слеза Белый Сайт',
  robots: { index: false, follow: false },
};

export default function AppIndexPage() {
  return <AppRedirect />;
}
