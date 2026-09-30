/**
 * Integration tests TRUNCATE every table, so they must never run against a real database.
 * Only a local database whose name contains "test" is accepted.
 */
export function assertSafeTestDatabaseUrl(url: string): void {
  const parsed = new URL(url);
  const isLocalHost = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  const databaseName = parsed.pathname.replace(/^\//, '');

  if (!isLocalHost || !/test/i.test(databaseName)) {
    throw new Error(
      `Refusing to run integration tests against ${parsed.hostname}/${databaseName}: ` +
        'the database must be on localhost and its name must contain "test".'
    );
  }
}
