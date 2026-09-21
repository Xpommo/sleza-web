import ProjectsClient from './ProjectsClient';

// Стартовая страница кабинета: панель проектов. Сюда попадают сразу после входа.
export const metadata = {
  title: 'Проекты — ШтрафКонтроль',
  robots: { index: false, follow: false },
};

export default function ProjectsPage() {
  return <ProjectsClient />;
}
