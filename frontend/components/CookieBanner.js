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

  const reject = () => {
    localStorage.setItem('consent_v1', 'rejected');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-paper shadow-lg">
      <div className="max-w-3xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <p className="text-xs text-ink/60 flex-1 font-mono leading-relaxed">
          Мы используем localStorage только для запоминания вашего выбора. Аналитики и рекламных трекеров нет.{' '}
          <Link href="/privacy" className="text-brand hover:underline">
            Подробнее
          </Link>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={reject}
            className="text-xs font-mono font-semibold border border-line-2 text-ink/70 hover:text-ink hover:border-ink/40 px-4 py-2 rounded transition-colors"
          >
            Отказаться
          </button>
          <button
            onClick={accept}
            className="text-xs font-mono font-semibold bg-ink text-paper px-4 py-2 rounded hover:bg-ink-2 transition-colors"
          >
            Принять
          </button>
        </div>
      </div>
    </div>
  );
}
