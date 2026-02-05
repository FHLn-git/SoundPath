# Venue (ShowCheck) Multi-Tenant Refactor

This doc summarizes the industrial refactor of the ShowCheck app for multi-tenant workspaces and dynamic data.

## Database (Supabase)

### Migration: `database/migrations/venues-and-shows-schema.sql`

- **venues**  
  `id`, `owner_id` (auth.users), `organization_id` (optional FK to organizations), `name`, `capacity`, `address`, `contact_info` (JSONB), `metadata` (JSONB).

- **shows**  
  `id`, `venue_id`, `name`, `artist_name`, `date`, `status`, `contract_status`, `payout_status`, run-of-show times (`load_in`, `soundcheck`, `doors`, `curfew`, `load_out`), `selected_items` (TEXT[]), `green_room_items` (JSONB), `bands` (JSONB), `special_requests`.

- **RLS**  
  - Venues: `owner_id = auth.uid()` for SELECT/INSERT/UPDATE/DELETE.  
  - Shows: access only for venues where `venues.owner_id = auth.uid()`.

Run the migration in the Supabase SQL Editor.

## ShowCheck App (Next.js)

### Env (when running ShowCheck standalone)

In `ShowCheck/.env.local` (or root `.env` if running from repo root):

- `NEXT_PUBLIC_SUPABASE_URL` – Supabase project URL  
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Supabase anon key  

Same Supabase project as the SoundPath ecosystem so auth and RLS align.

### Data flow

- **useVenue** (`lib/use-venue.ts`)  
  Resolves current user, loads venues for `owner_id`, and manages **active venue** (localStorage key `showcheck_active_venue_id`).

- **useShows(venueId)** (`lib/use-shows.ts`)  
  Loads shows for the given venue from `shows` and maps rows to the app’s `Event` type.

- **VenueDataProvider**  
  Wraps the app with `useVenue` + `useShows`, passes `initialEvents` and `onPersistEvent` / `onDeleteEvent` into **EventProvider** so:
  - Show Calendar and Payout Tracker show only data for the **active venue**.
  - Add Show / Edit Event perform **upserts** (and deletes) in Supabase, then refetch.

- **EventProvider**  
  Accepts optional `initialEvents`, `venueId`, `onPersistEvent`, `onDeleteEvent`. When set, events are synced from DB and all edits (times, rider, wizard, etc.) trigger `onPersistEvent` so the DB stays in sync.

### Venue onboarding and switcher

- **Create New Venue**  
  Modal form (`CreateVenueModal`) inserts into `venues` and then:
  - Sets the new venue as active and refetches venues.
  - User lands on that venue’s dashboard (no separate redirect route).

- **Venue Switcher**  
  In the header (same row as “SoundPath | VENUE”): dropdown of venues + “Create New Venue”. Choosing a venue sets `activeVenueId` and reloads shows for that venue.

### UI state and loading

- **Add Show**  
  `EventCreator` calls `saveEvent(newEvent)`; when `venueId` is set this runs `upsertShow` and refetches. New show appears in the list with a real DB id.

- **Edit Event / times / rider / wizard**  
  All updates go through the event context and, when `venueId` is set, call `onPersistEvent(updated)` so the DB is updated.

- **Loading**  
  `useVenueData().loading` drives:
  - Initial load and venue switch: **VenueDashboardSkeleton** (DAW-style blocks).
  - Empty state when the user has no venues: CTA to create the first venue.

### OS integration

- **Global App Switcher**  
  Unchanged: grid icon in the header opens Label / Venue / Artist. Venue stays current when embedded in the SoundPath wrapper.

- **Branding**  
  Header title is **SoundPath | VENUE** (replacing “Backstage”). Venue name and initials in the top-right reflect the active venue.

## Technical rider (house minimums / catalog)

House minimums and catalog are still **in-memory** in `EventProvider` (default menu items). Persisting them per venue (e.g. `venue.metadata.rider` or a `venue_rider_items` table) can be added later so “Edit Technical Rider” and catalog edits are stored in the DB.

## Going live with SoundPath Venue (one ecosystem)

**Label, Venue, Artist, Sign, Splits, and Vault are one site on one Vercel project.** Venue is a sub-app of that same deployment, not a separate project.

- **Coming Soon removed**  
  `/app/venue` always loads the Venue app (iframe). No separate “Venue deployment” required.

- **Default iframe URL**  
  - **Production:** same origin + `/venue` (e.g. `https://yoursite.com/venue`). The Venue sub-app (ShowCheck) is served at that path on the **same** Vercel project.  
  - **Dev:** `http://localhost:3001` so the iframe loads your local ShowCheck dev server. Set `VITE_VENUE_APP_URL` to override either.

- **One project, one site**  
  In your single Vercel project, configure the Venue app (ShowCheck) to be built and served at `/venue` (e.g. second app in same repo, or rewrites to ShowCheck output). Use the same project env for `NEXT_PUBLIC_SUPABASE_*` so the Venue sub-app can talk to Supabase. Run DB migrations `venues-and-shows-schema.sql` and `venues-address-fields.sql` in Supabase once. If your Venue app is currently served at a different path or URL in that same project, set `VITE_VENUE_APP_URL` to that URL until `/venue` is wired to ShowCheck.

- **App Switcher / App Selector**  
  Venue is available from the grid switcher and “Choose your app”; no extra deployment needed.

## Files touched (summary)

- **DB:** `database/migrations/venues-and-shows-schema.sql` (new).
- **ShowCheck:**  
  `lib/supabase.ts`, `lib/venue-types.ts`, `lib/show-mapping.ts`, `lib/show-api.ts`, `lib/venue-api.ts`, `lib/use-venue.ts`, `lib/use-shows.ts`  
  `components/event-context.tsx` (props + saveEvent/deleteEvent + persist on edit)  
  `components/venue-data-provider.tsx`, `components/venue-dashboard-skeleton.tsx`, `components/create-venue-modal.tsx`  
  `components/app-header.tsx` (SoundPath | VENUE, venue switcher, active venue display)  
  `components/venue-admin-dashboard.tsx` (skeleton when loading)  
  `components/venue/event-creator.tsx` (saveEvent on create)  
  `app/page.tsx` (VenueDataProvider, no-venue state, header props)
