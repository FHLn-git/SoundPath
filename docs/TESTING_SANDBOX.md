# Testing Sandbox

Four fixed test accounts and demo data for QA and demos.

## 1. Test Accounts (Supabase Auth)

| Email | Tier | Password |
|-------|------|----------|
| free@soundpath.app | free | Test2026! |
| starter@soundpath.app | starter | Test2026! |
| pro@soundpath.app | pro | Test2026! |
| agent@soundpath.app | agent | Test2026! |

## 2. What Gets Created

- **Personal Office (each account):** 10 tracks with realistic metadata (artists like Luna Grey, The Midnight Loop, Jace Parker), random statuses (Pitched, Denied, Signed, Inbox). Each track has `metadata: { "is_test_data": true }` so they are excluded from app statistics and global trend reports.

- **Label Workspaces (pro & agent only):**
  - **Neon Records** – pro is Owner; 15 label tracks.
  - **Basement Tapes** – agent is Owner; 15 label tracks.

## 3. Setup

1. **Run migration** (Supabase SQL Editor):
   - `database/migrations/testing-sandbox-schema.sql`

2. **Fix signup + personal workspace** (required for Auth Admin–created users and personal tracks):  
   Run **`database/migrations/nullable-organization-id-and-personal-workspace.sql`** once in Supabase SQL Editor.  
   Without it, sandbox seed can show "Database error creating new user" or "null value in column organization_id of relation organization_usage".

3. **Env** (`.env`; do not commit `SUPABASE_SERVICE_ROLE_KEY`):
   - `VITE_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

4. **Seed:**
   ```bash
   npm run sandbox:seed
   ```

**If you still get errors:** Ensure **`nullable-organization-id-and-personal-workspace.sql`** has been run once in Supabase SQL Editor. Check Postgres logs (Dashboard → Logs) for the exact error if needed.

## 5. Purge Test Data

- **API (hidden):**  
  `POST /api/admin/purge-test-data`  
  Optional header: `X-Purge-Secret: <PURGE_SECRET>` (required if `PURGE_SECRET` is set in env).

- **CLI:**
  ```bash
  node scripts/sandbox-purge.js
  ```

Removes: all tracks with `metadata->>'is_test_data' = 'true'`, sandbox orgs (Neon Records, Basement Tapes), sandbox staff rows, and the four auth users.

## 6. Verification: Personal Office vs Label Workspace

- **Personal Office** (`/personal/dashboard`): Uses `activeOrgId === null`. Tracks: `organization_id IS NULL` and `recipient_user_id = current user's staff id`. All four accounts see their 10 personal tracks here.

- **Label Workspace** (`/labels/<orgId>`): Uses `activeOrgId = orgId`. Tracks: `organization_id = orgId`. Only **pro** and **agent** have label memberships:
  - **pro** → Neon Records → `/labels/<neon-org-id>` shows 15 tracks.
  - **agent** → Basement Tapes → `/labels/<basement-org-id>` shows 15 tracks.

**Checks:**

1. Log in as **free@soundpath.app** → Personal dashboard shows 10 tracks; no “Manage” / label switcher for another org (or only personal).
2. Log in as **pro@soundpath.app** → Personal dashboard shows 10 tracks; switch to “Neon Records” (Manage tab or sidebar) → Label dashboard shows 15 tracks; URL is `/labels/<id>`.
3. Log in as **agent@soundpath.app** → Same for Personal (10) and “Basement Tapes” (15) at `/labels/<id>`.
4. **Sidebar / Bottom nav:** “Dashboard” goes to `/personal/dashboard` when in personal context and to `/labels/<id>` when in label context; switching org updates URL and data.

## 7. Test Data and Statistics

Tracks with `metadata: { "is_test_data": true }` are excluded from:

- **Global trend reports:** `get_genre_trends()` filters them out in the DB.

Do not count test data in app-level statistics or global trend reports; use the same filter where needed: `COALESCE((metadata->>'is_test_data')::boolean, false) = false`.
