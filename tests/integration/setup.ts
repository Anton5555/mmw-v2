import { afterAll, inject } from 'vitest';
import { assertSafeTestDatabaseUrl } from './safety';

// Runs after vitest.setup.ts (which sets dummy env), before `@/env` / `@/lib/db` are first imported.
const databaseUrl = inject('databaseUrl');
assertSafeTestDatabaseUrl(databaseUrl);
process.env.DATABASE_URL = databaseUrl;
process.env.DIRECT_URL = databaseUrl;

afterAll(async () => {
  // `@/lib/db` caches its client on globalThis outside production.
  const { prisma } = globalThis as unknown as { prisma?: { $disconnect(): Promise<void> } };
  await prisma?.$disconnect();
});
