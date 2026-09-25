/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-onest)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: '#111110',
        'ink-2': '#2a2825',
        paper: '#faf8f4',
        warm: '#f4f1ec',
        brand: '#1f1fe6',
        'brand-soft': '#5f5fff',
        danger: '#d63816',
        ok: '#1a7a52',
        warn: '#b87900',
        // Текст жёлтых статусов: #b87900 на тонированном фоне давал 3.2:1,
        // ниже AA. Заливки, рамки и точки остаются warn.
        'warn-ink': '#8a5a00',
        // То же для красного и зелёного (разбор 24.09): danger и ok на своём 10%
        // оттенке давали 4.09 и 4.14:1. Текст плашек и сообщений на оттенке —
        // *-ink (5.7 и 5.8:1); заливки, рамки, крупные цифры — danger/ok.
        'danger-ink': '#b02a0c',
        'ok-ink': '#15613f',
        // Наведение синей кнопки — раньше было вписано вручную 27 раз.
        'brand-hover': '#1a1acc',
        line: '#e8e4dd',
        'line-2': '#dcd6cc',
      },
      borderRadius: {
        DEFAULT: '8px',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(6px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        stepPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(31, 31, 230, 0.35)' },
          '50%': { boxShadow: '0 0 0 6px rgba(31, 31, 230, 0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: 1, boxShadow: '0 0 0 0 rgba(26, 122, 82, 0.4)' },
          '50%': { opacity: 0.6, boxShadow: '0 0 0 4px rgba(26, 122, 82, 0)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.4s ease forwards',
        stepPulse: 'stepPulse 1.4s ease-in-out infinite',
        pulseDot: 'pulseDot 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
