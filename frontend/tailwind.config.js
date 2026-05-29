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
