## SoundPath Universal Integrations & Automation (Detailed Setup)

This repo now includes production-ready building blocks for:

- **Website ingest widget** (domain allowlisting + Edge Function ingest)
- **Communication webhooks** (Slack/Discord/etc) with delivery queue + worker
- **Productivity suite** (Google/Microsoft OAuth + encrypted tokens + calendar job queue + worker)
- **Email-to-Inbox bridge** (inbound email webhook → link extraction → SoundCloud metadata → track creation)
- **Web Push** (service worker + subscription storage + push job queue + worker)

## Prereqs (10 minutes)

- **Supabase project**: You need a Supabase project with access to:
  - SQL Editor (to run migrations)
  - Edge Functions (to deploy + set secrets)
  - Auth (already used by the app)
- **Service role key**: Edge Functions rely on `SUPABASE_SERVICE_ROLE_KEY` (Supabase-managed secret).
- **Scheduling**: This repo includes a Vercel Cron endpoint (`/api/cron/workers`) so you don’t need a separate scheduler.

## Step 1 — Run database migrations (copy/paste into SQL Editor)

Run these in Supabase SQL Editor (order doesn’t matter if tables already exist):

- `database/migrations/widget-ingest-allowed-domains.sql`
- `database/migrations/webhook-track-triggers.sql`
- `database/migrations/communication-webhooks.sql`
- `database/migrations/notification-preferences.sql`
- `database/migrations/oauth-connections.sql`
- `database/migrations/calendar-jobs.sql`
- `database/migrations/push-subscriptions.sql`
- `database/migrations/push-notification-jobs.sql`
- `database/migrations/prevent-duplicate-submissions.sql`

### Post-migration sanity checks (recommended)

- Verify `organizations.allowed_domains` exists (used by website widget ingest)
- Verify these tables exist:
  - `communication_webhooks`, `communication_deliveries`
  - `organization_notification_preferences`
  - `oauth_connections`, `calendar_jobs`
  - `push_subscriptions`, `push_notification_jobs`
- Verify the DB triggers were created:
  - `trg_tracks_comm_new_submission` (new submissions → comm queue)
  - `trg_tracks_calendar_jobs` (track updates → calendar_jobs queue)
  - `trg_tracks_push_high_priority` (high_priority flips → push queue)
  - `trg_tracks_webhooks_*` (track create/update/delete → webhook queue)

## Step 2 — Deploy Supabase Edge Functions

- `widget-ingest`
- `webhook-delivery` (already present)
- `communication-delivery`
- `oauth-google`
- `oauth-microsoft`
- `calendar-sync`
- `inbound-email`
- `push-send`
- `push-worker`

### Deploy method A (Supabase dashboard)

- Go to **Supabase → Edge Functions**
- Deploy each function folder under `supabase/functions/*`

### Deploy method B (Supabase CLI)

If you’re using Supabase CLI, deploy each function by name.

## Step 3 — Configure required environment variables (Edge Functions)

Set these in **Supabase → Project Settings → Edge Functions → Secrets**.

### Worker protection (recommended)

Set:

- `WORKER_TOKEN` = any random string you choose

When you create schedules or external cron jobs, call the worker URLs like:

- `<SUPABASE_URL>/functions/v1/webhook-delivery?token=<WORKER_TOKEN>`
- `<SUPABASE_URL>/functions/v1/communication-delivery?token=<WORKER_TOKEN>`
- `<SUPABASE_URL>/functions/v1/calendar-sync?token=<WORKER_TOKEN>`
- `<SUPABASE_URL>/functions/v1/push-worker?token=<WORKER_TOKEN>`

## Required environment variables

### Widget ingest

- **None** (relies on `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`).

### Communication webhooks + delivery

- **None** (relies on `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`).

### OAuth + encryption

- `OAUTH_STATE_SECRET` (HMAC secret for signed OAuth state)
- `OAUTH_TOKEN_ENCRYPTION_KEY` (32 bytes, **hex (64 chars)** or **base64**)
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `MICROSOFT_OAUTH_CLIENT_ID`
- `MICROSOFT_OAUTH_CLIENT_SECRET`

#### OAuth redirect URLs you must whitelist

In Google Cloud Console and Microsoft Entra, add these **Redirect URIs** (they are generated from `SUPABASE_URL`):

- Google callback: `<SUPABASE_URL>/functions/v1/oauth-google?action=callback`
- Microsoft callback: `<SUPABASE_URL>/functions/v1/oauth-microsoft?action=callback`

Example shape: `https://<project-ref>.supabase.co/functions/v1/oauth-google?action=callback`

#### Generate safe secrets

- `OAUTH_STATE_SECRET`: any long random string (keep private).
- `OAUTH_TOKEN_ENCRYPTION_KEY`: 32 bytes.
  - If you have OpenSSL: `openssl rand -hex 32`
  - If you have Node installed:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Email inbound

- `RESEND_WEBHOOK_SECRET` (recommended; copy from Resend webhook details page)
- `RESEND_API_KEY` (required to fetch received email body content)
- `OPENAI_API_KEY` (optional; enables LLM link extraction)

### Web Push

Frontend:

- `VITE_VAPID_PUBLIC_KEY` (URL-safe base64 public VAPID key)

Edge Functions:

- `VAPID_KEYS_JSON` (output JSON from `generate-vapid-keys.ts` in `@negrel/webpush`)
- `VAPID_CONTACT_EMAIL` (e.g. `admin@soundpath.app`)
- `PUSH_SEND_SECRET` (optional; if set, `push-send` requires `X-Push-Secret`)

#### Generate VAPID keys

Using Deno (recommended with the library we use server-side):

```bash
deno run https://raw.githubusercontent.com/negrel/webpush/master/cmd/generate-vapid-keys.ts
```

- Put the JSON output into `VAPID_KEYS_JSON`
- Set `VITE_VAPID_PUBLIC_KEY` to the **URL-safe base64 public key** (the generator output includes/export supports this; keep the private key server-side only)

## Step 4 — Configure schedules (workers)

These workers must be invoked periodically (cron / scheduled function) to process queues:

- `webhook-delivery`: drains `webhook_deliveries`
- `communication-delivery`: drains `communication_deliveries`
- `calendar-sync`: drains `calendar_jobs`
- `push-worker`: drains `push_notification_jobs`

### Easiest option: Vercel Cron (already wired)

This repo includes:

- `api/cron/workers.js` (calls all worker functions)
- `vercel.json` cron schedule: every 2 minutes

To enable it:

1. In **Vercel → Project → Settings → Environment Variables**, add:
   - `WORKER_TOKEN` (must match the Supabase Edge Functions secret)
   - `VITE_SUPABASE_URL` (your Supabase project URL)
2. Redeploy the site on Vercel.

If your Vercel plan doesn’t include Cron Jobs, you can still call `https://<your-site>/api/cron/workers` from any external scheduler.

### Recommended cadence

- `webhook-delivery`: every 1–2 minutes
- `communication-delivery`: every 1–2 minutes
- `calendar-sync`: every 2–5 minutes
- `push-worker`: every 1 minute

## Step 5 — Configure in the UI (what to click)

- **Portal Settings**: `Profile → Settings → Portal Settings`
  - Allowed domains
  - Widget snippet (JS)
  - Routing email (`<org_id>@<your receiving domain>`; set `VITE_INBOUND_EMAIL_DOMAIN` in Vercel)
  - Communication webhook URLs
  - New Submission pings toggle (defaults off)
- **Integrations**: `Profile → Settings → Integrations`
  - Connect Google / Microsoft
- **Browser Notifications**: `Global Account Settings → Browser Notifications`
  - Registers `public/sw.js`
  - Stores subscription in `push_subscriptions`

## Step 6 — Test plan (end-to-end)

### A) Website ingest widget + allowlist

1. Add your website host to `Allowed domains` (e.g. `yourlabel.com` or `.yourlabel.com`)
2. Copy the **JS Widget** snippet into that website
3. Submit a test form
4. Confirm a new row appears in `tracks` for that label in `inbox`

If you get “Origin not allowed”:
- The request Origin must match a domain in `organizations.allowed_domains`
- Make sure you saved Portal Settings after editing domains

### B) Communication webhooks (Slack/Discord)

1. Paste your webhook URL(s)
2. Toggle **Enable New Submission pings** ON and Save
3. Create a new inbox submission (widget or public form)
4. Run the worker schedule (or invoke the function manually) so deliveries drain

### C) Google/Microsoft OAuth + calendar automation

1. In Google/Microsoft consoles, add the callback URLs listed above
2. Set Edge secrets (`OAUTH_*`, client IDs/secrets)
3. Connect provider in `Profile → Settings → Integrations`
4. Update a track:
   - Change status to `Follow Up` → expect a reminder 2 days out
   - Set `contract_signed=true` and `release_date` → expect a calendar entry
5. Ensure `calendar-sync` worker is scheduled and running

### D) Email-to-inbox

This project uses **Resend Receiving**.

1. In Resend → **Emails → Receiving**, note your receiving domain (either a `.resend.app` domain or your custom one).
2. In Resend → **Webhooks** → Add Webhook:
   - **URL**: `<SUPABASE_URL>/functions/v1/inbound-email`
   - **Event**: `email.received`
3. Copy the webhook signing secret from Resend and set it in Supabase secrets:
   - `RESEND_WEBHOOK_SECRET`
4. Make sure `RESEND_API_KEY` is set in Supabase secrets (it’s also used for sending).
5. In Vercel env, set `VITE_INBOUND_EMAIL_DOMAIN` to your receiving domain (so the Portal Settings UI shows the correct routing email).
6. Send a test email to `<label_slug>@<your receiving domain>` containing a SoundCloud link.
7. Confirm a new track appears and the artist/title auto-populates when SoundCloud oEmbed succeeds.

### E) Web Push

1. Set `VITE_VAPID_PUBLIC_KEY` in your frontend environment and redeploy the app
2. Open app → Global Account Settings → Browser Notifications → Enable
3. Confirm row exists in либ `push_subscriptions` for your `auth_user_id`
4. Mark a personal-inbox track `high_priority=true` (this enqueues a push job)
5. Ensure `push-worker` is scheduled; it sends notifications via VAPID keys

## Notes / gotchas

- **Slack/Discord pings are gated by preferences** and default OFF:
  - Stored in `organization_notification_preferences`
- **Workers must run**: enqueuing is DB-driven; delivery happens only when workers run.
- **OAuth tokens are encrypted before DB storage** using `OAUTH_TOKEN_ENCRYPTION_KEY` (AES-GCM).

