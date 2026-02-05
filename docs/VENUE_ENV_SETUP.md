# Venue (ShowCheck) – Environment variables in detail

The Venue app needs two environment variables to talk to Supabase. Here's where they go, what they are, and how they relate to the rest of the SoundPath ecosystem.

---

## 1. Which variables?

| Variable | Meaning | Example |
|----------|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://abcdefgh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase "anon" (public) API key | Long string starting with `eyJ...` |

They must start with **`NEXT_PUBLIC_`** because ShowCheck is a **Next.js** app: only variables with that prefix are available in the browser, and the Supabase client runs in the browser.

---

## 2. Where to put them?

### Option A – Running ShowCheck by itself (e.g. local dev)

Create a file **inside the ShowCheck folder**:

- **Path:** `ShowCheck/.env.local`
- **Contents:** the two variables above.

So from the repo root you'd have:

- `Label_OS/ShowCheck/.env.local` ← **this is the file you edit**

Next.js will load `.env.local` when you run `npm run dev` (or `pnpm dev`) from **inside** `ShowCheck/`. It will **not** automatically use the root `.env` (the SoundPath wrapper uses `VITE_*` and lives in the parent folder).

### Option B – Same values as the SoundPath wrapper

The **SoundPath wrapper** (Vite) probably already has something like this in the **root** `.env`:

- `VITE_SUPABASE_URL=...`
- `VITE_SUPABASE_ANON_KEY=...`

Use the **same** Supabase project for ShowCheck:

- **Same project** → same `NEXT_PUBLIC_SUPABASE_URL` as `VITE_SUPABASE_URL` (same URL).
- **Same project** → same `NEXT_PUBLIC_SUPABASE_ANON_KEY` as `VITE_SUPABASE_ANON_KEY` (same anon key).

So you can copy the values from the root `.env` into `ShowCheck/.env.local` and only change the **names** to `NEXT_PUBLIC_*`:

```env
# ShowCheck/.env.local

NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

(Replace with your real URL and key.)

---

## 3. Step-by-step (local dev)

1. Open **Supabase Dashboard** → your project → **Project Settings** → **API**.
2. Copy:
   - **Project URL** → use for `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. In the repo, create `ShowCheck/.env.local` (you can copy from `ShowCheck/.env.example`).
4. Paste the two values:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

5. Save the file.
6. From the **ShowCheck** folder, run:

   ```bash
   cd ShowCheck
   npm run dev
   ```

   (Or `pnpm dev`; if you use a different port, that's fine.)

7. Open the Venue app in the browser (e.g. the URL Next.js prints, or the SoundPath wrapper's Venue iframe if it points to that URL). You should be able to sign in and see/create venues and shows.

---

## 4. When the Venue app is embedded in the SoundPath wrapper

The SoundPath wrapper (Vite) has:

- `VITE_VENUE_APP_URL` = URL where the Venue app is running (e.g. `http://localhost:3001` in dev or `https://venue.soundpath.app` in prod).

That URL is loaded in an **iframe**. The page that loads is still the **ShowCheck** app. So:

- The **ShowCheck** process (dev server or deployed app) must have `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in **its** environment (e.g. `ShowCheck/.env.local` in dev, or env vars in Vercel for the Venue project in prod).
- The SoundPath wrapper's `.env` only needs `VITE_VENUE_APP_URL` so it knows where to point the iframe; it does **not** provide Supabase config to ShowCheck.

So: **env for Supabase always lives where ShowCheck runs** (ShowCheck folder or Venue deployment), not in the wrapper's env.

---

## 5. What if I don't set them?

- The Venue app will still **build and run**.
- `lib/supabase.ts` will create a **null** client when the URL or key is missing.
- You'll get:
  - No venues or shows loading
  - "Failed to load venues" or similar when the app tries to fetch
  - Create Venue / Add Show will not persist to Supabase

So for real data and auth, you need these two variables set where ShowCheck runs.

---

## 6. Summary

| Question | Answer |
|----------|--------|
| **Which file?** | `ShowCheck/.env.local` (create it; it's gitignored). |
| **Variable names?** | `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (must start with `NEXT_PUBLIC_`). |
| **Same as ecosystem?** | Yes – use the **same** Supabase project URL and anon key as in the root `VITE_SUPABASE_*` (only the names change). |
| **Where do I get the values?** | Supabase Dashboard → Project Settings → API → Project URL and anon public key. |

If you tell me whether you're only running ShowCheck locally or also deploying it (e.g. Vercel), I can add a short "Production / Vercel" subsection with exact env var names for that host.
