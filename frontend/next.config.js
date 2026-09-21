/** @type {import('next').NextConfig} */

// Обычная сборка (Vercel) конфигурацию не меняет. Статический экспорт для
// GitHub Pages включается только переменной GH_PAGES: анкета целиком
// клиентская (состояние в sessionStorage, сервер не нужен), поэтому её
// можно отдавать статикой рядом со старыми макетами, не трогая их.
//   GH_PAGES=1 npm run build   →  frontend/out
const ghPages = process.env.GH_PAGES === '1';
const basePath = '/sleza-web/anketa';

const nextConfig = ghPages
  ? {
      output: 'export',
      basePath,
      assetPrefix: basePath,
      images: { unoptimized: true },
      trailingSlash: true,
    }
  : {};

export default nextConfig;
