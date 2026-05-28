import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: 'oklch(var(--color-bg-deep) / <alpha-value>)',
          panel: 'oklch(var(--color-bg-panel) / <alpha-value>)',
          raised: 'oklch(var(--color-bg-raised) / <alpha-value>)',
          hover: 'oklch(var(--color-bg-hover) / <alpha-value>)',
        },
        rune: {
          gold: 'oklch(var(--color-rune-gold) / <alpha-value>)',
          'gold-dim': 'oklch(var(--color-rune-gold) / 0.62)',
        },
        bifrost: 'oklch(var(--color-bifrost) / <alpha-value>)',
        blood: 'oklch(var(--color-blood) / <alpha-value>)',
        iron: 'oklch(var(--color-iron) / <alpha-value>)',
        ember: 'oklch(var(--color-ember) / <alpha-value>)',
        emerald: 'oklch(var(--color-perseus-emerald) / <alpha-value>)',
        fire: 'oklch(var(--color-sauron-fire) / <alpha-value>)',
        text: {
          primary: 'oklch(var(--color-text-primary) / <alpha-value>)',
          secondary: 'oklch(var(--color-text-secondary) / <alpha-value>)',
          muted: 'oklch(var(--color-text-muted) / <alpha-value>)',
        },
        border: {
          subtle: 'oklch(var(--color-border-subtle) / <alpha-value>)',
          strong: 'oklch(var(--color-border-strong) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'Consolas', 'monospace'],
        numeric: ['var(--font-numeric)', 'var(--font-mono)', 'Consolas', 'monospace'],
      },
      fontSize: {
        hero: ['clamp(2.5rem, 1rem + 5vw, 5.5rem)', { lineHeight: '1.05', letterSpacing: '0.02em' }],
      },
      boxShadow: {
        rune: '0 0 24px -8px oklch(var(--color-rune-gold) / 0.4)',
        panel: '0 4px 24px -12px rgba(0, 0, 0, 0.6)',
      },
      animation: {
        'ember-pulse': 'ember-pulse 3s ease-in-out infinite',
        'rune-glow': 'rune-glow 4s ease-in-out infinite',
        'session-breath': 'session-breath 4s ease-in-out infinite',
        'shimmer-slide': 'shimmer-slide 2.4s ease-in-out infinite',
        'beam-travel': 'beam-travel 6s linear infinite',
      },
      keyframes: {
        'ember-pulse': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'rune-glow': {
          '0%, 100%': { textShadow: '0 0 8px oklch(var(--color-rune-gold) / 0.3)' },
          '50%': { textShadow: '0 0 16px oklch(var(--color-rune-gold) / 0.6)' },
        },
        'session-breath': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        'shimmer-slide': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'beam-travel': {
          '0%': { offsetDistance: '0%' },
          '100%': { offsetDistance: '100%' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
