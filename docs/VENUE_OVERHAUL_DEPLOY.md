# Venue App Overhaul – Deploy to Live

Use this when pushing the promoter portal, invite emails, and Venue/ShowCheck changes to production.

---

## 1. Git – Push code

Commit and push so Vercel (and any CI) can deploy:

```bash
git add -A
git status   # review
git commit -m "Venue overhaul: promoter portal, show invitations, invite email from invite@soundpath.app"
git push origin main
```

(Use your usual branch name if production deploys from something other than `main`.)

---

## 2. Vercel – Frontend deploys

With **three Vercel projects** (see `docs/SETUP_DOMAINS_AND_VERCEL.md`):

| Project | Root | What gets updated |
|--------|------|--------------------|
| **soundpath-landing** (soundpath.app) | `.` | Vite build – any `src/` changes if you use venue routes here |
| **soundpath-label** (label.soundpath.app) | `.` | Vite build – **venue dashboard, promoter portal routes, emailService** |
| **soundpath-venue** (venue.soundpath.app) | `ShowCheck` | Next.js build – **ShowCheck: invite promoter, invite email, promoter portal** |

After you push, Vercel will redeploy the projects that are connected to the repo. Confirm in the Vercel dashboard that the **label** and **venue** (ShowCheck) projects both ran a new build.

---

## 3. Supabase (production) – Database

Run these migrations **in order** on your **production** Supabase project (SQL Editor or CLI), if you haven’t already:

1. `database/migrations/show-invitations-and-promoter-portal.sql`
2. `database/migrations/show-invitations-fix-rls-recursion.sql`
3. `database/migrations/show-invitations-fix-gen-random.sql`

(If any were already applied, skip them or run only the new ones.)

---

## 4. Supabase (production) – Edge function

The **send-email** function now accepts an optional `from` (so invite emails use `invite@soundpath.app`). Deploy the updated function:

```bash
# From repo root, with Supabase CLI linked to production
supabase functions deploy send-email
```

If you use a specific project ref:

```bash
supabase functions deploy send-email --project-ref YOUR_PROJECT_REF
```

No new secrets are required; `invite@soundpath.app` is set in app code.

---

## 5. Quick checks after deploy

- **venue.soundpath.app (ShowCheck):** Create or open an event → Event Details → Invite promoter → enter email → invite created and **invitation email sent** (from invite@soundpath.app).
- **label.soundpath.app:** Venue dashboard → invite promoter flow and in-app notification bell still work.
- **Promoter:** Open the invite link from email → accept → show appears on `/portal/promoter` (or `/app/portal/promoter` on ShowCheck).

---

## Summary

| Step | Action |
|------|--------|
| 1 | Push to `main` (or your production branch) |
| 2 | Let Vercel redeploy label + venue (ShowCheck) |
| 3 | Run the three show-invitations migrations on production DB |
| 4 | Deploy `send-email` edge function to production |
| 5 | Smoke-test invite flow and promoter portal |
