import { PROJECTS } from '../../../../../lib/appMock';
import ProjectClient from './ProjectClient';

// Страница проекта. Список проходят транзитом — решение платить принимается здесь.
export const metadata = {
  title: 'Проект — ШтрафКонтроль',
  robots: { index: false, follow: false },
};

// Нужен для статической сборки прототипа: без него динамический роут не экспортируется.
export function generateStaticParams() {
  return PROJECTS.map(p => ({ id: p.id }));
}

export default function ProjectPage({ params }) {
  return <ProjectClient id={params.id} />;
}
