# Business logic

**Verified** in this working tree. Scoring constants live next to the code so a doc and a magic number cannot drift quietly: IMDB LTA numbers are in `src/lib/validations/imdb-lta.ts`.

MAM, year tops, user lists, Oscars, and IMDB LTA are different games. Do not reuse one feature's points as another's.

## MAM (Míralas Antes de Morir)

Each `MamParticipant` has at most one `MamPick` per movie.

| Pick | `score` | `isSpecialMention` |
| --- | --- | --- |
| Top pick | 5 | false |
| Normal pick | 1 | false |
| Special mention (MAMción) | 0 | true |

The main grid (`getMamMovies`) shows movies with `mamTotalPicks > 0`, hides special-mention rows from the pick list, and sorts by `mamTotalPoints` desc, then `mamTotalPicks` desc, then title. Personal lists do the same exclusion.

`/mam/special-mentions` lists movies that have at least one special mention. It does not require `mamTotalPicks > 0`.

`pnpm mam:refresh-scores` recomputes the cached columns from **every** `MamPick` row, including special mentions. Because those rows score 0, they do not add points, but they do increase `mamTotalPicks` and lower `mamAverageScore`. `mamRank` is then a dense rank of movies with `mamTotalPicks > 0`, ordered by points, pick count, title.

A comment in `src/lib/api/mam.ts` says a movie that only has special mentions does not count toward `mamTotalPicks`. That is not what `scripts/refresh-mam-scores.ts` does. Treat the script as the writer of those columns.

Import order and file names: `README.md` (MAM Data Import). After any pick or review SQL, run `mam:refresh-scores` or ranks stay stale.

## Year tops (Top del Año)

Stored pick types: `TOP_10`, `BEST_SEEN`, `WORST_3`.

The route `best-and-worst` is not a stored type. It selects movies that appear in both `TOP_10` and `WORST_3` for that year.

Points, applied at import (`scripts/import-year-top-data.ts`): rank 1 of a `TOP_10` or `WORST_3` entry is 2 points (`isTopPosition`); every other pick, including all `BEST_SEEN`, is 1. Community pages sort by `YearTopMovieStats.totalPoints`.

If a `MamParticipant` slug matches, year-top import reuses that `userId`. **Unverified** beyond the import scripts' own comments and the Jan 2026 import chats: confirm the mapping table in the script before relying on a specific nickname.

## User lists

A `List` is a named set of movies (`MovieList`), with optional Letterboxd URL, image, and tags. Creation (`create-list.ts`, `/lists/new`) is limited to `session.user.role === 'admin'`. The flow pastes IMDb ids and resolves them (TMDB), which is separate from IMDB LTA nominations.

## Dónde verla

The movie detail (page and sheet) shows where the movie can be watched in the viewer's country: subscription, free, free with ads, rent. Buying is not shown or stored. Data is TMDB watch providers (by JustWatch) and the section credits JustWatch. The country is `User.watchCountry` (ISO 3166-1 alpha-2), which each member picks in the profile dialog from `WATCH_COUNTRY_CODES` (`src/lib/watch-countries.ts`). Null means `AR`. The country shows with its flag. The section is hidden when the movie has no stored options for that country.

Only tracked countries are stored: every distinct `watchCountry` plus `AR`. `/api/cron/watch-providers` refreshes a batch (default 150) of the movies synced longest ago, never-synced first. A new member country appears on a movie the next time the cron reaches it.

## Home spotlight

`getDailyContentType` rotates by `seed % 3` of the UTC date: movie, list, participant. Movie days pick among `mamRank <= 100`. The curator line prefers a non-special-mention MAM pick that has a review. The row is stored so the same date does not reshuffle.

## Calendar

`Event.year` null means the event repeats every year on `month`/`day`. Typed with `EventType`. The daily cron posts upcoming events to Telegram; the site remains the place events are edited.

## Oscalos

One `OscarBallot` per user per edition. A second submit hits the unique constraint and is rejected. The ballot must pick every category.

The edition must be `isActive`. If `ceremonyDate` is set, submit closes 3 hours before that instant. The error formats the ceremony in `America/Los_Angeles`.

`/oscars/predictions` aggregates picks before winners exist. `/oscars/results` is the leaderboard. `OscarBallot.score` is written when an admin sets `OscarCategory.winnerId` (`set-winners.ts`). Ties share a rank. Live updates use Supabase Realtime once the ceremony time has passed.

Ballots are not editable. That is intentional, not a missing update action.

## IMDB LTA

Community ranking of movies nominated by members. UI labels: Nominaciones, Lote actual, Revisar, Ranking, Admin, Trivia.

### What counts

- A nomination does not add ranking points. It only puts the movie in the candidate set.
- A rating is an integer 0–10. One row per `(userId, movieId)`. Submitting again updates it.
- A movie qualifies for the official ranking with at least 5 distinct ratings (`IMDB_LTA_MIN_RATINGS_TO_QUALIFY`).
- Order: average desc, then rating count desc, then title (`es`). Only **released** batch movies are included. Locked and open-batch movies stay off the list.
- Nomination count is not a sort key.
- There is no Bayesian average, reputation weight, or nomination bonus. The original plan forbade those, and this tree still does not have them.

### Who may rate

`canUserRateMovie`: the movie has at least one nomination, and its batch state is not `locked`. Any member may rate it, including the only nominator, and including a movie they nominated. Callers also require phase `RATING_OPEN` (`assertRatingPhaseOpen`).

The older "shared unlock / solo nominator cannot rate" rule is **historical**. See [DECISIONS.md](DECISIONS.md).

### Phases and the nomination deadline

Phase changes are admin actions. Nothing auto-advances because "enough people voted".

Nomination writes require `NOMINATION_OPEN` **and** a calendar date on or before 6 Nov 2026 in `America/Argentina/Buenos_Aires` (`IMDB_LTA_NOMINATION_DEADLINE`). After that date, writes stop even if the phase is still open. The phase does not flip by itself. The open window is labeled **Para los rezagados**. List length is 25–50 titles (`IMDB_LTA_MIN_NOMINATIONS`, `IMDB_LTA_MAX_NOMINATIONS`).

An October 31 deadline was an earlier cutoff. It is **historical**.

### What members see during the season

While `RATING_OPEN`:

- The Ranking tab is hidden. `/imdb-lta/ranking` redirects to `/imdb-lta/lote`.
- Revisar nulls `averageScore` and shows rating count as 0 (`hideAggregates` on `rate/page.tsx`). Members should not see a group promedio mid-season.
- Admins still see averages and individual scores on `/imdb-lta/admin` (Películas, Personas, Lotes). That page is not phase-gated.

The original plan's "live/provisional ranking during `RATING_OPEN`" is **historical**.

`/imdb-lta` still shows the nomination builder and, for admins, the phase switcher, batch panel, and group nomination overview. The Nominaciones tab stays visible in every phase (`visible: () => true`).

### Estadísticas

The Estadísticas tab (`/imdb-lta/stats`) is visible in `RATING_OPEN` and `RATING_CLOSED`. It shows personal stats built by `loadImdbLtaDashboard` → `summarizeDashboard` (`src/lib/api/imdb-lta-dashboard.ts`). Revisar stays focused on reviewing and changing scores.

- **Scope:** movies that appeared in a lote, open or closed (`batchState !== 'locked'`). Locked candidates never count. The Progreso card on Revisar keeps its older definition, closed lotes only.
- **Sections:**
  - **Tus lotes:** your scored/total per lote. A re-queued movie counts in each lote it appeared in.
  - **Tu forma de puntuar:** a histogram of your own scores, your average, your most-used score.
  - **Tu ritmo:** how many scores you gave per week over the last 12 weeks.
  - **Lo que salió:** released vs watched counts by década, género and país. Each row also shows "tu promedio" if you have 3 or more scores in it.
- **Never shown:** group averages, group rating counts, rankings, comparisons with the club, or any list of movies ordered by score. A unit test checks that group fields on the input do not change the output.
- **Bucket order:** buckets are sorted by count, or by chronology for décadas, never by score.

### Revisar filters

Implemented in `matchesRatingFilter`:

| Tab | Filter | Who is on it |
| --- | --- | --- |
| Por votar | `pending` | Released, eligible, not scored, not skipped. Optional "solo las que no llegan al ranking" keeps movies under 5 ratings. Sort: fewest ratings first. |
| Ya puntuadas | `mine_done` | Scored, and batch is open or released (so a lote vote can be edited). Open-batch scores sort first. |
| No vistas | `not_seen` | Skipped, not pinned, still eligible. Includes the open batch. |
| Quiero ver | `want_to_watch` | Skipped and `pinnedAt` set. Newest pin first. |

"No la vi" on the lote deck creates the skip. In this tree, Por votar cards do not themselves offer that button. A later chat added it on the review grid; that control is not in `rate/_components` here (**unverified** as shipped).

### Batches

- Size 10. One `OPEN` batch. An admin rotates it from the UI. There is no batch cron.
- Re-queue into a new batch: still under 5 ratings, at most 3 such movies per batch, at most 3 appearances of the same movie (`IMDB_LTA_BATCH_REQUEUE_CAP`, `IMDB_LTA_BATCH_MAX_APPEARANCES`).
- Do not re-queue when at least 70% of active raters skipped it (`IMDB_LTA_SKIP_REQUEUE_THRESHOLD`). Active raters are users with at least one IMDB LTA rating.
- Once you finish the open lote, its "Ya votaste este lote" card lists **Ya votaron** and **Faltan** (`listBatchParticipation`). A person is done once they have rated or marked "no vista" every movie in the lote. The list covers anyone with an IMDB LTA nomination, rating or skip. Pending people show their own count (e.g. 4/10). Scores are never shown.

### Telegram

The site is the system of record. Telegram only notifies.

- Rotating a batch announces the closed batch and the new one. `announcedAt` is the retry marker so a failed send can be repeated without a second logical announce.
- Pinning Quiero ver posts once per claim key. Other people who already pinned the same film are named.
- Finishing every movie in the open batch (skips do not count as finished) posts once per `(user, batch)`.
- Claim keys live in `ImdbLtaNotification`. A unique violation means "already sent".
- Do not put `localhost` in an inline keyboard URL. Telegram rejects it.
- Do not post on every single score. The club asked for the batch and the Quiero ver ping only.

Copy builders: `src/lib/api/imdb-lta-notifications.ts`.

### Trivia

Admin builds a game in `/imdb-lta/admin/trivia`: still frames cropped with `sharp`, clues from TMDB, then a reveal. It is not generated from admin stats and it is not scheduled. The user rejected both of those.

## Board

Posts are Lexical JSON plus an `order`. Realtime was built so a new card appears without refresh. The product flag is off, so none of this is reachable from the sidebar. Re-enable by setting `BOARD_ENABLED` to true; the Realtime publication still has to include `BoardPost`.
