import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: ['./src/app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Editorial monochrome + single accent system per redesign-v2.
        ink: '#0a0a0a',
        paper: '#ffffff',
        accent: {
          DEFAULT: '#1944B8',
          deep: '#0F2A8A',
          soft: '#E6EAF7',
        },
        // Pillar colors per design spec (different from old recharts palette).
        // Used by PillarsTable color squares + sparklines + risk-zone tags.
        pillar: {
          electoral: '#2A53E0',
          governance: '#7C3AED',
          judicial: '#1B9AAA',
          media: '#E76F2C',
          civil: '#2DA86A',
          corruption: '#DC2626',
        },
        // Severity colors retained for any older surfaces still using them
        // (will be retired with EventCard cleanup).
        severity: {
          1: '#cbd5e1',
          2: '#94a3b8',
          3: '#f59e0b',
          4: '#ea580c',
          5: '#b91c1c',
        },
        score: {
          good: '#16a34a',
          warn: '#ea580c',
          bad: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.06em',
      },
      maxWidth: {
        // Editorial container per design.
        editorial: '1440px',
      },
    },
  },
  plugins: [typography],
};

export default config;
