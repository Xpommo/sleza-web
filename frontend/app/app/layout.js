import MaketBar from '../../components/app/MaketBar';

// Общая обвязка всего /app: страница плюс панель «Макет» для перехода
// между экранами прототипа в нужном состоянии.
export default function AppLayout({ children }) {
  return (
    <>
      {children}
      <MaketBar />
    </>
  );
}
