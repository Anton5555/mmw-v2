# Architecture

**Verified** against this working tree unless a paragraph says otherwise.

## Stack

- Next.js 16 App Router, React 19, React Compiler, Cache Components (`next.config.ts`: `reactCompiler`, `cacheComponents`).
- Tailwind 4, Radix UI, React Hook Form, Zod 4.
- Prisma 7 with the `pg` driver adapter. Generated client: `generated/prisma`, imported as `@generated/prisma/client`. App singleton: `src/lib/db.ts` (`DATABASE_URL`). CLI datasource: `DIRECT_URL` in `prisma.config.ts`.
- Better Auth (`src/lib/auth.ts`) with the Prisma adapter, email/password, Google, and the admin plugin. Handler: `src/app/api/auth/[...all]/route.ts`.
- Supabase is the hosted Postgres in production and the browser Realtime client (`src/lib/supabase-client.ts`, `persistSession: false`). Login is Better Auth, not Supabase Auth.
- TMDB for movie metadata. S3-compatible storage for uploads (`src/lib/utils/s3.ts`). Resend for mail. Telegram for club notifications.
- URL state for filters uses nuqs (`src/lib/searchParams.ts`, hooks under `src/lib/hooks/`).

## Request path

```
proxy.ts (cookie present? board off? public routes?)
  → (authed)/layout.tsx  Suspense + getCurrentSession()
  → page / server action
```

`src/proxy.ts` is an optimistic gate. It redirects a missing cookie to sign-in and redirects `/board` to `/home` while `BOARD_ENABLED` is false. It does not load the user.

`getCurrentSession` (`src/lib/get-session.ts`) is `React.cache` around `auth.api.getSession`. Authed pages wrap that read in `<Suspense>` so Next can prerender the shell. A missing session redirects to `/api/auth/clear-session`, which drops a stale cookie. That pattern replaced an attempt to mark every authed page `instant = false` (see [HISTORY.md](HISTORY.md)).

Server actions still call `auth.api.getSession` (or an equivalent) themselves. Layout auth is not enough.

## Data access

- Domain reads: `src/lib/api/*`. Several use the Next `'use cache'` directive (MAM, year tops, Oscar edition metadata, events).
- Mutations: `src/lib/actions/<feature>/`. Validate with Zod, then authorize, then write.
- Zod schemas: `src/lib/validations/`. `zod-prisma-types` emits `src/lib/validations/generated/`.
- One movie detail shell serves MAM, year tops, and user lists: `src/components/movie/movie-detail.tsx` with loaders in `src/lib/api/movie-detail.ts`. A sheet can open the same data via the `movieId` search param.

## Feature map

| Area | Routes | Main code | Notes |
| --- | --- | --- | --- |
| Home | `/home` | `src/components/daily-spotlight.tsx`, `src/lib/api/calculate-daily-recommendation.ts` | One `DailyRecommendation` row per UTC date. |
| MAM | `/mam`, `/mam/my-list`, `/mam/participant/[slug]`, `/mam/movie/[movieId]`, `/mam/special-mentions` | `src/lib/api/mam.ts` | Cached league columns on `Movie`. |
| Lists | `/lists`, `/lists/new`, `/lists/[id]`, `/lists/movie/[movieId]` | `src/lib/api/lists.ts` | Creating a list is admin-only. |
| Year tops | `/year-tops`, `/year-tops/[type]`, `/year-tops/movie/[movieId]` | `src/lib/api/year-top.ts` | Stats cached on `YearTopMovieStats`. |
| IMDB LTA | `/imdb-lta`, `/lote`, `/rate`, `/ranking`, `/admin`, `/admin/trivia` | `src/lib/api/imdb-lta.ts`, `imdb-lta-batches.ts`, `imdb-lta-trivia.ts`, `imdb-lta-notifications.ts` | Phase is a singleton row, not an env flag. |
| Oscalos | `/oscars`, `/oscars/predictions`, `/oscars/results`, `/oscars/admin` | `src/lib/api/oscars.ts`, `src/lib/actions/oscars/` | Results can stream after the ceremony starts. |
| Calendar | `/calendar` | `src/lib/api/events.ts`, `src/lib/api/telegram-events.ts` | Cron: `/api/cron/daily-events`. |
| Board | `/board` | `src/lib/actions/board/`, `src/lib/hooks/useBoardStream.ts` | **Off.** `BOARD_ENABLED` in `src/lib/config/features.ts` is `false`. Routes, actions, and the API return early. |

There is no separate admin app. Admin UI is a tab or a page inside the feature (`/imdb-lta/admin`, `/oscars/admin`, list creation).

## IMDB LTA shape

Phases on `ImdbLtaConfig` (id = 1): `NOMINATION_OPEN` → `NOMINATION_CLOSED` → `RATING_OPEN` → `RATING_CLOSED`. Transitions are manual (`update-phase.ts`).

During rating, movies move through batches of 10 (`ImdbLtaBatch` / `ImdbLtaBatchMovie`): locked (not yet in a closed or open batch), open (current lote), released (batch closed). Ranking and the public Revisar "Por votar" list only use released movies. The open lote is scored on `/imdb-lta/lote`.

Skips are `ImdbLtaSkip`. `pinnedAt` means "Quiero ver". A score deletes the skip, so the pin goes with it.

Trivia is an admin-operated game (`ImdbLtaTriviaGame`), not a cron. One active game is enforced in the trivia API.

## Realtime

Board posts and Oscar results subscribe from the browser. Postgres changes reach the client only if those tables are in the Supabase Realtime publication and `anon` can `SELECT` them. Steps: [SUPABASE_REALTIME.md](SUPABASE_REALTIME.md). Writes still go through server actions.

The board subscription is unused while the feature flag is off. The Oscar results page turns the stream on once `ceremonyDate` is in the past.

## Jobs and long requests

`vercel.json` only declares a cron: `GET /api/cron/daily-events` at `50 2 * * *`. Auth for that route is `CRON_SECRET` (`src/lib/utils/cron-auth.ts`).

`/imdb-lta` and `/lists/new` set `maxDuration = 60` because nomination overview / TMDB lookups can exceed the default serverless limit. The IMDB LTA admin page in this tree does not set `maxDuration`. A Nov 2026 chat described timeouts on batch rotate; whether production raised the limit on the admin route is **unverified** here.

## What this app does not use

- Supabase Auth and Supabase Storage policies for login. Storage uploads go through the AWS SDK.
- Drizzle. It is only an optional Better Auth peer in the lockfile.
- A production `migrate deploy` step in `vercel.json`. An earlier decision was to run migrations in the Vercel production build and skip them on preview. This tree does not encode that command. Confirm it in the Vercel project before relying on it ([HISTORY.md](HISTORY.md)).
