import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/pipeline/**/*.ts', 'src/lib/**/*.ts'],
      thresholds: {
        // Global floor for the whole src/ tree. Higher per-file gates live in
        // perFile thresholds below, where score.ts retains its 100% guarantee.
        statements: 90,
        branches: 80,
        functions: 90,
        lines: 90,
        'src/pipeline/score.ts': {
          statements: 100,
          functions: 100,
          lines: 100,
          branches: 90,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
});
