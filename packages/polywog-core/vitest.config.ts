import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    environment: 'node',
    globals: false,
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/examples/**'],
    },
  },
});
