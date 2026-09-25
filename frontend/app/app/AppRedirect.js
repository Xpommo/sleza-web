'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Статический экспорт не умеет серверный редирект — уводим с клиента, а для
// тех, у кого скрипт не успел, оставляем ссылку.
export default function AppRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/app/sites');
  }, [router]);
  return (
    <main className="flex min-h-screen items-center justify-center bg-warm p-6 text-sm text-ink/60">
      <Link href="/app/sites" className="font-semibold text-brand underline-offset-4 hover:underline">
        Перейти в «Мои сайты»
      </Link>
    </main>
  );
}
