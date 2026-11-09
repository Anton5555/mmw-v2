# IMDB LTA admin votes

Read-only admin page that shows every IMDB LTA score: movie averages, and each person's scores. The public ranking stays unchanged and still hides who scored what.

## Access

- Route: `/imdb-lta/admin`.
- Signed-out users redirect to `/sign-in`.
- Signed-in users whose `session.user.role` is not `admin` redirect to `/imdb-lta`.
- The page does not check phase. It renders in `NOMINATION_OPEN`, `NOMINATION_CLOSED`, `RATING_OPEN`, and `RATING_CLOSED`.
- `listAdminRatingSnapshot()` is called only after the admin check on this page. It is not exposed as a server action.

## Entry

`ImdbLtaPhaseNav` gains an Admin tab (`/imdb-lta/admin`, label `Admin`) when the caller passes `isAdmin`. The tab is visible in every phase. Pass `isAdmin` from each IMDB LTA page that already renders the nav (`/imdb-lta`, `/imdb-lta/rate`, `/imdb-lta/ranking`, `/imdb-lta/admin`).

During `NOMINATION_OPEN`, non-admins still see no nav (only the Nominaciones tab would exist). Admins see Nominaciones and Admin, so the nav renders.

No sidebar item.

## Data

`listAdminRatingSnapshot()` in `src/lib/api/imdb-lta.ts` loads nominations and ratings in one `Promise.all`, then groups in memory. It follows `listAdminNominationSnapshot`: the function does not re-check the role; the page does.

A movie is included when it has at least one nomination or at least one rating.

Summary:

- `movieCount` — movies in the list (nominated, rated, or both)
- `totalRatings` — rating rows
- `voterCount` — distinct users with at least one rating

Each movie:

- `id`, `title`, `originalTitle`, `posterUrl`, `imdbId`
- `ratingCount`
- `averageScore: number | null` — arithmetic mean of that movie's integer scores, full precision; `null` when `ratingCount` is 0
- `votes` — `{ userId, name, score, createdAt }[]`

Movie order:

1. Movies with `ratingCount > 0` before movies with `ratingCount === 0`.
2. Higher `averageScore` first.
3. Higher `ratingCount` first.
4. Title ascending, `localeCompare` with `'es'` and `{ sensitivity: 'base' }`.

Votes inside a movie: higher `score` first, then name with the same locale compare.

Each person (only users with at least one rating):

- `userId`, `name`
- `ratingCount`
- `averageScore` — mean of that person's scores, full precision
- `ratings` — `{ movieId, title, originalTitle, posterUrl, score, createdAt }[]`

Person order: higher `averageScore`, then higher `ratingCount`, then name (`es`, base). Ratings inside a person: higher `score`, then title (`es`, base).

`createdAt` stays a `Date` on the snapshot. The page formats it before passing props to the client.

## UI

Spanish copy. Same dark IMDB LTA page as nominations (`container`, `max-w-5xl`). Admin accent matches the nominations overview (yellow border and label).

Server page: `src/app/(authed)/imdb-lta/admin/page.tsx`. Client view: `src/app/(authed)/imdb-lta/_components/imdb-lta-admin-ratings.tsx`. The server page formats each `createdAt` with `Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires' })` and passes strings. Averages render with one decimal (`toFixed(1)`). A null average renders as `Sin puntaje`.

Top line: `{movieCount} películas · {totalRatings} puntajes · {voterCount} personas`.

**Películas.** One row per movie: poster, title, average, vote count. Rows start collapsed. Expanding a row lists each voter’s name, score (0–10), and formatted date. A movie with zero scores shows `Sin puntaje` and an empty voter list.

**Personas.** Below the movie list. One collapsed block per voter: name, their average, and how many scores they cast. Expanding lists each movie title and score. When `voterCount` is 0, the section shows `Nadie puntuó todavía.` Nominated movies still render above that message.

Scores are display-only. This page does not edit or delete ratings, and it does not change ranking qualification (public ranking still requires 5 scores while voting is open).

## Tests

Unit tests in `src/lib/api/imdb-lta.test.ts`, same Prisma mock style as the nomination snapshot tests:

- Mean per movie and per person.
- Movie sort: rated before unrated, then average, then count, then title.
- A nominated movie with zero ratings is included with `averageScore: null`.
- A user with zero ratings is absent from `people`.
- Votes inside a movie sort by higher score first, then name (`es`, base).

## Out of scope

Editing or deleting scores, changing who may rate, public per-person scores, a sidebar link, and any admin tools beyond this read-only view.
