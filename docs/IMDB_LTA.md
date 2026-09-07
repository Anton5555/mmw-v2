# IMDB LTA — process and rules (team review)

Community ranking of IMDb films, next to MAM. Three steps: **nominate → score → rank by average**.

Use this doc to confirm the rules before Phase 2 is built. Nomination count is **never** ranking points.

| Piece | Status | Route |
| --- | --- | --- |
| Nominations | Shipped | `/imdb-lta` |
| Ratings | Planned | `/imdb-lta/rate` |
| Ranking | Planned | `/imdb-lta/ranking` |

UI copy is Spanish. Phase lives in a singleton DB row (`ImdbLtaConfig` id=1), not env flags. The UI hides controls when a phase is closed; the real lock is inside each server action.

---

## Lifecycle

```
NOMINATION_OPEN  →  NOMINATION_CLOSED  →  RATING_OPEN  →  RATING_CLOSED
   (live now)          lists freeze         Phase 2          Phase 3 ranking
```

| Phase | Nominations | Ratings | Ranking page |
| --- | --- | --- | --- |
| `NOMINATION_OPEN` (now) | Add, remove, Guardar. Editable after save. | Closed | Not built |
| `NOMINATION_CLOSED` | Read-only list | Closed | Not built |
| `RATING_OPEN` | Frozen | Score eligible films 0–10 | Can show live averages |
| `RATING_CLOSED` | Frozen | Read-only personal scores | Durable official list |

Admin close UI is **not built**. Flip phase in Prisma Studio or via `updateImdbLtaPhase` (admin session). A small admin switcher can be a follow-up.

---

## Three concepts, kept separate

| Concept | What it is | Status |
| --- | --- | --- |
| **Movie** | Catalog row. Unique on IMDb ID. No LTA score columns in Phase 1. | Exists |
| **Nomination** | User ↔ movie eligibility. Count of nominators is not a ranking input. Unique per (user, movie). | Exists |
| **Rating** | Independent user ↔ movie score 0–10. | Schema stub ready; API/UI are Phase 2 |

Do not mix with:

- **MAM** — nomination count must never become ranking points
- **Oscars** — submit is not one-shot; saved ≠ locked until the phase closes
- **Create list** — reuse visual language and TMDB persist, not the bulk-textarea flow
- **TMDB search by name** — exists in the client, unused, and forbidden for LTA lookup

---

## Phase 1 — Nominations (shipped)

Authenticated users (same as MAM) build a personal list of 25–50 films.

### Lookup on Enter

| Input | First look | If miss | If several hits |
| --- | --- | --- | --- |
| IMDb ID (`tt` + 7–8 digits) | Internal movie by `imdbId` | TMDB find + persist, then add | N/A (unique ID) |
| Title text | Internal title / originalTitle contains | Ask for IMDb ID. **No TMDB name search.** | In-app picker of internal hits only. Never auto-pick. |

Successful TMDB lookups persist the Movie even before add, so the next person hits the internal DB. Duplicate add → toast. 51st add rejected.

### Page behavior

- Progress: `{n} / 25–50 películas` (incomplete under 25, valid 25–49, max 50)
- Review grid always visible from 0. Poster cards + Remove while open
- **Guardar lista** enabled at ≥25. Does **not** freeze the list
- After save: banner that the list is saved and still editable until nominations close
- When closed: same grid, no input / remove / save

**SUBMITTED ≠ LOCKED.** `submittedAt` is “last time this list was valid (25–50) and the user clicked Guardar.” If they later drop below 25, `submittedAt` is cleared until they Guardar again. Locking is only `phase !== NOMINATION_OPEN`.

Add/remove write immediately (no local-only drafts). Every mutation starts with `assertNominationPhaseOpen()`. Submit re-counts DB rows and never trusts the client array. Two users nominating the same film = two nomination rows, one Movie.

---

## Phase 2 — Ratings (planned)

`/imdb-lta/rate` when phase is `RATING_OPEN`. No schema change — `ImdbLtaRating` was stubbed in Phase 1. Nomination lists stay read-only.

### Who can rate a movie?

All four must be true. Enforced in `submitRating` / `canUserRateMovie`, not only in the UI.

1. Phase is `RATING_OPEN`
2. Movie is a candidate (at least one nomination exists)
3. This user has not already rated it
4. **Either** they did **not** nominate it, **or** they did **and** at least one other user nominated it too

A user **cannot** rate a movie that only they nominated.

**This replaces the Phase 1 sketch** (“never rate your own nominations”). If everyone nominates The Godfather, the old rule would leave it unrateable. With this rule, all nominators can score it.

| Situation | Can they rate? |
| --- | --- |
| Did not nominate it, someone else did | Yes |
| Nominated it, and so did someone else | Yes (shared unlock) |
| Only they nominated it | No (solo lock) |
| Already submitted a score | No (one rating per user/movie) |
| Phase is not `RATING_OPEN` | No |

Integer scores **0–10** only; no decimals. Ratings are **immutable in v1** (review later, no edit).

Default sort for the main grid: fewest ratings first, then title — so votes spread instead of piling onto the same ten films.

### Filters

| Key | Meaning |
| --- | --- |
| `unrated` | Sin tu puntaje — eligible and not yet scored by you |
| `no_scores` | 0 ratings globally, still eligible for you |
| `low` | 0–2 ratings |
| `close` | 3–4 ratings (one or two away from ranking) |
| `ranked` | 5+ ratings (already qualifies) |
| `mine_done` | You already rated — view only, no edit in v1 |

### Discovery strip

**Destacadas sin tu puntaje** — about 8–12 films you can still rate, that already have at least one score, ordered by current average then rating count. Same 0–10 control as the grid. Promotional, not a replacement for filters.

---

## Phase 3 — Ranking (planned)

`/imdb-lta/ranking`: poster, title, average, rating count, rank. Sidebar stays “IMDB LTA” as a hub, with Nominaciones | Puntuar | Ranking shown by phase. After `RATING_CLOSED`, this page is the durable view.

### Official ranking formula

| Input | Effect on ranking |
| --- | --- |
| Average of integer 0–10 scores | This is the sort key |
| Rating count ≥ 5 | Qualification only. Extra ratings do not add points |
| Nomination count | No effect. One nominator or thirty: still one candidate |
| Your own nomination | Does not boost the film |

Candidates after nominations close = distinct `movieId` from nominations. One catalog row whether 1 or 30 people nominated it.

Optional later (performance, not product): denormalize `ltaRatingCount` / `ltaAverageScore` / `ltaRank` on Movie, same idea as MAM caches. Phase 2 can start with live SQL aggregates.

---

## Rules to confirm or change

Mark each row **Keep / Discuss / Change**. Phase 1 is already shipped — changing those is a product patch. Phase 2–3 rules are cheaper to change now than after `/imdb-lta/rate` ships.

| # | Rule | Planned | Why | Cost to change | Keep / Discuss / Change |
| --- | --- | --- | --- | --- | --- |
| 1 | Nomination size | 25–50 movies per person | Enough to be a real list, capped so nobody dumps the catalog | Constants + validation + copy. Cheap if we decide before Phase 2 | |
| 2 | Save is not a lock | Guardar stamps `submittedAt`. Lists stay editable until the phase closes | Opposite of Oscars. People can fix mistakes until nominations close | If we lock on save, freeze add/remove after first Guardar | |
| 3 | Add/remove writes immediately | No local-only drafts. Refresh keeps the list | Survives a closed tab | Drafts would need client state + a later persist step | |
| 4 | Movie lookup | Internal DB first. TMDB only by IMDb ID. No TMDB name search | Avoids picking the wrong Godfather. Unknown titles need an IMDb ID | TMDB-by-name exists but is forbidden here on purpose | |
| 5 | Shared-nomination unlock | You may rate a film you nominated if at least one other person nominated it too | Old sketch would leave The Godfather unrateable if everyone nominated it | This is the Phase 2 eligibility rule | |
| 6 | Solo nominator lock | If only you nominated a movie, you cannot rate it | Stops a one-person film from being scored only by its nominator | Dropping this lets every nominator rate everything they put on their list | |
| 7 | Score scale | Integer 0–10. One rating per user/movie. No decimals | Simple, matches the stubbed column | Decimals or 1–5 need schema + Zod + UI | |
| 8 | Ratings immutable in v1 | Submit once. Review later, no edit | Keeps ranking stable while people are still scoring | Edit-after-submit is an explicit non-goal of the first Phase 2 cut | |
| 9 | Ranking threshold | Official ranking only with 5+ ratings | Average of 1–2 scores is noise. 5 is the bar, not extra points | One constant. Changing it after people have rated is a product call | |
| 10 | Score is average only | Rank = `AVG(score)`. Nomination count and rating count do not add points | Nominations are eligibility, not votes | Mixing nomination count into the score would blur LTA with MAM | |
| 11 | Discovery strip | Destacadas sin tu puntaje (~8–12 eligible unrated titles with some scores) | Nudges people toward well-liked films they have not scored | Can ship filters without this strip | |
| 12 | Admin phase UI | No admin page yet. Studio / existing action | Architecture is the singleton config row | A small switcher is a follow-up, not a blocker | |

**Biggest product call:** #5 and #6 (shared unlock + solo lock). Confirm those before building the rate page.

---

## Out of scope for the first Phase 2–3 delivery

- Changing Phase 1 nomination UX (unless a rule above is marked Change)
- Edit ratings after submit
- Emails / notifications
- TMDB name search
- Full admin phase console
- Automated tests (the repo has none; verification is browser + Studio)

---

## Delivery checklist

**Phase 1 — done**

- [x] Schema, migration, seed config row
- [x] Internal-first lookup; TMDB only by IMDb ID
- [x] Add / remove / Guardar with phase gate, unique, 25–50
- [x] `/imdb-lta` page
- [x] Sidebar + breadcrumb
- [x] Closed-phase rejection

**Phases 2–3 — not started**

- [ ] `canUserRateMovie` + `submitRating` 0–10 + phase gate
- [ ] Filters + Destacadas sin tu puntaje query
- [ ] `/imdb-lta/rate` UI
- [ ] Phase-aware hub links; nominations stay read-only
- [ ] AVG + 5+ threshold + `/imdb-lta/ranking`
- [ ] Verify Godfather shared rate, solo lock, filters, discovery, threshold
