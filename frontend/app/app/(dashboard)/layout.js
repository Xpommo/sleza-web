import AppShell from '../../../components/app/AppShell';

// Route group (dashboard) — чтобы каркас с меню слева не попадал на /app/login.
// Группа в скобках не участвует в URL: страница внутри неё живёт на /app.
export const metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }) {
  return <AppShell>{children}</AppShell>;
}
