import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
import type { TestProject } from 'vitest/node';
import { assertSafeTestDatabaseUrl } from './safety';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

const DATABASE_NAME = 'mmw_test';

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      server.close(() => resolve(port));
    });
  });
}

/** Applies the real migrations, exactly like a production deploy. */
function migrate(databaseUrl: string) {
  try {
    execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
      env: { ...process.env, DIRECT_URL: databaseUrl, DATABASE_URL: databaseUrl },
      stdio: 'pipe',
    });
  } catch (error) {
    const output = (error as { stdout?: Buffer; stderr?: Buffer });
    throw new Error(
      `prisma migrate deploy failed:\n${output.stdout?.toString() ?? ''}\n${output.stderr?.toString() ?? ''}`
    );
  }
}

/**
 * Starts a throwaway PostgreSQL (npm `embedded-postgres`, real Postgres binaries, no Docker)
 * and applies the migrations. Set TEST_DATABASE_URL to use your own local database instead.
 */
export default async function setup(project: TestProject) {
  const externalUrl = process.env.TEST_DATABASE_URL;

  if (externalUrl) {
    assertSafeTestDatabaseUrl(externalUrl);
    migrate(externalUrl);
    project.provide('databaseUrl', externalUrl);
    return;
  }

  const dataDir = mkdtempSync(path.join(tmpdir(), 'mmw-test-pg-'));
  const port = await getFreePort();
  const server = new EmbeddedPostgres({
    databaseDir: path.join(dataDir, 'data'),
    user: 'postgres',
    password: 'postgres',
    port,
    persistent: false,
    onLog: () => {},
    onError: () => {},
  });

  const cleanup = async () => {
    await server.stop().catch(() => {});
    rmSync(dataDir, { recursive: true, force: true });
  };

  try {
    await server.initialise();
    await server.start();
    await server.createDatabase(DATABASE_NAME);

    const databaseUrl = `postgresql://postgres:postgres@127.0.0.1:${port}/${DATABASE_NAME}`;
    assertSafeTestDatabaseUrl(databaseUrl);
    migrate(databaseUrl);
    project.provide('databaseUrl', databaseUrl);
  } catch (error) {
    await cleanup();
    throw error;
  }

  return cleanup;
}
