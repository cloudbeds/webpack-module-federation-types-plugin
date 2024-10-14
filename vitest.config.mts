import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    clearMocks: true,
    coverage: {
      provider: 'istanbul',
    },
  },
});
