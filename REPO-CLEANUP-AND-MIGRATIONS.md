# Repo Cleanup & Prisma Migrations Status

## 1. Git repository cleanup

You're on `master` with no pending changes. Goal: clean history, remove stale branches, reset `develop` from `master`.

### Option A: Aggressive cleanup (recommended if you want a clean slate)

**⚠️ This rewrites history.** Coordinate with anyone who has the repo cloned.

```powershell
# 1. Ensure you're on master and clean
cd c:\Workspaces\mmw-v2
git checkout master
git status   # should be clean

# 2. Create a single squashed commit from current master (fresh history)
git checkout --orphan temp-master
git add -A
git commit -m "chore: squash history - fresh start from master"

# 3. Replace master with the squashed branch
git branch -D master
git branch -m master

# 4. Force-push to remote (overwrites remote master)
git push mmw-v2 master --force

# 5. Delete all local branches except master
git branch | Where-Object { $_ -notmatch "^\* master$" } | ForEach-Object { git branch -D $_.Trim() }

# 6. Delete remote branches you no longer need (adapt list as needed)
git push mmw-v2 --delete develop
git push mmw-v2 --delete chore/improve-server-actions
git push mmw-v2 --delete feat/calendar
# ... etc. for each remote branch to remove

# 7. Prune remote-tracking branches
git fetch mmw-v2 --prune

# 8. Recreate develop from master
git checkout -b develop
git push -u mmw-v2 develop

# 9. Garbage collect
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Option B: Simpler cleanup (keep history, just trim branches)

Use this if you want to avoid force-pushing and rewriting history.

```powershell
cd c:\Workspaces\mmw-v2
git checkout master

# Delete local branches (except master). Run for each branch:
git branch -D develop
git branch -D chore/improve-server-actions
git branch -D feat/calendar
# ... etc.

# Delete develop on remote, then recreate from master
git push mmw-v2 --delete develop
git checkout -b develop
git push -u mmw-v2 develop

# Prune stale remote-tracking refs
git fetch mmw-v2 --prune

# Optional: garbage collect
git gc --prune=now
```

### Optional: delete all local branches except master (PowerShell)

```powershell
git branch | ForEach-Object { $b = $_.Trim() -replace '^\* ',''; if ($b -ne 'master') { git branch -D $b } }
```

---

## 2. Prisma migrations status

### What we checked

- `pnpm exec prisma migrate status` → **15 migrations found, database schema is up to date** (relative to the migration history).
- `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma` → **Schema drift**: one difference.

### Schema drift found

The **database is missing** this unique index:

- **Table:** `YearTopParticipant`
- **Index:** `YearTopParticipant_userId_year_key` on `(userId, year)`
- **Schema:** `@@unique([userId, year])` on `YearTopParticipant` in `schema.prisma`

So `prisma migrate status` is “up to date” because all **recorded** migrations are applied, but the **live DB** does not fully match `schema.prisma` (missing index).

### Likely cause

YearTop-related tables were probably created or altered **manually** (or via custom SQL), so there is no migration that adds this unique constraint. The schema was updated, but the DB was not.

### How to fix the drift

**Option 1: Apply the missing index via SQL (quick fix)**

Run this against your DB (e.g. Supabase SQL editor):

```sql
CREATE UNIQUE INDEX IF NOT EXISTS "YearTopParticipant_userId_year_key"
  ON "YearTopParticipant"("userId", "year");
```

Then verify:

```powershell
pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
```

This should produce no changes.

**Option 2: Create a Prisma migration for the index**

```powershell
pnpm exec prisma migrate dev --name add_year_top_participant_user_year_unique
```

When prompted, Prisma will generate a migration. **Careful:** if the DB already has the index (e.g. you ran the SQL above), either:

- Skip creating a new migration and keep the manual fix, or  
- Add the `CREATE UNIQUE INDEX ...` (or equivalent) to the new migration and then run `prisma migrate deploy` so the migration is recorded.

### Summary

| Item | Status |
|------|--------|
| `prisma migrate status` | ✅ Up to date (all 15 migrations applied) |
| DB vs `schema.prisma` | ⚠️ Missing `YearTopParticipant_userId_year_key` |
| Board / manual migrations | ✅ Board migrations use `DO $$ ... IF EXISTS` and are idempotent |

Apply the missing unique index (Option 1 or 2), then re-run the diff to confirm everything matches.
