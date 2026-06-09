import HomeClient from './HomeClient';

const BACKEND   = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
const SITE_URL  = process.env.NEXT_PUBLIC_SITE_URL   || 'https://fonarik-web.vercel.app';
const UUID_RE   = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchScanMeta(reportId) {
  try {
    const res = await fetch(`${BACKEND}/api/results/${reportId}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function parseFine(str) {
  if (!str) return 0;
  const m = str.replace(/[\s ]/g, '').match(/(\d+)руб/);
  return m ? parseInt(m[1], 10) : 0;
}

export async function generateMetadata({ searchParams }) {
  const reportId = searchParams?.report;
  if (!reportId || !UUID_RE.test(reportId)) return {};

  const data = await fetchScanMeta(reportId);
  if (!data?.result) return {};

  const result   = data.result;
  const hostname = result.hostname || result.url || 'сайт';
  const checks   = result.aiData?.checks || [];
  const violations = checks.filter(c => c.status === 'violation');
  const risks      = checks.filter(c => c.status === 'risk');

  let title, description;

  if (violations.length > 0) {
    const totalFine = violations.reduce((s, c) => s + parseFine(c.fine), 0);
    const fineStr   = totalFine > 0
      ? ` · штраф до ${new Intl.NumberFormat('ru-RU').format(totalFine)} ₽`
      : '';
    title       = `${hostname} — ${violations.length} нарушений 152-ФЗ${fineStr}`;
    description = `Аудит выявил ${violations.length} нарушений${risks.length > 0 ? ` и ${risks.length} риска` : ''} по российскому законодательству. Подробный отчёт с рекомендациями — ФОНАРИК.`;
  } else if (risks.length > 0) {
    title       = `${hostname} — ${risks.length} риска по 152-ФЗ`;
    description = `Критических нарушений не найдено, есть ${risks.length} риска. Полный отчёт проверки — ФОНАРИК.`;
  } else {
    title       = `${hostname} — сайт прошёл проверку 152-ФЗ ✓`;
    description = `Нарушений не найдено. ${hostname} соответствует требованиям 152-ФЗ, 149-ФЗ и ЕРИР. Проверка ФОНАРИК.`;
  }

  const url = `${SITE_URL}/?report=${reportId}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'ФОНАРИК',
      locale: 'ru_RU',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default function Page() {
  return <HomeClient />;
}
