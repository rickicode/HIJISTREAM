import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.{js,jsx}', 'tests/**/*.test.{js,jsx}'],
    testTimeout: 30000,
  },
});
