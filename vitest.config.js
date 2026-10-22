import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './frontend/tests/setup.js',
    include: ['backend/tests/**/*.test.js', 'frontend/tests/**/*.test.{js,jsx}'],
  },
});
