# Decisions

Each item is a choice that should not be relitigated by accident. **Verified** means this tree still implements it. Sources are chat titles plus ids; they are pointers, not transcripts.

## Product

### IMDB LTA votes stay on the site

**Verified.** Telegram announces batches and a few social events. Scores are submitted in the app. A pure in-Telegram poll was sketched and dropped.

Source: [IMDB LTA voting alternatives](d41a319b-0236-462b-a754-53f17b591b12).

### Batches are opened by an admin, not a clock

**Verified.** Early design used a cron every couple of days. The user stopped that: new batches start from the UI. `vercel.json` has no IMDB LTA cron.

Source: same chat.

### Hide group scores until the rating phase closes

**Verified.** Ranking route and tab exist only in `RATING_CLOSED`. Revisar strips aggregates while rating is open. This reverses the original plan in `docs/IMDB_LTA.md`, which described a live ranking during `RATING_OPEN`.

The admin page is the exception, on purpose: organizers need to see who scored what without publishing a promedio to the club.

Sources: [Sin promedio display logic](d48c58b4-3c72-476c-ad09-4c3165ca4899), [Admin only votes page](f55ab44e-2f45-48ca-99f1-8b2dc4ba3147).

### Anyone may rate any released candidate

**Verified.** `canUserRateMovie` no longer blocks the sole nominator. Tests that still say "solo pick" expect `allowed: true`.

Source: [Voting rule code check](f8adcc89-7b0c-42b7-a7d2-17c4ac785419).

### Revisar is four exclusive piles

**Verified.** Por votar, Ya puntuadas, No vistas, Quiero ver. A skip is not "still needs a vote", and a pin is not a plain skip. Open-batch skips must show up; hiding them was a bug.

Quiero ver is a pin on a skip (`pinnedAt`), not a second wishlist table. Scoring removes the skip and the pin.

Sources: [IMDB revisar page navigation](22b92e35-ae8d-45d4-891b-95137a479e45), [No vista item visibility](db2c48cb-9e8d-47ad-aa8d-f0bf351da7a1), [Favourite mark for movies](32e56825-4fb6-4ccb-9d6a-6f68f7b76052).

### Estadísticas shows only personal stats

**Verified (20 Nov 2026).** Personal stats live on their own tab, Estadísticas (`/imdb-lta/stats`). They were first placed on top of Revisar, renamed Inicio, but that pushed the score lists down. Revisar keeps its name and its job (reviewing scores), and "Inicio" is already the site home in breadcrumbs. Scope is movies from open and closed lotes. It shows your own scores in aggregate and released-movie counts by década, género and país.

Rejected, because they bias voting during the season:
- Club participation figures, even anonymous ones.
- Per-member progress tables.
- "You vs the club" comparisons.
- Your own top-scored movies list.

`/imdb-lta` still lands on Lote during `RATING_OPEN`.

### Nomination writes die on a fixed date; the phase does not

**Verified.** 6 Nov 2026, end of that calendar day in Argentina. Label: Para los rezagados. An admin still has to move `NOMINATION_OPEN` → `NOMINATION_CLOSED` before rating, so the candidate set freezes as a deliberate step.

The 31 Oct 2026 cutoff is **historical**.

Sources: [IMDB LTA phase 1 enable](533e33d5-f8b8-476e-a3a4-74ae300ec5f6), [IMDB LTA stage 1 deadline](c728da63-6ad3-4fcb-ae50-885851c20e8c).

### Trivia is a manual admin game

**Verified.** No cron, and no bot that writes trivia posts from admin statistics. The admin search page is data for a human to use.

Sources: [Telegram movie trivia bot](8f695428-bcb6-4536-9802-d6a03a42f5d5), [IMDB LTA search improvement](2f017c71-650e-43c8-8727-48cad305c186).

### Oscar ballots are one-shot

**Verified.** Unique `(user, edition)` and no update path. Closing 3 hours before the ceremony (Los Angeles clock in the message) is so late votes cannot trail public information.

### Board stays in the tree but off

**Verified.** `BOARD_ENABLED = false` rather than deleting the feature. Sidebar, proxy, actions, and `/api/board` all honor the flag.

### Film stock look (Nov 2026)

**Verified in code on `feat/film-stock-redesign`.** The earlier "UI polish stays surgical" decision (keep the zinc and yellow film-club palette, decline a type system and header redesign) was reversed on 19 Nov 2026 because the stock shadcn zinc theme read as generic.

- Palette: teal ink `#0f2226`, surface `#17323a`, border `#2a4c55`, label cream `#f1e9d8`, box yellow `#f2b632` (primary), box red `#d8392b` (logo block, destructive). Dark only.
- Type: Barlow body, Barlow Condensed for `h1`–`h3` (`h1` uppercase).
- Shape: `--radius` is 0.25rem and `rounded-xl/2xl/3xl` are flattened to it.
- The hard-coded `zinc-*`, `yellow-*` and `amber-*` Tailwind classes are not rewritten per file. `globals.css` `@theme` remaps those palettes to the Film stock colours. Prefer the semantic tokens (`bg-card`, `text-muted-foreground`, `text-primary`) in new code.
- Navigation is the Tinta top bar (`top-nav.tsx`: dark bar, red MMW block, yellow underline on the active link, sheet menu below `lg`). The sidebar, `nav-main`, `spotlight-cursor`, `lamp-background`, film grain and the per-card fade-up stagger on poster grids were removed.
- Breadcrumbs are a quiet trail inside the page column, not a second bar under the top nav. Sections with their own tab row (IMDB LTA, a year-top list) skip the trail.
- Section views switch with `TabNav` (underlined, like the top bar), not pills. In IMDB LTA the member tabs come first and the admin tools sit apart on the right behind a shield icon.
- List cards put title, description and requester under the image, so no text depends on hover.
- `white` is remapped to the label cream. Participant initials use muted ink colours.
- Rejected on the way: a cream header bar, bright cobalt blue, light/paper themes, and a neutral graphite or midnight refinement of the old look.
- Not done: renaming the `glass-*` components (they are flat zinc cards now), and the gradient and `backdrop-blur` sweep outside the nav. Poster scrims are intentional.

## Engineering

### Better Auth plus a server VIP gate

**Verified.** Email sign-up and Google sign-up both go through `databaseHooks.user.create.before` → `assertVipAllowed`. The client cookie `vip_ok` is an HMAC of an expiry, keyed with `BETTER_AUTH_SECRET`, TTL 10 minutes. Scripts with no request context, and the path `/admin/create-user`, skip the check.

Google sign-in uses `disableImplicitSignUp: true` and `prompt: 'select_account'`. A Google account does not create a user unless the person is on the sign-up form (`requestSignUp`).

A client-only VIP check was rejected after it was obvious the sign-up API could be called directly.

Source: [Google sign-in VIP gate](8e6d3daf-c333-41ba-8706-ca9f20567ae4).

### Prisma, two URLs

**Verified.** `DATABASE_URL` is the runtime pool (Supabase transaction pooler in production). `DIRECT_URL` is what `prisma migrate` uses (session pooler in production; local Postgres in development). Migrations are create-only first so a shared database is not migrated by accident.

`pnpm db:push` is for a throwaway dev database only.

### Production migrations belong on the Vercel production build

**Decision recorded, not encoded in this tree.** GitHub Actions was rejected because it races the deploy. Previews must not migrate. The intended build prefix was: if `VERCEL_ENV` is `production`, `pnpm db:migrate:deploy`, then `pnpm build`. Current `vercel.json` only has the events cron. History was squashed, so the commit that added the build command is gone. Check the Vercel project settings.

Source: [Database migration CI](ab68d902-3926-4c77-8e9d-ddabbd00b5c8).

### Tests use embedded Postgres, not Docker

**Verified.** `pnpm test:integration` starts `embedded-postgres` 17, runs `migrate deploy`, and refuses `TEST_DATABASE_URL` unless the host is localhost and the database name contains `test`.

### Session reads that block prerender go through Suspense

**Verified.** Next 16 with Cache Components complained when authed layouts called `connection()` / `getSession` in a way that blocked prerender. The fix is `getCurrentSession` inside `<Suspense>`, not `instant = false` on every page.

Source: [Next.js prerendering error](e0ec2f02-930f-4faf-b57d-efdb2a6e3a84).

### One movie detail component

**Verified.** MAM, lists, year tops and IMDB LTA each have a route, and each route loads context into `MovieDetail`. The IMDB LTA route and sheet show the same club data as year tops (MAM picks, tops, lists, Dónde verla), never IMDB LTA scores. A second detail component per feature was the thing that got consolidated.

### Filter state lives in the URL

**Verified.** nuqs parsers in `src/lib/searchParams.ts`. Page changes are transitions so the grid does not freeze on every click.

### Phone app is the website (PWA + Android TWA), not a native app

**Verified.** Pages are server components and mutations are server actions, so a native app would need a new API and a second UI. The installed app loads the live site instead: a PWA on iOS and Android, plus an APK built as a Trusted Web Activity for members who want one. A Capacitor/WebView wrapper was skipped because Google blocks OAuth sign-in inside WebViews, and Google login is in use. Apple has no TWA and no free sideloading, so iPhone users get the PWA only.

### 90-day sliding sessions

**Verified.** Better Auth's default (7 days) signed out anyone who didn't open the app for a week, which feels wrong in an installed app. Sessions now last 90 days and are extended at most once a day. Trade-off: a stolen cookie lives longer. Revoking sessions (admin plugin) or changing the password still signs a device out.

### Dónde verla is stored, refreshed in batches by an external cron

**Verified.** Providers are read from the database, not from TMDB on each page view. cron-job.org calls the sync because Vercel cron frequency is limited on this plan, and each call only refreshes the stalest batch so it fits cron-job.org's 30 s timeout. A failed TMDB call leaves the movie's sync date alone, so the next run retries it. `MovieWatchProviders.providers` is JSON in a `TEXT` column because `zod-prisma-types` generates broken code for Prisma `Json` fields with Prisma 7.

## Rejected

| Idea | Why it lost |
| --- | --- |
| Rate inside Telegram | The site is the ballot. The bot nudges. |
| Scheduled IMDB LTA batches | Admins open the next lote when the club is ready. |
| Solo-nominator lock | Members rate the whole released set, including their own nominations. |
| Live public ranking during the season | Promedios were confusing and spoiler-y. Wait for `RATING_CLOSED`. |
| Cron trivia, or trivia copy generated from stats | A person writes the game. Stats stay on the admin page. |
| Prisma → Drizzle | **Unverified** as an explicit rejection in transcripts. The app is Prisma-only. Do not start a port without a new decision. |
| Supabase Auth | Login, sessions, and roles are Better Auth rows in `public`. |
| GitHub Action as the only production migrator | It can run beside a deploy and fight it. |
| Native app or Capacitor WebView wrapper | Needs a new API and second UI; WebViews break Google sign-in. The TWA/PWA load the real site. |
| Links to torrent sites (YTS) or Stremio piracy add-ons | Linking knowingly to infringing copies is a legal risk, and Google Play can pull the TWA for it. "Dónde verla" uses legal providers instead. |
| Database reset as a data-repair tool | It destroyed MAM reviews once. Re-import instead. |
