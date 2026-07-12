import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './content/**/*.{md,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        // RGB-triple CSS vars (set per site variant in globals.css) so
        // Tailwind opacity modifiers (`text-accent/60`) keep working.
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        paper: 'rgb(var(--color-paper) / <alpha-value>)',
        prose: 'rgb(var(--color-prose) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-two': 'rgb(var(--color-accent-two) / <alpha-value>)',
        copper: 'rgb(var(--color-copper) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        rule: 'rgb(var(--color-rule) / <alpha-value>)',
        // Intermediate zinc shade used by the VaporLoop demo (/vaporloop)
        'zinc-850': '#1f1f23',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
