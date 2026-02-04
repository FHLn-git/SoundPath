# How to Set Up soundpath.app, label.soundpath.app, and venue.soundpath.app

This guide walks you through getting your three URLs working: **soundpath.app** (landing + app selector), **label.soundpath.app** (Label app), and **venue.soundpath.app** (Venue app). You’ll use one GitHub repo and three Vercel projects.

---

## What You’ll Have When You’re Done

| URL | What it does |
|-----|----------------|
| **soundpath.app** | Landing/marketing site. Log in here; after login you see the **App Selector** (Choose Label, Venue, or Artist). No Label or Venue dashboards on this URL. |
| **label.soundpath.app** | The Label app (A&R pipeline, demos, artists). You get here by clicking “Open Label app” on the app selector, or by opening this URL and signing in. |
| **venue.soundpath.app** | The Venue app (ShowCheck). You get here by clicking “Open Venue app” on the app selector, or by opening this URL. |

After logging in once on **soundpath.app**, clicking “Open Label app” or “Open Venue app” sends you to the right URL **without asking you to log in again** (your session is passed securely).

---

## Prerequisites

- A **Vercel** account (free is fine): [vercel.com](https://vercel.com)
- Your **SoundPath repo** on GitHub (this one)
- Your **domain** (e.g. **soundpath.app**) connected in Vercel or your registrar
- **Supabase** project already set up for SoundPath (same one for all three)

---

## Part 1: Create Three Vercel Projects (Same Repo)

You will create **three separate Vercel projects**, all pointing at the **same GitHub repo**. Each project will have a different **Root Directory** and **Environment Variables**.

### Step 1: First project – Landing site (soundpath.app)

1. Go to [vercel.com/new](https://vercel.com/new).
2. **Import** your SoundPath GitHub repo (e.g. `FHLn-git/SoundPath`).
3. **Project Name:** e.g. `soundpath-landing` (you can change it later).
4. **Root Directory:** leave as **`.`** (the repo root).  
   - The landing site uses the same codebase; we switch behavior with an env var.
5. **Framework Preset:** Vite (Vercel usually detects it).
6. **Build Command:** `npm run build` (default).
7. **Output Directory:** `dist` (default for Vite).
8. **Install Command:** `npm install`.
9. Before clicking **Deploy**, open **Environment Variables** and add:

   | Name | Value | Environment |
   |------|--------|-------------|
   | `VITE_SITE_MODE` | `landing` | Production, Preview, Development |
   | `VITE_LABEL_APP_URL` | `https://label.soundpath.app` | Production, Preview, Development |
   | `VITE_VENUE_APP_URL` | `https://venue.soundpath.app` | Production, Preview, Development |
   | `VITE_SUPABASE_URL` | *(your Supabase project URL)* | Production, Preview, Development |
   | `VITE_SUPABASE_ANON_KEY` | *(your Supabase anon key)* | Production, Preview, Development |

   Add any other `VITE_*` vars you already use (e.g. Stripe, Resend) if the landing site needs them.

10. Click **Deploy**. When it finishes, you’ll get a URL like `soundpath-landing-xxx.vercel.app`.

---

### Step 2: Second project – Label app (label.soundpath.app)

1. Go to [vercel.com/new](https://vercel.com/new) again.
2. **Import the same** SoundPath GitHub repo.
3. **Project Name:** e.g. `soundpath-label`.
4. **Root Directory:** leave as **`.`** (same repo root).
5. **Framework / Build / Output:** same as Step 1 (Vite, `npm run build`, `dist`).
6. **Do not** set `VITE_SITE_MODE` here. Leave it **unset** so this deploy is the full Label app.
7. Add **Environment Variables**:

   | Name | Value | Environment |
   |------|--------|-------------|
   | `VITE_SUPABASE_URL` | *(same Supabase URL)* | Production, Preview, Development |
   | `VITE_SUPABASE_ANON_KEY` | *(same Supabase anon key)* | Production, Preview, Development |

   Plus any other `VITE_*` vars the Label app needs (Stripe, etc.).

8. Click **Deploy**. You’ll get a URL like `soundpath-label-xxx.vercel.app`.

---

### Step 3: Third project – Venue app (venue.soundpath.app)

1. Go to [vercel.com/new](https://vercel.com/new) again.
2. **Import the same** SoundPath GitHub repo.
3. **Project Name:** e.g. `soundpath-venue`.
4. **Root Directory:** set to **`ShowCheck`**.  
   - This tells Vercel to build the **ShowCheck** (Venue) app, which lives in the `ShowCheck` folder.
5. **Framework Preset:** Next.js (Vercel should detect it inside `ShowCheck`).
6. **Build Command:** leave default (`npm run build` or `pnpm build`).
7. **Install Command:** `npm install` (or `pnpm install` if you use pnpm in ShowCheck).
8. Add **Environment Variables** if the Venue app needs them (e.g. Supabase, if you add auth to Venue later). For a basic deploy you can leave them empty at first.
9. Click **Deploy**. You’ll get a URL like `soundpath-venue-xxx.vercel.app`.

---

## Part 2: Attach Your Domain to Each Project

You need to assign **soundpath.app**, **label.soundpath.app**, and **venue.soundpath.app** to the right project.

### Step 1: Domain in Vercel (if not already)

1. In Vercel, go to your **team/account** (click your profile or team name).
2. Go to **Settings → Domains** (or the **Domains** tab for the team).
3. Add **soundpath.app** (your main domain).  
   - Vercel will show you the DNS records to add at your registrar (e.g. A record or CNAME). Add them and wait until the domain is verified.

You only need to add the **root domain** once; subdomains (label, venue) are added per project below.

---

### Step 2: Assign soundpath.app to the **Landing** project

1. Open the **soundpath-landing** (first) project.
2. Go to **Settings → Domains**.
3. Add domain: **soundpath.app** (and optionally **www.soundpath.app**).
4. If Vercel asks for DNS, add the record it shows (often a CNAME to `cname.vercel-dns.com` or an A record). Save at your registrar.
5. Wait until the domain shows as **Verified**.

---

### Step 3: Assign label.soundpath.app to the **Label** project

1. Open the **soundpath-label** (second) project.
2. Go to **Settings → Domains**.
3. Add domain: **label.soundpath.app**.
4. Add the DNS record Vercel shows (usually CNAME `label` → `cname.vercel-dns.com` or the project’s Vercel URL). Save at your registrar.
5. Wait until it’s **Verified**.

---

### Step 4: Assign venue.soundpath.app to the **Venue** project

1. Open the **soundpath-venue** (third) project.
2. Go to **Settings → Domains**.
3. Add domain: **venue.soundpath.app**.
4. Add the DNS record Vercel shows. Save at your registrar.
5. Wait until it’s **Verified**.

---

## Part 3: Supabase Redirect URLs (So Login Works Everywhere)

Supabase needs to know that login is allowed from all three URLs.

1. Open your **Supabase** project → **Authentication → URL Configuration**.
2. In **Redirect URLs**, add (one per line):
   - `https://soundpath.app/**`
   - `https://label.soundpath.app/**`
   - `https://venue.soundpath.app/**`
3. For **Site URL** you can keep `https://soundpath.app` (where users usually start).
4. Save.

Now users can sign in on soundpath.app and be sent to label or venue without signing in again (the app selector passes the session securely).

---

## Part 4: Quick Checklist

- [ ] **Landing project:** `VITE_SITE_MODE=landing`, `VITE_LABEL_APP_URL`, `VITE_VENUE_APP_URL`, Supabase env vars. Domain: **soundpath.app**.
- [ ] **Label project:** No `VITE_SITE_MODE`. Supabase env vars. Domain: **label.soundpath.app**.
- [ ] **Venue project:** Root Directory = **ShowCheck**. Domain: **venue.soundpath.app**.
- [ ] **Supabase:** Redirect URLs include soundpath.app, label.soundpath.app, venue.soundpath.app.

---

## How It Behaves for Users

1. User goes to **soundpath.app** → sees marketing/landing.
2. User clicks **Sign In** and logs in → redirected to **App Selector** (“Choose your app”).
3. User clicks **Open Label app** → browser goes to **label.soundpath.app/auth/continue#...** (tokens in the URL fragment). Label app sets the session and opens the dashboard. No second login.
4. User clicks **Open Venue app** → same idea for **venue.soundpath.app** (when Venue has the same auth handoff).

If someone opens **label.soundpath.app** or **venue.soundpath.app** directly without coming from the app selector, they’ll see the normal login page for that app (or the handoff page if you add one to Venue).

---

## Troubleshooting

- **400 when opening Label app from app selector**  
  The handoff passes your session to the Label app. A 400 usually means the **Label app is using a different Supabase project** than the landing app. Fix: In the **Label** Vercel project, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the **exact same values** as in the **Landing** project (same Supabase project URL and anon key). Redeploy the Label app. If you run locally, use the same `.env` Supabase values for both the landing and label builds.

- **“Redirect URL not allowed”**  
  Add the exact URL (including https and the path) to Supabase **Redirect URLs** (e.g. `https://label.soundpath.app/auth/continue` and `https://label.soundpath.app/**`).

- **Landing site shows the Label app**  
  On the **landing** Vercel project, make sure `VITE_SITE_MODE=landing` is set for the environment you’re using (Production/Preview). Redeploy after changing env vars.

- **Label or Venue build fails**  
  - Label: Root Directory must be **`.`** (or empty).  
  - Venue: Root Directory must be **`ShowCheck`** and Framework **Next.js**.

- **Venue app doesn’t have login yet**  
  The app selector still opens venue.soundpath.app. You can add an auth handoff page to the Venue (ShowCheck) app later so that when users come from the selector they’re signed in there too.

---

## Summary

- **One repo**, three Vercel projects: same repo, different env and (for Venue) different Root Directory.
- **soundpath.app** = landing + app selector (`VITE_SITE_MODE=landing`).
- **label.soundpath.app** = Label app (no `VITE_SITE_MODE`).
- **venue.soundpath.app** = Venue app (Root Directory = `ShowCheck`).
- Set **Supabase redirect URLs** for all three domains so login and handoff work everywhere.

If you hit a step that doesn’t match your Vercel or Supabase screen, say which step and what you see and we can adjust the instructions.
