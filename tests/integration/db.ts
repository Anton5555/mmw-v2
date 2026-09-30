import { prisma } from '@/lib/db';
import { assertSafeTestDatabaseUrl } from './safety';

/** Empties every table (except Prisma's migration history) and restarts id sequences. */
export async function resetDatabase() {
  assertSafeTestDatabaseUrl(process.env.DATABASE_URL!);

  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) return;

  const list = tables.map((t) => `"${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

export { prisma };
