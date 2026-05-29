import './globals.css';
import { Onest, JetBrains_Mono } from 'next/font/google';
import CookieBanner from '../components/CookieBanner';
import { FAQ } from '../lib/faq';

const onest = Onest({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-onest',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const SITE_URL = 'https://sleza-web.vercel.app';
const SITE_NAME = 'ФОНАРИК';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'ФОНАРИК — Проверка сайта на 152-ФЗ, 149-ФЗ и ЕРИР бесплатно за 5 минут',
  description: 'Бесплатный аудит сайта на соответствие 152-ФЗ, 149-ФЗ, ЕРИР и реестрам иноагентов. PDF-отчёт со ссылками на статьи закона за 5 минут. Без регистрации.',
  keywords: 'проверка сайта на 152-ФЗ, проверка 149-ФЗ, проверка ЕРИР онлайн, аудит сайта на соответствие законам РФ, проверка персональных данных на сайте, штрафы Роскомнадзор',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'ФОНАРИК — Проверка сайта на 152-ФЗ, 149-ФЗ и ЕРИР',
    description: 'Бесплатная проверка сайта на соответствие 152-ФЗ, 149-ФЗ, ЕРИР, реестрам иноагентов. PDF-отчёт за 5 минут. Без регистрации.',
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'ru_RU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ФОНАРИК — Проверка сайта на 152-ФЗ, 149-ФЗ и ЕРИР',
    description: 'Бесплатная проверка за 5 минут. PDF-отчёт со ссылками на статьи закона.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Эскейпит < и > внутри JSON-LD, чтобы FAQ-контент не мог разорвать script-тег.
function safeJsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

function jsonLdWebsite() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: 'ФОНАРИК // СКАНЕР',
    url: SITE_URL,
    description: 'Бесплатный сервис проверки сайта на соответствие 152-ФЗ, 149-ФЗ, ЕРИР и реестрам иноагентов.',
    inLanguage: 'ru-RU',
  };
}

function jsonLdOrganization() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    description: 'Сервис автоматической проверки российских сайтов на соответствие законам о персональных данных, рекламе и информации.',
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'kirillmash99@gmail.com',
      contactType: 'customer support',
      availableLanguage: ['Russian'],
    },
  };
}

function jsonLdFaq() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLdWebsite()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLdOrganization()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLdFaq()) }}
        />
      </head>
      <body className={`${onest.variable} ${jetbrainsMono.variable} bg-warm text-ink min-h-screen antialiased`}>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
