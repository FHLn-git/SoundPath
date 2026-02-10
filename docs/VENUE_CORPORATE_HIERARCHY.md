# Venue Corporate Hierarchy & Resource Inheritance

This doc describes the corporate hierarchy refactor for SoundPath VENUE (ShowCheck): VenueGroups → Venues → Stages, dashboard tiers, festival mode, and permissions.

## Database (run after venues-and-shows-schema, venues-address-fields)

**Migration:** `database/migrations/venue-corporate-hierarchy.sql`

- **venue_groups** – `id`, `owner_id`, `group_name`. Corporate shell for multiple venues.
- **venues** – New columns: `group_id` (FK to venue_groups), `timezone`, `shared_facilities_json` (e.g. Green Room 1: Occupied).
- **stages** – `id`, `venue_id`, `name`, `capacity`, `technical_specs_json`. Capacity and tech specs live at stage level.
- **shows** – New columns: `stage_id` (single stage), `is_multi_stage` (boolean), `linked_stage_ids` (uuid[]). Festival mode blocks all linked stages.
- **venue_roles** – `entity_type` (group | venue | stage), `entity_id`, `user_id`, `role` (group_admin | venue_manager | stage_hand). RLS enforces access.

## Dashboard tiers

- **HQ** (`/venue/hq`) – Macro roll-up of all venues (and groups). Links to each venue.
- **Venue** (`/venue/[venue_id]`) – Shared resources (from `shared_facilities_json`) and list of stages. Links to each stage.
- **Stage** (`/venue/[venue_id]/[stage_id]`) – Calendar (shows for that stage) and technical rider (`technical_specs_json`).

## Festival mode (Create Event)

- In Create Event, toggle **Multi-Stage / Festival Mode**.
- Select one or more stages. Capacity display shows the **sum** of selected stages.
- Saving the event sets `is_multi_stage` and `linked_stage_ids` so the calendar **blocks** those stages simultaneously and prevents double-booking.

## Permissions & roles (RLS)

- **Group Admin** – Access to all venues and stages in the group; can manage venue_roles for the group and its venues/stages.
- **Venue Manager** – Access to all stages in one venue; can create/edit shows and manage stage_hand roles for that venue.
- **Stage Hand / Tech** – Access only to their assigned stage: Stage View and technical riders; can view (but not create) shows for that stage.

RLS policies in the migration enforce SELECT/INSERT/UPDATE/DELETE for `venue_roles`; the UI can use `useVenueRoles()` and `hasRole()` to hide actions (e.g. “Create Venue”) for stage_hand-only users.

## UI

- **Venue/Stage breadcrumb** in the header (venue routes): `[HQ] > [Venue Group] > [Venue Name] > [Select Stage]`. DAW-style `#0B0E14` background and mono-spaced technical data where appropriate.
- Root dashboard has an **HQ Roll-Up** link to `/venue/hq`.

## Files touched (summary)

- **DB:** `database/migrations/venue-corporate-hierarchy.sql`
- **ShowCheck types:** `lib/venue-types.ts` (VenueGroup, Stage, SharedFacility, ShowRow + stage fields, VenueRole)
- **ShowCheck API/hooks:** `lib/venue-group-api.ts`, `lib/stage-api.ts`, `lib/use-venue-hierarchy.ts`, `lib/show-mapping.ts`, `lib/show-api.ts`, `lib/use-shows.ts`
- **Event model:** `components/event-context.tsx` (Event.isMultiStage, linkedStageIds, stageId), `components/venue/event-creator.tsx` (festival toggle, stage multi-select, combined capacity)
- **Routes:** `app/venue/layout.tsx`, `app/venue/hq/page.tsx`, `app/venue/[venueId]/page.tsx`, `app/venue/[venueId]/[stageId]/page.tsx`
- **UI:** `components/venue-breadcrumb.tsx`, `app/page.tsx` (HQ link)
