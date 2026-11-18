import type { Config } from 'tailwindcss';

/**
 * Every value here traces to planning/Design.md §3–§6.
 * If a value is not in this file, it is not a token and must not be used.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--brand-50)',
          100: 'var(--brand-100)',
          200: 'var(--brand-200)',
          300: 'var(--brand-300)',
          400: 'var(--brand-400)',
          500: 'var(--brand-500)',
          600: 'var(--brand-600)',
          700: 'var(--brand-700)',
          800: 'var(--brand-800)',
          900: 'var(--brand-900)',
        },
        ink: {
          100: 'var(--ink-100)',
          200: 'var(--ink-200)',
          300: 'var(--ink-300)',
          400: 'var(--ink-400)',
          500: 'var(--ink-500)',
          600: 'var(--ink-600)',
          700: 'var(--ink-700)',
          800: 'var(--ink-800)',
          900: 'var(--ink-900)',
        },
        canvas: 'var(--canvas)',
        'canvas-admin': 'var(--canvas-admin)',
        surface: 'var(--surface)',
        'surface-sunken': 'var(--surface-sunken)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        'line-bright': 'var(--line-bright)',
        success: { fg: 'var(--success-fg)', bg: 'var(--success-bg)' },
        warning: { fg: 'var(--warning-fg)', bg: 'var(--warning-bg)' },
        danger: { fg: 'var(--danger-fg)', bg: 'var(--danger-bg)' },
        info: { fg: 'var(--info-fg)', bg: 'var(--info-bg)' },
        b2b: { fg: 'var(--b2b-fg)', bg: 'var(--b2b-bg)', line: 'var(--b2b-line)' },
      },
      fontFamily: {
        sans: ['"Nunito Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        mono: ['ui-monospace', '"SF Mono"', '"Cascadia Mono"', '"Segoe UI Mono"', 'monospace'],
      },
      fontSize: {
        'display-xl': ['clamp(2.5rem, 5vw, 3.75rem)', { lineHeight: '1.02', letterSpacing: '-0.03em', fontWeight: '800' }],
        'display-lg': ['clamp(2rem, 3.5vw, 2.75rem)', { lineHeight: '1.06', letterSpacing: '-0.025em', fontWeight: '800' }],
        'display-md': ['1.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '800' }],
        title: ['1.375rem', { lineHeight: '1.2', letterSpacing: '-0.015em', fontWeight: '800' }],
        subtitle: ['1.125rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        body: ['1rem', { lineHeight: '1.55', letterSpacing: '0', fontWeight: '400' }],
        label: ['0.875rem', { lineHeight: '1.4', letterSpacing: '0.005em', fontWeight: '600' }],
        caption: ['0.8125rem', { lineHeight: '1.45', letterSpacing: '0.01em', fontWeight: '500' }],
        micro: ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '600' }],
        'numeric-lg': ['1.5rem', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '800' }],
        numeric: ['0.9375rem', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '600' }],
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '10px',
        xl: '14px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,16,32,.06), 0 1px 1px rgba(11,16,32,.04)',
        float: '0 2px 4px rgba(11,16,32,.05), 0 8px 16px -8px rgba(11,16,32,.10)',
        sheet: '0 8px 24px -8px rgba(11,16,32,.16), 0 24px 48px -24px rgba(11,16,32,.18)',
      },
      maxWidth: {
        container: '1200px',
        auth: '420px',
        prose: '68ch',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
        in: 'cubic-bezier(0.4, 0, 1, 1)',
      },
      transitionDuration: {
        120: '120ms',
        180: '180ms',
        240: '240ms',
        320: '320ms',
      },
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        rise: 'rise 240ms cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
