# IMDB LTA — product, process, and implementation plan

Community ranking of the best movies of all time, next to MAM. Conceptual flow:

**NOMINATE → SCORE → RANK**

| Piece | Status | Route |
| --- | --- | --- |
| Nominations (Phase 1) | Shipped | `/imdb-lta` |
| Ratings (Phase 2) | Planned — do not implement until a dedicated task | `/imdb-lta/rate` |
| Ranking (Phase 3) | Planned — do not implement until a dedicated task | `/imdb-lta/ranking` |

UI copy is Spanish. Phase lives in a singleton DB row (`ImdbLtaConfig` id=1), not env flags. The UI reflects closed states; **server-side phase guards are the real protection**.

This document is the product/process source of truth and the implementation-ready plan for Phases 2 and 3. Phase 1 code already matches the shipped sections below.

---

## Product principles (v1)

| Principle | Meaning |
| --- | --- |
| Nominations define the universe | Phase 1 decides which movies are candidates |
| Ratings define quality | Score comes only from user ratings (integers 0–10) |
| Rating count defines qualification | A movie needs ≥5 ratings from **distinct users** to enter the official ranking |
| Average defines rank | Among qualified movies, primary sort is average score DESC |
| Nomination count never matters for ranking | 1 nominator or 30: still one candidate; zero ranking points from nominations |
| Rating count does not directly matter for ranking | Extra ratings do not add points. Count is only: (1) qualification threshold, (2) tie-breaker when averages are equal |
| Discovery does not influence ranking | Sort/filter/featured order is UX-only. Showing a movie more often never gives ranking points |

Do **not** introduce for v1: Bayesian averages, Wilson scores, weighted ratings, reputation, nomination bonuses, popularity bonuses, recency weighting, editable ratings, rating deletion, emails/notifications, TMDB name search, full admin console, or an automated test suite (the repo has none).

---

## Terminology

Keep these distinct in code, UI, and docs:

| Term | Definition |
| --- | --- |
| **Candidate** | A movie that appears in at least one nomination after `NOMINATION_CLOSED`. Frozen universe for the whole rating phase. |
| **Eligible to rate** | A candidate the current user is allowed to score under the shared-unlock rule, and has not already rated, while `RATING_OPEN`. |
| **Qualified for ranking** | A candidate with ≥5 ratings from distinct users. Prefer “Qualified” over “ranked” for the 5+ filter — 5 ratings unlock eligibility to appear in the ranking, they do not set position. |
| **Officially ranked** | Position on `/imdb-lta/ranking` among qualified movies, sorted by average (then tie-breakers). Final/official only after `RATING_CLOSED`; during `RATING_OPEN` the same page may show **live/provisional** results. |

Also keep separate from domain models:

| Concept | What it is | Status |
| --- | --- | --- |
| **Movie** | Catalog row. Unique on `imdbId`. No LTA score columns required for Phase 2. | Exists |
| **Nomination** | User ↔ movie. Unique `(userId, movieId)`. Count is not a ranking input. | Exists |
| **Rating** | Independent user ↔ movie integer score 0–10. Unique `(userId, movieId)`. | Schema stub ready; API/UI are Phase 2 |

Do not mix with MAM (nomination-as-points), Oscars (one-shot ballot), or Create List (bulk IMDb textarea).

---

## Lifecycle

```
NOMINATION_OPEN  →  NOMINATION_CLOSED  →  RATING_OPEN  →  RATING_CLOSED
   Phase 1 live        freeze candidates      Phase 2         Phase 3 final
```

All transitions are **manual admin actions**. Nothing auto-closes because “everyone submitted,” “enough ratings,” or any heuristic.

| Phase | Nominations | Ratings | Ranking page |
| --- | --- | --- | --- |
| `NOMINATION_OPEN` | Add, remove, Guardar. Editable after save. | Closed | N/A |
| `NOMINATION_CLOSED` | Read-only. Candidate universe frozen. | Closed | N/A |
| `RATING_OPEN` | Frozen. Mutations rejected server-side. | Score eligible films 0–10 | Live/provisional for qualified movies |
| `RATING_CLOSED` | Frozen | No new ratings. Personal scores view-only. | **Official / final** IMDB LTA ranking |

Admin phase UI: switcher on `/imdb-lta` (visible only when `session.user.role === 'admin'`). Calls `updateImdbLtaPhaseAction` (server re-checks admin). Prisma Studio remains a fallback.

Admins also get a collapsible **Nominaciones del grupo** panel on the same page: all nomination rows (including drafts without Guardar), per-user counts/submitted status, and movies sorted by nomination count with nominator names.

### Nomination closure (manual)

`NOMINATION_OPEN → NOMINATION_CLOSED` is explicit. Until closed:

- users may still edit lists (add/remove/save again)
- latest valid state remains editable

Once `NOMINATION_CLOSED`:

- candidate universe is frozen: `DISTINCT movieId` from all nomination rows
- no nomination mutations (server rejects)
- Phase 2 operates only on that frozen set
- **no new candidates** during rating

Nomination count never becomes ranking points. A movie nominated by 1 user and one nominated by 30 users are each simply one candidate.

---

## Phase 1 — Nominations (shipped)

Authenticated users build a personal list of 25–50 films at `/imdb-lta`.

### Lookup on Enter / live typeahead

While the user types (2+ characters), a dropdown shows matching movies from the **internal DB only** (title / originalTitle contains, or exact IMDb ID). Click or Arrow+Enter adds from the list. No TMDB name search.

| Input | First look | If miss | If several hits |
| --- | --- | --- | --- |
| IMDb ID (`tt` + 7–8 digits) | Internal movie by `imdbId` | Typeahead: “apretá Enter para traerla”; Enter → TMDB find + persist, then add | N/A |
| Title text | Live dropdown of internal hits | Typeahead: ask for IMDb ID. **No TMDB name search.** Enter asks for ID. | Enter may open in-app picker of internal hits; or pick from dropdown |

**SUBMITTED ≠ LOCKED.** `submittedAt` is “last Guardar with a valid 25–50 list.” Locking is only `phase !== NOMINATION_OPEN`.

Every mutation calls `assertNominationPhaseOpen()`. Add/remove persist immediately.

---

## Phase 2 — Ratings (planned)

Route: `/imdb-lta/rate`. Extend [`src/lib/api/imdb-lta.ts`](src/lib/api/imdb-lta.ts), validations in [`src/lib/validations/imdb-lta.ts`](src/lib/validations/imdb-lta.ts), actions under `src/lib/actions/imdb-lta/`. No schema change required — `ImdbLtaRating` already exists.

### 2.1 Rating scale

- Integers **0 through 10** only
- No decimals, no half points
- `0` is valid; `10` is maximum
- Stored value is the integer score
- UI must make the 0–10 scale obvious; stars only if they map 1:1 to that integer (optional visual)

Suggested meaning for users (copy guidance, not separate schema):

| Score | Meaning |
| --- | --- |
| 0 | Mala / no recomendable |
| 5 | Promedio |
| 7 | Buena |
| 8 | Muy buena |
| 9 | Excelente |
| 10 | Obra maestra |

### 2.2 Who can rate (shared unlock)

All must hold. Enforce in `canUserRateMovie` / `submitRating` (server), not only UI:

1. Phase is `RATING_OPEN`
2. Movie is in the frozen candidate universe
3. User has not already rated that movie
4. **Either** the user did **not** nominate it, **or** they nominated it **and** `COUNT(nominations for movieId) >= 2`

| Situation | Can rate? |
| --- | --- |
| Did not nominate; someone else did | Yes |
| Nominated; at least one other also nominated | Yes (shared unlock) |
| Only they nominated it | **No** (solo lock) |
| Already rated | No |
| Phase ≠ `RATING_OPEN` | No |

Rationale: if everyone nominates The Godfather, a “never rate your nominations” rule would leave it unrateable.

### 2.3 One rating per user/movie (v1 immutable)

- Unique `(userId, movieId)`
- No edit, no delete in v1
- Unrated lists must not include already-rated movies
- `mine_done` may show past scores as view-only

### 2.4 Rating phase closure (manual)

`RATING_OPEN → RATING_CLOSED` is admin-only. Do not auto-close.

When `RATING_CLOSED`:

- reject new ratings server-side
- ranking uses the completed dataset as **official/final**

### 2.5 Discovery / main list UX

Goal: distribute ratings across the candidate universe (“help **complete** the ranking”), not concentrate on famous titles. Discovery/sort is **UX-only** and must never affect ranking scores.

**Main grid default sort:**

1. Eligible unrated movies with the **fewest** global ratings first
2. Then title ASC

Avoid repeatedly pushing the same movie to the same user when other eligible unrated movies remain.

**Rating page flow:** discover eligible movie → poster/title → score 0–10 → submit → move efficiently to another unrated movie.

### 2.6 Filters

| Key | UI label guidance | Meaning |
| --- | --- | --- |
| `unrated` | Sin tu puntaje | Eligible for current user; not yet rated by them |
| `no_scores` | Sin puntajes | 0 global ratings; still eligible for user |
| `low` | Pocas puntuaciones | 0–2 global ratings |
| `close` | Cerca de calificar | 3–4 global ratings |
| `qualified` | Calificadas | ≥5 global ratings (**not** “ranked” — qualification only) |
| `mine_done` | Ya puntuadas | Current user already rated — view-only |

Prefer filter key `qualified` over `ranked`.

### 2.7 Featured discovery strip

**Destacadas sin tu puntaje** (~8–12 movies):

- eligible for current user, not yet rated by them
- at least one global rating
- order: average score DESC, then rating count DESC

Does **not** replace filters. Does **not** affect ranking. Same 0–10 control as the grid.

### 2.8 Movies below the 5-rating threshold

Movies with fewer than 5 ratings:

- remain candidates
- remain rateable while `RATING_OPEN` (if user-eligible)
- remain visible via filters / discovery
- are **not** on the official ranking list until they reach 5

They must not disappear solely because they are under the threshold.

### 2.9 API surface (implementation checklist)

- `assertRatingPhaseOpen()`
- `canUserRateMovie(userId, movieId)`
- `listRateableCandidates(userId, { filter, page, limit })` — eligibility + filter + fewest-ratings-first
- `listHighlightUnrated(userId, limit)` — Destacadas strip
- `submitRating(userId, movieId, score)` — Zod `z.number().int().min(0).max(10)` + eligibility
- Live aggregates via SQL/`_count`/`_avg` initially

Optional later (not Phase 2 requirement): denormalize `ltaRatingCount`, `ltaAverageScore`, `ltaRank` on `Movie`.

### 2.10 UI checklist

- `/imdb-lta/rate` with filters (nuqs), Destacadas strip, 0–10 picker, toast on submit
- Hub `/imdb-lta` phase-aware links: Nominaciones | Puntuar | Ranking
- Nominations stay read-only when phase ≠ `NOMINATION_OPEN`
- When `RATING_CLOSED`: no submit; personal scores / averages view-only as appropriate

---

## Phase 3 — Official ranking (planned)

Route: `/imdb-lta/ranking`.

### 3.1 Qualification

A movie is **qualified** when it has **≥5 ratings from different users**.

- 4 ratings → not qualified
- 5, 10, 100 ratings → all qualified
- Rating count is a **reliability threshold only**, not points

### 3.2 Ranking score

```
score = AVG(all valid integer ratings 0–10)
```

Transparent. No nomination bonuses, rating-count bonuses, Bayesian/Wilson, reputation, recency, or popularity weighting.

Example: averages 8.6 vs 9.0 → 9.0 ranks higher regardless of which had more nominations.

### 3.3 Sort and tie-breakers (deterministic)

1. Average score **DESC**
2. Rating count **DESC** (tie-breaker only — not points)
3. Movie title **ASC**

### 3.4 Live vs final

| Phase | Ranking page presentation |
| --- | --- |
| `RATING_OPEN` | Live/provisional averages and positions for qualified movies. Copy must not imply “final.” |
| `RATING_CLOSED` | Official / final IMDB LTA ranking |

### 3.5 Ranking page UI

For each qualified movie, show at least:

- rank
- poster
- title
- average as a clear 0–10 average (decimal display precision is a UI choice; calculation uses the true mean of integers)
- rating count

Example shape:

```
#1  The Godfather
    9.24 / 10
    137 ratings
```

---

## Implementation order — done

1. Eligibility helper + rating Zod + `submitRating` + phase gate
2. `listRateableCandidates` (filters including `qualified`) + `listHighlightUnrated`
3. `/imdb-lta/rate` UI (Destacadas + filters + 0–10 + fewest-ratings-first)
4. Phase-aware hub on `/imdb-lta`
5. Ranking query (avg, ≥5, tie-breakers) + `/imdb-lta/ranking` with live vs final copy
6. Optional Movie denormalized LTA fields — skipped (not needed)
7. Verify: shared unlock; solo lock; filters; Destacadas; under-5 stay rateable; ranking threshold and tie-breakers

---

## Out of scope (v1 Phase 2–3)

- Changing Phase 1 nomination UX
- Editable / deletable ratings
- Emails / notifications
- TMDB name search
- Full admin console beyond the hub phase switcher
- Statistical ranking formulas beyond simple average + tie-breakers
- Automated tests (unless the project adds a suite later)

---

## Delivery checklist

**Phase 1 — done**

- [x] Schema, migration, seed config row
- [x] Internal-first lookup; TMDB only by IMDb ID
- [x] Add / remove / Guardar with phase gate, unique, 25–50
- [x] `/imdb-lta` page; sidebar + breadcrumb
- [x] Closed-phase nomination rejection

**Phases 2–3 — done**

- [x] `canUserRateMovie` (shared unlock) + `submitRating` 0–10 + `assertRatingPhaseOpen`
- [x] Filters (`unrated`, `no_scores`, `low`, `close`, `qualified`, `mine_done`) + Destacadas
- [x] `/imdb-lta/rate` UI; coverage-first sort
- [x] Phase-aware hub; nominations read-only during rating
- [x] Ranking: AVG + ≥5 + tie-breakers; live vs final copy on `/imdb-lta/ranking`
- [x] Verify shared unlock, solo lock, filters, discovery, under-5 candidates, ranking

---

## Remaining unresolved product decisions

None that block Phase 2/3. Scale (0–10), shared unlock, manual phase transitions, qualification (5), average + tie-breakers, and discovery-as-UX-only are finalized.
