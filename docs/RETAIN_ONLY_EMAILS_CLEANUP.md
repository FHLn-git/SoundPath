# Retain Only Specific Emails – Data Cleanup

Use this when you want to **keep** data for up to three specific user emails (e.g. you + two friends) and **delete** everything else (test accounts, other users, and their orgs).

## What it keeps (everything associated with those emails)

- **All demos** – In this app demos are stored as **tracks**. Every track (demo) in organizations that belong to your keeper users is kept: title, artist, sc_link, status/column, energy, votes, listen history, release dates, etc.
- **All related data** – Artists, votes, listen_logs, memberships, invites, subscriptions, payment methods, api_keys, webhooks, audit_logs, calendar/oauth/notification settings, and any other org- or user-scoped data for keeper orgs and keeper staff.
- **Keeper users only** – The auth users and staff_members rows for the three emails you specify (and no one else).

## What it does

- Keeps all of the above for **up to three emails** you specify.
- Deletes:
  - All data in organizations that don't have any of those users.
  - All data belonging to other staff/users (e.g. test accounts) even if they were in the same org.
  - Non-keeper organizations and non-keeper staff members.
  - All other auth accounts (only the three keeper emails remain in Authentication).

## Before you run it

1. **Back up the database**  
   Supabase Dashboard → Database → Backups (or create a manual backup).

2. **Choose your three keeper emails**  
   The emails you want to keep (e.g. `you@example.com`, `friend1@example.com`, `friend2@example.com`).  
   Those users must have **completed signup** (they must have rows in `staff_members`).

3. **Edit the migration**  
   Open `database/migrations/retain-only-emails-cleanup.sql` and replace the three placeholders:

   ```sql
   keeper_emails TEXT[] := ARRAY[
     'your@example.com',       -- replace with first email
     'friend1@example.com',     -- replace with second email
     'friend2@example.com'     -- replace with third email
   ];
   ```

4. **Run in Supabase**  
   Supabase Dashboard → SQL Editor → paste the full script → Run (as the default/postgres role).

## After the script runs

- **Auth accounts:** The script tries to delete all auth users except the three keeper emails (from `auth.users` and `auth.identities`). If you see a notice like *"Could not delete from auth.users (…)"*, your Supabase project may not allow that from the SQL Editor. In that case, delete the other accounts manually:
  - **Supabase Dashboard:** Authentication → Users → find each other user → Delete.
  - **Or** Admin API: `supabase.auth.admin.deleteUser(auth_user_id)` for each.

- The script prints a notice like:  
  `Cleanup done. Kept data for 3 auth users and N organizations.`

## If something goes wrong

- Restore from the backup you made before running the script.
- Fix the keeper emails or data, then run the script again if needed.

## File

- **Script:** `database/migrations/retain-only-emails-cleanup.sql`
