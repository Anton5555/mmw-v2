# Documentation index

Start at [CLAUDE.md](../CLAUDE.md). These files describe the working tree. A chat can be newer than this checkout; when that happens, [HISTORY.md](HISTORY.md) says so.

Labels used throughout:

| Label | Meaning |
| --- | --- |
| **Verified** | Matches this working tree (code, schema, or config). |
| **Historical** | True when it was decided or written. Not current behavior. |
| **Unverified** | From a chat or an older doc, and not confirmed in this tree. |

## Current reference

| Doc | What it is for |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Stack, request path, data access, feature map, where code lives. |
| [BUSINESS_LOGIC.md](BUSINESS_LOGIC.md) | Scoring, phases, eligibility, and other product rules. |
| [DECISIONS.md](DECISIONS.md) | Choices and rejected approaches, with the reason. |
| [CONVENTIONS.md](CONVENTIONS.md) | Migrations, auth, tests, env, local database practice. |

## Older write-ups

Keep these. Do not treat them as the only source of truth.

| Doc | Status |
| --- | --- |
| [IMDB_LTA.md](IMDB_LTA.md) | Original nominate → score → rank plan. The banner at the top lists rules that later changed. |
| [SUPABASE_REALTIME.md](SUPABASE_REALTIME.md) | How to enable Realtime for `BoardPost`, `OscarCategory`, and `OscarBallot` after a database reset. |
| [superpowers/specs/2026-11-09-imdb-lta-admin-votes-design.md](superpowers/specs/2026-11-09-imdb-lta-admin-votes-design.md) | Design for the read-only admin votes page. The page exists; filters and lote tabs were added afterwards. |

## History

| Doc | What it is for |
| --- | --- |
| [HISTORY.md](HISTORY.md) | Superseded rules, data incidents, and ideas that were discussed and not built in this tree. |

`README.md` is still the Next.js starter plus a MAM import runbook and the test/CI section. Import commands there match `package.json`. The sentence that a special mention can coexist with a regular pick for the same participant and movie does not match the schema: `MamPick` is unique on `(participantId, movieId)`.
