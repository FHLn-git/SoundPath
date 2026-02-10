# Venue: Production app and new Venue (ShowCheck) alignment

The **SoundPath production app** (Vite, `src/`) and the **new Venue app** (ShowCheck, `ShowCheck/`) are aligned so that the main Venue entry point uses the new experience.

## How it works

- **Routes:** `/venue` and `/app/venue` in the production app render `VenueApp` (see `src/App.jsx` and `src/pages/VenueApp.jsx`).
- **VenueApp behavior:**
  - If **new Venue** is enabled (see below), it renders the **ShowCheck** app in a full-viewport **iframe**. ShowCheck is the improved Venue (calendar, holds, offers, settlements, assets, integrations, avails, reports, settings with sub-tabs).
  - Otherwise it renders the **legacy** Venue UI (old `VenueDashboard` in `src/components/venue/`).

## When the new Venue is used

1. **Development**  
   In dev (`npm run dev`), VenueApp defaults the iframe URL to **`http://localhost:3001`**.  
   So with **`npm run dev:all`** (Vite + ShowCheck), opening `/venue` or `/app/venue` loads the new Venue without setting any env.  
   **Note:** Vite and ShowCheck run on different ports (e.g. 5173 and 3001), so the iframe is cross-origin and session storage is not shared. If you're already signed in on the main app, you may need to sign in once inside the Venue iframe (same Supabase project). In production with same-origin iframe, one sign-in covers both.

2. **Production**  
   Set **`VITE_VENUE_APP_URL`** in the Vite app’s environment to the URL where ShowCheck is served (e.g. `https://venue.soundpath.app` or same-origin path like `https://app.soundpath.com/venue-app`).  
   If `VITE_VENUE_APP_URL` is not set in production, the **legacy** Venue dashboard is shown.

## Env summary

| Where | Variable | Purpose |
|-------|----------|--------|
| **Production app (root `.env`)** | `VITE_VENUE_APP_URL` | Optional. URL of the new Venue (ShowCheck). Unset in prod = legacy Venue. In dev, defaults to `http://localhost:3001` if unset. |
| **ShowCheck (`ShowCheck/.env.local`)** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required for ShowCheck to talk to Supabase (same project as the rest of SoundPath). |

## Deploying so production uses the new Venue

1. **Deploy ShowCheck** (e.g. Vercel) with `NEXT_PUBLIC_SUPABASE_*` set. Note the URL (e.g. `https://venue.soundpath.app`).
2. **In the main SoundPath (Vite) project**, set `VITE_VENUE_APP_URL` to that URL.
3. **Auth:** If the iframe is **same origin** (e.g. ShowCheck served at `/venue-app` on the same domain), the session cookie is sent and the user stays signed in. If the iframe is **cross-origin**, use the same Supabase project and ensure both apps use the same auth flow so the user can sign in inside the iframe if needed.
4. **DB:** Run all Venue migrations (venues-and-shows-schema, venue-lifecycle-and-deals, venue-assets-and-integrations-phase6, venue-phase7-indexes, etc.) in your Supabase project.

## Single codebase / single deploy (optional)

To serve both the Vite app and ShowCheck from **one** deployment (e.g. one Vercel project):

- Build and serve ShowCheck at a path (e.g. `/venue-app`) via rewrites or a second app in the same repo.
- Set `VITE_VENUE_APP_URL` to that path (e.g. `https://yoursite.com/venue-app` or a relative path if your build supports it).

Then `/venue` and `/app/venue` in the main app will show the new Venue in the iframe with no cross-origin auth issues.
