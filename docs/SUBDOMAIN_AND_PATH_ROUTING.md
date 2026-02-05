# Subdomain + Path-Based Routing (Multi-App Architecture)

This doc describes the refactored multi-app routing: subdomains for production and path-based for localhost.

## 1. Directory structure (route groups)

- **`src/app/(marketing)/`** – Public pages: Home, Solutions, Products, Pricing. Uses `MarketingLayout` + MegaNav only.
- **`src/app/(dashboard)/label/`** – Label app: launchpad, labels, personal, phase, artists, admin, calendar, vault, etc.
- **`src/app/(dashboard)/venue/`** – Venue app (full viewport; no Label sidebar).
- **`src/app/(dashboard)/artist/`** – Artist app (Coming Soon placeholder).

Marketing and dashboard are kept separate: **MarketingLayout is never used for dashboard routes**, and **Sidebar/MobileLayout are never used for marketing routes**.

## 2. Subdomain middleware (`middleware.js`)

Vercel Edge Middleware runs on each request:

- **label.soundpath.app** – If path is not already `/label` or `/label/*`, redirect to `/label` or `/label/launchpad` (etc.) so the SPA sees path `/label/*`.
- **venue.soundpath.app** – Redirect to `/venue` (or `/venue/*`).
- **artist.soundpath.app** – Redirect to `/artist` (or `/artist/*`).
- **soundpath.app** (no subdomain) – No rewrite; marketing and path-based `/app/label`, `/app/venue`, `/app/artist` apply.
- **localhost** – No rewrite; path-based only (`/app/label/launchpad`, `/app/venue`, etc.).

`vercel.json` no longer redirects subdomains to the main domain; rewrites serve `index.html` for `/label/*`, `/venue/*`, `/artist/*` so the SPA can route.

## 3. Global App Switcher and links

- **`src/lib/appHost.js`** – `getAppHost()`, `getAppBaseUrl(app)`, `getLabelPath(...)`, etc.
- **AppSwitcher** – Label and Venue use **absolute URLs** from `getAppBaseUrl('label')` / `getAppBaseUrl('venue')`. In production this is `https://label.soundpath.app`, `https://venue.soundpath.app` so the browser switches context. On localhost, same-origin path URLs are used.
- **AppSelector** – “Open Label app” / “Open Venue app” use the same logic: when target host differs from current (e.g. soundpath.app → label.soundpath.app), full navigation; otherwise client-side navigate.
- **Sidebar & BottomNav** – All label links use `getLabelPath(...)` so paths are `/label/*` on the label subdomain and `/app/label/*` on main domain or localhost.

## 4. Session across subdomains

Session is **not** shared via a single cookie domain today. The app uses:

- **Auth handoff** – From soundpath.app, opening Label or Venue sends the user to the subdomain; use `/auth/continue` (or similar) to pass tokens so the target app can set its own session.
- **Supabase** – Uses `localStorage` per origin. For true “one login for all subdomains” you’d need a custom storage adapter or server-side auth that sets cookies with `domain=.soundpath.app`. See comment in `src/lib/supabaseClient.js`.

## 5. Coming Soon and error handling

- **Artist** – Routes `/app/artist` and `/artist` (and `/artist/*`) render `ComingSoonApp` (Alpha teaser).
- **Venue** – Renders `VenueApp` (iframe to Venue sub-app on the same site; prod default same-origin `/venue`, dev default `http://localhost:3001`).
- **Sign / Vault / Splits** – Vault is a real page under the Label app. Sign and Splits can be added as top-level app routes that render a Coming Soon layout if needed.

## 6. Layout audit

- **Marketing** – Only routes under `MarketingLayout` (index, solutions, products, pricing, resources) show MegaNav. No dashboard sidebar.
- **Dashboard** – Only Label routes (`/app/label/*`, `/label/*`) and settings use `MobileLayout` + Sidebar. Venue and Artist are sub-apps (Venue: full-viewport iframe at same-origin `/venue`; Artist: Coming Soon).

## Quick reference

| Context              | Label app path      | Venue path   | Artist path   |
|----------------------|---------------------|-------------|---------------|
| soundpath.app        | `/app/label/...`    | `/app/venue`| `/app/artist` |
| label.soundpath.app  | `/label/...`       | (use App Switcher) | (use App Switcher) |
| venue.soundpath.app  | (use App Switcher)  | `/venue`    | (use App Switcher) |
| localhost            | `/app/label/...`    | `/app/venue`| `/app/artist` |
