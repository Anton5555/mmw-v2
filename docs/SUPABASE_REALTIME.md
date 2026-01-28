# Supabase Realtime setup (Board + Oscar results)

After a DB reset or new project, enable Realtime for the tables used by the app so live updates work.

## 1. Database Publications (Realtime)

In **Supabase Dashboard → Database → Publications** (or **Replication**):

- Ensure these tables are **enabled** (green toggle) for the Realtime publication (e.g. `supabase_realtime`):
  - **BoardPost** (board post-its)
  - **OscarCategory** (Oscar live results – winner updates)
  - **OscarBallot** (Oscar live results – score updates)

If they are missing, add them via the UI or run:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE "BoardPost";
ALTER PUBLICATION supabase_realtime ADD TABLE "OscarCategory";
ALTER PUBLICATION supabase_realtime ADD TABLE "OscarBallot";
```

## 2. Table access (RLS + GRANT)

So the anon role can receive Realtime events and (if needed) read via the Data API:

**Schema usage:**

```sql
GRANT USAGE ON SCHEMA public TO anon, authenticated;
```

**Board:**

```sql
GRANT SELECT ON TABLE public."BoardPost" TO anon, authenticated;
```

**Oscar (live results):**

```sql
GRANT SELECT ON TABLE public."OscarCategory" TO anon, authenticated;
GRANT SELECT ON TABLE public."OscarBallot" TO anon, authenticated;
```

**Reload PostgREST:**

```sql
NOTIFY pgrst;
```

## 3. RLS policies

- **BoardPost:** one policy allowing `SELECT` for role `anon` (e.g. “Allow anon read BoardPost for realtime”).
- **OscarCategory / OscarBallot:** add similar policies if the dashboard shows “API DISABLED” or access errors:
  - Name: e.g. “Allow anon read OscarCategory for realtime”
  - Command: `SELECT`
  - Roles: `anon`
  - USING: `true`

Repeat for `OscarBallot`.

## 4. Verify

- **Board:** Open `/board` in one tab, create a post in another; the first tab should update without refresh.
- **Oscar:** Open `/oscars/results` (after ceremony start), save a winner from `/oscars/admin`; the results page should update.

Use a normal browser (e.g. Chrome); the embedded Cursor browser can miss WebSocket updates.
