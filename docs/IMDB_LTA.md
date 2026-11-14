# IMDB LTA — product, process, and implementation plan

Community ranking of the best movies of all time, next to MAM. Conceptual flow:

**NOMINATE → SCORE → RANK**

| Piece | Status | Route |
| --- | --- | --- |
| Nominations (Phase 1) | Shipped | `/imdb-lta` |
| Ratings — current batch (Phase 2) | Shipped | `/imdb-lta/lote` |
| Ratings — review / edit (Phase 2) | Shipped | `/imdb-lta/rate` |
| Ranking (Phase 3) | Shipped | `/imdb-lta/ranking` |

UI copy is Spanish. Phase lives in a singleton DB row (`ImdbLtaConfig` id=1), not env flags. The UI reflects closed states; **server-side phase and deadline guards are the real protection**.

Phase transitions are always **manual admin actions**. Nomination **writes** also stop after **6 November 2026** (end of day, `America/Argentina/Buenos_Aires`, GMT−3) even if the phase is still `NOMINATION_OPEN`. That date freeze does **not** auto-flip the phase — an admin must still move to `NOMINATION_CLOSED` to freeze the candidate universe for rating. The open window is labeled **Para los rezagados**.

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

Do **not** introduce for v1: Bayesian averages, Wilson scores, weighted ratings, reputation, nomination bonuses, popularity bonuses, recency weighting, rating deletion, emails, TMDB name search, full admin console, or a dedicated E2E suite (unit tests live in `src/**/*.test.ts`; see README). Telegram social pings for Quiero ver and batch all-rated are in scope (see §2.5).

Ratings **are editable** after a movie’s batch closes (and while still in the open batch via the lote deck). There is still one score per `(userId, movieId)`.

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

All **phase** transitions are **manual admin actions**. Nothing auto-closes because “everyone submitted,” “enough ratings,” or any heuristic. Nomination writes also stop after the fixed deadline (6 Nov 2026 ART) without changing the phase.

| Phase | Nominations | Ratings | Ranking page |
| --- | --- | --- | --- |
| `NOMINATION_OPEN` | Add, remove, Guardar until **6 Nov 2026 ART** (inclusive). After that date: read-only until admin closes. Editable after save while still writable. | Closed | N/A |
| `NOMINATION_CLOSED` | Read-only. Candidate universe frozen. | Closed | N/A |
| `RATING_OPEN` | Frozen. Mutations rejected server-side. | Score eligible films 0–10 | Live/provisional for qualified movies |
| `RATING_CLOSED` | Frozen | No new ratings. Personal scores view-only. | **Official / final** IMDB LTA ranking |

Admin phase UI: switcher on `/imdb-lta` (visible only when `session.user.role === 'admin'`). Calls `updateImdbLtaPhaseAction` (server re-checks admin). Prisma Studio remains a fallback.

Admins also get a collapsible **Nominaciones del grupo** panel on the same page: all nomination rows (including drafts without Guardar), per-user counts/submitted status, and movies sorted by nomination count with nominator names.

### Nomination closure (manual)

`NOMINATION_OPEN → NOMINATION_CLOSED` is explicit. Until closed **and** while on/before the nomination deadline (6 Nov 2026 ART):

- users may still edit lists (add/remove/save again)
- latest valid state remains editable

After the deadline, while phase is still `NOMINATION_OPEN`:

- add/remove/Guardar are rejected server-side (`assertNominationPhaseOpen`)
- UI shows a “Plazo vencido” banner; lists are read-only
- admin must still flip to `NOMINATION_CLOSED` to freeze candidates for rating

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

**SUBMITTED ≠ LOCKED.** `submittedAt` is “last Guardar with a valid 25–50 list.” Locking is `phase !== NOMINATION_OPEN` **or** the nomination deadline has passed (after 6 Nov 2026 ART).

Every mutation calls `assertNominationPhaseOpen()` (rejects closed phase **or** passed deadline). Add/remove persist immediately.

While nominations are writable, the sticky progress bar shows `Para los rezagados · cierra el 6 de noviembre` (zinc → amber from 17 Oct → red from 24 Oct, ART calendar dates).

---

## Phase 2 — Ratings (Telegram batches)

Votes stay on the site (authenticated users, existing eligibility rules). Telegram only announces batches and links to `/imdb-lta/lote`. **Rotation is manual:** any admin uses “Cerrar lote y abrir el siguiente” on `/imdb-lta`. No cron. While `RATING_OPEN`, non-admins landing on `/imdb-lta` are sent to `/imdb-lta/lote`. The official ranking is only available after `RATING_CLOSED`.

### 2.1 Batch lifecycle

```
locked → open batch (vote on /lote, averages hidden) → released (review/edit on /rate)
                ↑______________ re-queue if <5 ratings ______________|
```

| State | Meaning |
| --- | --- |
| **locked** | Never appeared in a batch. Cannot be rated. |
| **open** | In the single current `ImdbLtaBatch` with `status=OPEN`. Rate on `/imdb-lta/lote`. Averages/counts hidden until the batch closes. |
| **released** | Appeared in at least one closed batch (and not in the open one). Add/change scores on `/imdb-lta/rate`. Eligible for ranking once ≥5 ratings. |

Rules:

- Batch size **10** (`IMDB_LTA_BATCH_SIZE`).
- At most one OPEN batch (partial unique index).
- Admins decide when to close/open; there is no automatic timer.
- Re-queue: released movies with &lt;5 ratings, max **3** per new batch, max **3** appearances total. Skip re-queue if ≥70% of active raters marked “No la vi”.
- Never-batched pick order: nomination count DESC, then title.
- Solo-nomination lock still applies.
- `submitRating` is an **upsert**; rating a movie clears any “No la vi” skip.
- “No la vi” stays on **Tus puntajes → No vistas** (open batch included) until the user scores it.

### 2.2 Rating scale

Integers **0–10** only. Suggested meaning: 0 mala · 5 promedio · 7 buena · 8 muy buena · 9 excelente · 10 obra maestra.

### 2.3 Who can rate

1. Phase is `RATING_OPEN`
2. Movie is a nominated candidate
3. Movie is **not locked** (must be open or released)
4. Shared unlock: non-nominator, or nominator when `COUNT(nominations) >= 2`

Already-rated is allowed (edit). Phase ≠ `RATING_OPEN` rejects writes.

### 2.4 Routes

| Route | Role |
| --- | --- |
| `/imdb-lta/lote` | One-at-a-time deck for the open batch: 0–10, Saltar, No la vi |
| `/imdb-lta/rate` | **Revisar** — change scores, and **No vistas** for movies marked “No la vi” (including the open batch) |
| `/imdb-lta/ranking` | Qualified (≥5) released movies; live while `RATING_OPEN` |

### 2.5 Telegram + admin rotate

- `rotateBatch()` closes the open batch (if any) and opens the next. Called only from the admin action on `/imdb-lta`.
- `announcePendingBatches` posts results for closed unannounced batches, then the new batch album + “Votar el lote” URL button (`TELEGRAM_LTA_CHAT_ID` or fallback `TELEGRAM_CHAT_ID`). HTTPS required for the inline button; local `http://localhost` falls back to a plain-text link.
- If Telegram fails after a rotate, the open batch keeps `announcedAt = null`. Clicking the admin button again **retries the announce only** (does not open another batch).
- Social notifications (same LTA chat), fire-and-forget via `after()` so Telegram never blocks a vote:
  - **Quiero ver:** when a user pins an unseen movie, once per `(user, movie)`: `🍿 Juan quiere ver Stalker (1979), también la quieren ver Ana, Leo` (the “también…” clause is omitted when nobody else pinned it).
  - **Batch all-rated:** when a user has scored every movie in the open batch, once per `(user, batch)`: `🎉 Feliciten a Juan que vio y puntuó todas las películas del lote #5 (solo 3 de 12 lo hicieron)`. Skips (“No la vi”) do not count; N is users who rated the whole batch, M is distinct users with at least one rating.
  - Idempotency via `ImdbLtaNotification.key`. A failed send deletes the claim so a later action can retry.

### 2.6 Rating phase closure (manual)

`RATING_OPEN → RATING_CLOSED` is admin-only. Rejects new ratings; ranking becomes official/final. Batches stop rotating.

### 2.7 Admin trivia (Telegram still + clue ladder)

Route: `/imdb-lta/admin/trivia` (admin-only). Manual — no cron.

| Step | What happens |
| --- | --- |
| Draft | Admin rolls a random **never-batched** nominated movie (excludes movies already used in trivia). Preview poster, full frame, and crop 1. Can reroll movie/image or discard. |
| Start | Bot posts crop 1 to the LTA chat (`Trivia #N · ¿Qué película es?`) and stores `rootMessageId`. |
| Image track | Admin “Revelar más” posts the next crop as a **reply** to the root (5 steps: 20% → 35% → 55% → 80% → full). |
| Clue track | Parallel ladder from a TMDB snapshot taken at draft time: keywords → year → country → music → cinematography → editing → director. Empty steps are skipped. Each clue is a reply: `Pista N`. |
| Solve | Admin picks the site user who guessed it. Bot posts the full frame (if needed) and announces the winner + running score. “Revelar sin ganador” closes without a scoreboard point. |

Rules:

- At most one unfinished game (`DRAFT` or `ACTIVE`) via a partial unique index.
- Step advances use `updateMany` claims so two admins cannot double-send; Telegram failures roll the step back.
- Crops are rendered with `sharp` from TMDB `w1280` textless backdrops; nothing is stored on disk.
- Scoreboard = count of `SOLVED` games per `winnerUserId`.

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
2. `listRateableCandidates` (`needs_votes` / `enough_votes` / `mine_done` / `not_seen`)
3. `/imdb-lta/rate` UI (filters + 0–10 + fewest-ratings-first)
4. Phase-aware hub on `/imdb-lta`
5. Ranking query (avg, ≥5, tie-breakers) + `/imdb-lta/ranking` with live vs final copy
6. Optional Movie denormalized LTA fields — skipped (not needed)
7. Verify: shared unlock; solo lock; filters; Destacadas; under-5 stay rateable; ranking threshold and tie-breakers

---

## Out of scope (v1 Phase 2–3)

- Changing Phase 1 nomination UX
- Rating deletion
- Emails
- TMDB name search
- Full admin console beyond the hub phase switcher + batch rotate
- Statistical ranking formulas beyond simple average + tie-breakers
- Linking Telegram user IDs to site accounts (not needed: one shared batch URL; social pings use the site display name)

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
- [x] Filters (`needs_votes`, `enough_votes`, `mine_done`, `not_seen`)
- [x] `/imdb-lta/rate` UI; coverage-first sort
- [x] Phase-aware hub; nominations read-only during rating
- [x] Ranking: AVG + ≥5 + tie-breakers; live vs final copy on `/imdb-lta/ranking`
- [x] Verify shared unlock, solo lock, filters, discovery, under-5 candidates, ranking

---

## Remaining unresolved product decisions

None that block Phase 2/3. Scale (0–10), shared unlock, manual phase transitions, qualification (5), average + tie-breakers, and discovery-as-UX-only are finalized.
