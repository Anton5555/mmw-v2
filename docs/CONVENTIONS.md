# Development conventions

**Verified** unless marked otherwise. Agent-oriented rules also sit in [CLAUDE.md](../CLAUDE.md).

## Tooling

- pnpm `9.15.4` (`packageManager`). Node 22 (`.node-version`).
- `pnpm dev`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:integration`.
- CI (`.github/workflows/ci.yml`) runs on pull requests and pushes to `master`: frozen lockfile, typecheck, lint, unit tests with coverage, integration tests, `next build`. CI does not migrate production.
- Default branch is `master`, not `main`.

## React and Next

- Functional components. Compiler is on, so skip manual memoization.
- Keep server actions authenticated and Zod-parsed even if the page already redirected.
- Do not pass whole Prisma rows into client components. Pass the fields the client renders.
- Independent fetches in one function should start together (`Promise.all`). The IMDB LTA candidate loader already does this; match it.
- Client filter and pagination state goes through nuqs, not `useState`, when it should survive a reload.

## Auth

- Role string for feature gates in this app is `admin`, compared on `session.user.role`.
- `isAdmin()` in `src/lib/auth-utils.ts` checks `ADMIN`. The profile form does too. Those two do not match the pages. If you add a gate, copy the page check (`=== 'admin'`), or fix both call sites in the same change. Do not introduce a third spelling.
- `User.role` is `String?`. The `UserRole` enum in `schema.prisma` is unused by that column.
- VIP: never add a sign-up path that creates a user without `assertVipAllowed`.
- Session cookie cache is 5 minutes (`session.cookieCache` in `src/lib/auth.ts`). A role change can lag until the cache expires.

## Database

1. Edit `prisma/schema.prisma`.
2. `pnpm db:generate`.
3. `pnpm db:migrate:create <snake_name>` — writes SQL, does not apply it.
4. Read the SQL.
5. `pnpm db:migrate:deploy` against the database in `DIRECT_URL`.

`postinstall` runs `prisma generate`, so install needs `DIRECT_URL` (CI sets a dummy localhost URL).

If `generated/prisma` is half-written and generate fails, delete that directory and run `pnpm db:generate` again.

Local app database is Postgres database `mmw_dev`, often on port **5433** because 5432 may already be another instance. `.env` should point at that local database. `.env.prod` is for deliberate dumps and production migrates; Next and Prisma do not load it automatically.

`scripts/db/refresh-dev-db.ps1` dumps `public` from the prod `DIRECT_URL` and restores into the local `DIRECT_URL`. It refuses a non-localhost target. `scripts/db/scrub-dev-db.sql` then deletes sessions and OAuth tokens and rewrites accounts into local-only emails (`userN@mmw.test`). Dumps under `.db-dumps/` are gitignored and still contain production data until scrubbed. Do not commit them, quote them, or put the scrubbed password into docs.

Do not point `.env` at production for day-to-day `pnpm dev`.

## Tests

- Unit tests mock `@/lib/db`, `@/lib/auth`, and `fetch`. `vitest.setup.ts` loads dummy env from `tests/env.ts` and stubs `next/cache`.
- A component test opts into jsdom with `// @vitest-environment jsdom` on line 1.
- Integration tests call `resetDatabase()` in `beforeEach` and build rows with `tests/integration/factories.ts`. Use them for raw SQL, unique violations, transactions, and aggregates.
- Coverage ignores `src/components/ui/**` and generated Zod.

## Env

Names only. Values stay in `.env` / the host dashboard.

Server (`src/env.ts`): `DATABASE_URL`, `NODE_ENV`, `TMDB_API_KEY`, `RESEND_API_KEY`, `APP_URL`, `VIP_CODE`, storage keys, Telegram keys, `CRON_SECRET`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

Client: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Add a variable in all three places that must agree: `src/env.ts`, `tests/env.ts`, and the dummy env in CI. A missing Better Auth or Google variable fails the Vercel build even when the auth code is fine.

`DIRECT_URL` is read by Prisma config via `process.env`, not by the t3 env schema. It still has to exist wherever you generate or migrate.

## IMDB LTA operations

- Change phase from the admin controls on `/imdb-lta` (this tree), not by editing env.
- Rotate a batch from that same admin panel. If Telegram send fails, use the announce retry rather than rotating again.
- `pnpm` has no IMDB LTA seed. A JSON extract of production for offline stats was a one-off script in a chat; it is not a package script. Do not invent a new export that prints user emails.

## MAM operations

Follow `README.md` for SQL generation. Always `pnpm mam:refresh-scores` after pick or review imports. Special-mention SQL expects participants to exist already. Name mismatches between CSV and `MamParticipant.slug` are handled by the mapping table in `scripts/generate-mam-special-mentions-sql.ts`; extend that table instead of hand-editing production rows when a known alias shows up.

## Copy and language

Member-facing strings are Spanish (voseo: "puntuá", "viste"). Do not translate the UI to English in passing. Docs and code identifiers stay English.

## Files agents should not "clean up"

- `docs/IMDB_LTA.md` and `docs/superpowers/specs/` — historical plans. Update the banner or [HISTORY.md](HISTORY.md) if behavior changes; do not delete them to remove the contradiction.
- Board code while the flag is false.
- `data/mam-movies-cache.json` — shared TMDB cache for the import scripts.
