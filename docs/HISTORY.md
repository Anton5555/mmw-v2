# Historical context

Not current behavior, except where a paragraph says the incident still matters as a footgun. Current rules: [BUSINESS_LOGIC.md](BUSINESS_LOGIC.md).

## Superseded IMDB LTA rules

These were written into [IMDB_LTA.md](IMDB_LTA.md) and later reversed in code.

| Then | Now (this tree) |
| --- | --- |
| Shared unlock: a movie becomes rateable when someone other than its only nominator has nominated it. The sole nominator cannot rate it. | Any member can rate a candidate once it has left the locked state. |
| `/imdb-lta/ranking` shows a live ranking during `RATING_OPEN`, with copy that says it is not final. | The tab is hidden and the route redirects to the lote until `RATING_CLOSED`. Revisar hides averages too. |
| An earlier chat set the nomination cutoff at 31 Oct 2026. The plan doc was later edited to 6 Nov, which is what the code uses. | Writes stop after 6 Nov 2026 (Argentina). Phase still changes only when an admin says so. |

On 19 Nov 2026 the club asked for a Revisar dashboard: percent of released movies scored, the member's own nominations on that page, the Nominaciones tab dropped during rating, and admin controls moved to `/imdb-lta/admin`. The progress definition was **scores ÷ released movies**. Skips stay in the denominator and do not count as watched. Those components shipped (`summarizeRateProgress`, `revisar-progress-card.tsx`, `revisar-my-nominations.tsx`). On 20 Nov 2026 the tab was renamed Inicio and gained personal stats (see DECISIONS). Source: [Revisar tab enhancements](ba323235-8219-42a9-bf2a-fafff9fd484e).

Other follow-ups described in chats around PRs 90–93 (a "No la vi" button on Por votar cards, a single Telegram album, a batch reminder action, trivia scoreboard on solve) were reported against a newer remote. They are **unverified** in this tree. Do not document them as current without seeing the files.

## Ideas that were not built

- **Mid-season nomination subphase.** Halfway through batches, people who nominated in phase 1 would add one movie, for about three days, with global de-duplication. Planning only. No schema. Source: chat `f80c8380`.
- **Sentry** (or any error tracker) for the case where Telegram succeeds and the server action still returns an error. Not in the repo.
- **Voting UI inside Telegram.** Dropped in favor of links back to the site.

## Data incidents

### MAM reviews disappeared after a reset

October 2026. A database reset dropped `MamPick.review` text. Recovery was re-import from `data/mam_rev.json` via `pnpm mam:generate-reviews-sql`, plus manual slug fixes where the CSV handle did not match `MamParticipant.slug`. At least one review had been attached to the wrong `imdbId` and was moved.

Do not reset the database to fix missing rows. Source: [MAM picks review issue](fe42d8d1-48d1-40bd-a50b-b0978a8d262f).

### Local Prisma errors that were a down database

`ECONNREFUSED` against `localhost:5433` means Postgres is not running or `.env` still points at the wrong port. It is not a corrupt client. Source: [Prisma client errors](c8f0b6d7-1f3f-489e-b565-0535a88e2c73).

### Stale session cookie

The proxy treated a leftover cookie as a logged-in user and the layout then failed the real session check. `/api/auth/clear-session` exists for that loop. Source: [Login session error](5307813b-a893-4d72-b108-be5d95dc32df) — transcript was not in the local archive; the route is what this tree implements.

## UI history worth not repeating

- Post-it board (2026-01) went through grid libraries, realtime, and a "maximum update depth" loop on create. The feature shipped and was later disabled with `BOARD_ENABLED`. Do not revive a second board implementation.
- Country filters were duplicated on list and MAM toolbars (three country comboboxes). The fix was to delete the extras, not to add another. Source: [Broken search filter in movie lists](e8ac3853-c253-4b3a-8758-6910c5c8f2ba).
- MAM rank is a cached column. Changing pick scores in SQL without `mam:refresh-scores` leaves the grid lying. That happened during early imports.
- Home spotlight's first sketch was weekday-themed (top 100 on one day, a member's five on another). The code that landed is a three-way rotation by date seed, with movies limited to `mamRank <= 100`. The weekday script is **historical**.

## Auth and deploy history

- Google OAuth deploy failures were missing env vars, not a bad callback. The set is whatever `src/env.ts` requires.
- Vercel/serverless Prisma is the driver adapter in `src/lib/db.ts`. An early "Prisma module not found on Vercel" incident was the generated client and bundling, not a reason to change ORMs.
- Admin batch rotate could outlive the default function limit: Telegram got the album, the action returned an error, and the UI looked failed. This tree sets `maxDuration = 60` on `/imdb-lta` (the page that hosts the batch panel) and on `/lists/new`. It does not set it on `/imdb-lta/admin`.

## Chats that are not project memory

Resume, portfolio, and LinkedIn threads mention this repo as a product example. They do not change how MMW works. Ignore them when implementing features.
