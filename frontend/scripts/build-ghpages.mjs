// Статический экспорт анкеты для GitHub Pages.
// Главная страница сканера читает searchParams и статикой не собирается —
// на время экспорта подменяем её оглавлением, после сборки возвращаем.
import { rename, writeFile, rm } from 'node:fs/promises';
import { execSync } from 'node:child_process';

const PAGE = 'app/page.js';
const BAK = 'app/page.scanner.bak';

const STUB = `export const metadata = { title: 'Слеза Белый Сайт — анкета', robots: { index: false, follow: false } };

export default function Index() {
  return (
    <main style={{ maxWidth: 560, margin: '80px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Слеза Белый Сайт</h1>
      <p style={{ color: '#555', marginBottom: 24 }}>Анкета подключения сайта, шесть шагов.</p>
      <a href="./app/start/profile/" style={{ display: 'inline-block', background: '#1f1fe6', color: '#fff', padding: '14px 22px', borderRadius: 12, fontWeight: 700, textDecoration: 'none' }}>
        Открыть анкету →
      </a>
    </main>
  );
}
`;

await rename(PAGE, BAK);
try {
  await writeFile(PAGE, STUB);
  execSync('npx next build', { stdio: 'inherit', env: { ...process.env, GH_PAGES: '1' } });
} finally {
  await rm(PAGE, { force: true });
  await rename(BAK, PAGE);
}
console.log('\nГотово: frontend/out');
