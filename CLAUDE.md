# MMW v2

Private film-club app (Next.js App Router, React 19, Prisma 7, Better Auth). UI copy is Spanish. The sidebar is Listas, Calendario, MAM, IMDB LTA, Top del Año, Oscalos, and Sobre la app. The community board exists in code and is turned off.

Read [docs/INDEX.md](docs/INDEX.md) before changing a feature. Product rules live in [docs/BUSINESS_LOGIC.md](docs/BUSINESS_LOGIC.md). Why those rules exist, and what was rejected, lives in [docs/DECISIONS.md](docs/DECISIONS.md).

## How to work in this repo

- Package manager is pnpm. Default branch is `master`.
- React Compiler is on (`reactCompiler: true`). Do not add `useMemo`, `useCallback`, or `React.memo` unless a profile shows a real bottleneck.
- Authenticate inside every server action and route handler. `src/proxy.ts` only checks that a session cookie exists.
- After a Prisma schema change: `pnpm db:generate`, then `pnpm db:migrate:create <name>` (does not apply SQL), review the SQL, then `pnpm db:migrate:deploy`. Do not `db:push` against a shared database.
- Runtime queries use `DATABASE_URL` through `@/lib/db`. The Prisma CLI uses `DIRECT_URL` (`prisma.config.ts`).
- New env vars go in `src/env.ts`, `tests/env.ts`, and CI together. Never commit or document secret values.
- Tests sit next to the code (`*.test.ts`). Integration tests (`*.integration.test.ts`) hit real Postgres. See [docs/CONVENTIONS.md](docs/CONVENTIONS.md).
- Do not reset or scrub a database unless the user asks. A past MAM repair lost reviews that way.

## Easy to get wrong

- Admin checks in pages and IMDB LTA / Oscars / list actions use the string `admin` (Better Auth). `src/lib/auth-utils.ts` and the profile form compare against `ADMIN`. The Prisma `UserRole` enum is not the column type; `User.role` is a string.
- Sign-up is VIP-gated on the server (`src/lib/vip.ts`), not only in the form. Google cannot create a user on sign-in (`disableImplicitSignUp`).
- IMDB LTA scores are hidden from members until `RATING_CLOSED`. Admins can see them on `/imdb-lta/admin` during the season.
- `docs/IMDB_LTA.md` is the original phase plan. Several of its rules were later reversed. Current behavior is in [docs/BUSINESS_LOGIC.md](docs/BUSINESS_LOGIC.md).
- The Revisar tab is now **Inicio** (`/imdb-lta/rate`), with the progress card, your own nominations, and personal stats (`src/lib/api/imdb-lta-dashboard.ts`). It must never show group scores, rating counts or rankings, not even anonymous club totals. See DECISIONS "Inicio shows only personal stats".
