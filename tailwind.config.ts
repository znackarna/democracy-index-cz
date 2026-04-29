import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: ['./src/app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Pillar colors used by ScoreTimeline + PillarBreakdown legends.
        // Calibrated for accessibility (WCAG AA on light bg) and visual
        // distinction across the 6 pillars.
        pillar: {
          electoral: '#2563eb', // blue-600
          governance: '#7c3aed', // violet-600
          judicial: '#0891b2', // cyan-600
          media: '#ea580c', // orange-600
          civil: '#16a34a', // green-600
          corruption: '#dc2626', // red-600
        },
        // Severity colors (1=lightest, 5=darkest)
        severity: {
          1: '#cbd5e1', // slate-300
          2: '#94a3b8', // slate-400
          3: '#f59e0b', // amber-500
          4: '#ea580c', // orange-600
          5: '#b91c1c', // red-700
        },
        score: {
          good: '#16a34a',
          warn: '#ea580c',
          bad: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [typography],
};

export default config;
