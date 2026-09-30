import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { testEnv } from './tests/env';

// Must run before any module importing `@/env` or `@/lib/db` is loaded.
for (const [key, value] of Object.entries(testEnv)) {
  process.env[key] ??= value;
}

vi.mock('server-only', () => ({}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

afterEach(() => {
  cleanup();
});
