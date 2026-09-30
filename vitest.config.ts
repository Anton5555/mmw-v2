import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/components/ui/**',
        'src/lib/validations/generated/**',
      ],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          setupFiles: ['./vitest.setup.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: [...configDefaults.exclude, 'src/**/*.integration.test.{ts,tsx}'],
          clearMocks: true,
        },
      },
      {
        // Runs against a real PostgreSQL (see tests/integration/global-setup.ts).
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          globalSetup: ['./tests/integration/global-setup.ts'],
          setupFiles: ['./vitest.setup.ts', './tests/integration/setup.ts'],
          include: ['src/**/*.integration.test.{ts,tsx}'],
          // One shared database: files run one after another.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 120_000,
          clearMocks: true,
        },
      },
    ],
  },
});
