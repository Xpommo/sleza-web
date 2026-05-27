'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('consent_v1')) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('consent_v1', 'accepted');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-paper shadow-lg">
      <div className="max-w-3xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
        <p className="text-xs text-ink/60 flex-1 font-mono leading-relaxed">
          Мы используем localStorage для хранения настроек. При скачивании PDF можем запросить email.{' '}
          <Link href="/privacy" className="text-brand hover:underline">
            Политика конфиденциальности
          </Link>
        </p>
        <button
          onClick={accept}
          className="shrink-0 text-xs font-mono font-semibold bg-ink text-paper px-4 py-2 rounded hover:bg-ink-2 transition-colors"
        >
          Принять
        </button>
      </div>
    </div>
  );
}
