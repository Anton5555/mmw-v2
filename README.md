This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Database Setup and Migrations

To work with the database, follow these steps in order:

1. Generate Prisma Client (required after schema changes):

```bash
pnpm db:generate
```

2. Create a new migration **without applying it** (safe for a single shared DB, e.g. production):

```bash
pnpm db:migrate:create your_migration_name
```

This will create a new folder under `prisma/migrations/<timestamp>_your_migration_name/` with the SQL changes, but it will **not** touch your database. Review the generated SQL if needed.

3. Apply pending migrations to your database:

```bash
pnpm db:migrate:deploy
```

This runs all unapplied migrations (including the one created in step 2) against the database pointed to by your `DIRECT_URL`. Use this in your single-prod-DB setup instead of `db push`.

4. (Optional) To view and edit your data through Prisma Studio:

```bash
pnpm db:studio
```

> **Note:** For development-only changes against a **separate** throwaway database (not production), you can use:

```bash
pnpm db:push
```

### Environment Variables

Make sure you have the following environment variables set in your `.env` file:

```
DATABASE_URL="your_database_url"
DIRECT_URL="your_direct_url"
TMDB_API_KEY="your_tmdb_api_key"  # Required for MAM data import
```

## MAM Data Import

The MAM (Movies to Watch Before You Die) data is imported using SQL files generated from JSON and CSV sources. The import process is split into multiple steps for better control and troubleshooting.

### Generating SQL Files

**1. Generate main MAM data (movies, participants, picks):**

```bash
pnpm mam:generate-sql
```

This script:
- Reads `data/db_2.json` and `data/mam_rev.json`
- Fetches TMDB data for movies (cached in `data/mam-movies-cache.json`)
- Generates SQL files:
  - `sql/mam-movies.sql` - Movie records
  - `sql/mam-participants.sql` - Participant records
  - `sql/mam-picks.sql` - Pick records (top picks and regular picks)

**2. Generate reviews SQL:**

```bash
pnpm mam:generate-reviews-sql
```

This script:
- Reads `data/mam_rev.json` and maps reviews to existing picks
- Generates `sql/mam-reviews.sql` - Updates existing picks with review text

**3. Generate special mentions SQL:**

```bash
pnpm mam:generate-special-mentions-sql --csv="data/MAMciones Especiales.csv"
```

This script:
- Reads the special mentions CSV file
- Fetches TMDB data for missing movies (if needed)
- Generates `sql/mam-special-mentions.sql` - Creates missing movies and special mention picks

### Importing SQL Files

**Import in this order:**

1. **Import main MAM data:**
   ```bash
   psql $DATABASE_URL -f sql/mam-movies.sql
   psql $DATABASE_URL -f sql/mam-participants.sql
   psql $DATABASE_URL -f sql/mam-picks.sql
   ```

2. **Import reviews (optional):**
   ```bash
   pnpm mam:import-reviews-sql
   # or directly:
   psql $DATABASE_URL -f sql/mam-reviews.sql
   ```

3. **Import special mentions:**
   ```bash
   pnpm mam:import-special-mentions-sql
   # or directly:
   psql $DATABASE_URL -f sql/mam-special-mentions.sql
   ```

4. **Refresh MAM scores (required after importing picks):**
   ```bash
   pnpm mam:refresh-scores
   ```

   This recalculates cached fields on movies (`mamTotalPicks`, `mamTotalPoints`, `mamAverageScore`, `mamRank`).

### Troubleshooting

**If imports fail or show 0 rows inserted:**

1. **Check for missing movies:**
   ```bash
   pnpm mam:check-special-mentions
   ```
   This diagnostic script shows which movies, participants, or picks are missing.

2. **Regenerate SQL files:**
   - If movies are missing, regenerate the special mentions SQL (it will fetch missing movies):
     ```bash
     pnpm mam:generate-special-mentions-sql --csv="data/MAMciones Especiales.csv"
     ```
   - If data sources changed, regenerate all SQL files:
     ```bash
     pnpm mam:generate-sql
     pnpm mam:generate-reviews-sql
     pnpm mam:generate-special-mentions-sql --csv="data/MAMciones Especiales.csv"
     ```

3. **Verify data exists:**
   - Check that `data/db_2.json`, `data/mam_rev.json`, and `data/MAMciones Especiales.csv` exist
   - Check that `TMDB_API_KEY` is set in your `.env` file
   - Check that participants exist in the database (they should be created by `mam-participants.sql`)

4. **Common issues:**
   - **0 rows inserted for special mentions**: Movies might be missing. The special mentions generator now creates missing movies automatically, but you may need to regenerate the SQL file.
   - **Movies not showing on MAM page**: Run `pnpm mam:refresh-scores` to update cached scores.
   - **Special mentions not showing**: Verify they were imported and that the query doesn't filter by `mamTotalPicks > 0` (special mentions have score 0).

### Notes

- SQL files use `ON CONFLICT` clauses, so re-running imports is safe (idempotent).
- TMDB data is cached in `data/mam-movies-cache.json` to avoid repeated API calls.
- The cache is shared between `mam:generate-sql` and `mam:generate-special-mentions-sql`.
- Special mentions can coexist with regular picks for the same movie+participant combination.

"# mmw-v2"
