# SoundPath Venue Upgrade Plan: Industry-Leading Capability with DAW UX

**Purpose:** This document is a comprehensive, executable upgrade plan for Cursor (or any developer) to follow.

**How to use this plan (for Cursor):** Execute **Phase 0 through Phase 7 in order**. Each phase has Database, API/Hooks, UI, and Acceptance sections. Before starting a phase, read Section 2 (DAW principles) and the capability matrix (Section 1). Prefer implementing in ShowCheck (`ShowCheck/`) and keep `#0B0E14` and existing venue components consistent. After each phase, verify Acceptance criteria before moving on. The goal is to give SoundPath Venue **all of Prism.fm’s capabilities** and **inspiration from OpenDate.io**, while **keeping our DAW-like workflow and UI** and making SoundPath Venue the **most capable and easiest to use** venue management tool in the industry.

**Design constraints:**
- Preserve DAW aesthetic: `#0B0E14` background, mono-spaced technical data where appropriate, sticky headers, breadcrumbs (HQ → Group → Venue → Stage), skeleton loading, high information density.
- Single ecosystem: Venue stays part of SoundPath (Label, Venue, Artist, Sign, Splits, Vault). Reuse Sign for contracts and Splits for settlement data where it fits.
- One codebase: Prefer consolidating on **ShowCheck** (Next.js under `ShowCheck/`) as the canonical Venue app, with `src/` VenueApp.jsx and components either migrated into ShowCheck or kept as thin wrappers that delegate to ShowCheck. All new features live in ShowCheck unless otherwise noted.

---

## 1. Three-Way Capability Matrix

| Capability | Prism.fm | OpenDate.io | SoundPath Venue (current) | SoundPath Venue (target) |
|------------|-----------|-------------|---------------------------|--------------------------|
| **Calendar** | Unified calendar, run of show, deals/contracts/payments in one place | Multi-venue calendar; holds vs confirms; list + calendar view; filter holds/on-sale/past | Shows with run-of-show; stage calendar; no “hold” state | Full parity: holds, confirms, on-sale, past; list + calendar; multi-venue/stage toggle |
| **Holds** | — | Ranked holds; auto-promote when hold removed; multi-date hold levels | — | Ranked holds; optional auto-promote; hold levels |
| **Check avails** | — | Date range + filter; copy to clipboard for artist team | — | Date range avail check; filter by holds/confirms/days; copy avails |
| **Import calendar** | Google, Eventbrite, POS, ticketing, social | Outlook, Google, CSV | — | Google, Outlook (or iCal), CSV import |
| **Deal / offer tracking** | Deal & payment tracker; status/history per deal | Offer management: create/send/track; templates; offer → calendar on accept | `contract_status`, `payout_status` on shows only; no offer entity | Full deal pipeline: offers table; status; link offer → show; deal dashboard |
| **Offer templates** | — | Templates with deal structures, splits, bonuses, line-item expenses | — | Offer templates (deal type, splits, guarantees, line items) |
| **Inbound requests** | — | Custom inbound form; tag/filter/sort; artist DB auto-fill | — | Inbound form (embed/link); submission queue; tag/filter/sort |
| **Artist discovery** | — | ~2M artists; genre, capacity, followers, prior performance data | — | Phase 1: “our artists” (booked/offered); Phase 2: optional external/API |
| **Advances** | — | Templates; event page sharing | Run-of-show, rider in event | Advance templates; shareable event/advance page |
| **Settlements** | Offers + estimates + actuals; stress-free settlement workflow | Auto settlement from offer + ticket data; one-click settlement | SettlementSidebar (budget, house min, green room); payout_status on show | Settlement calc from offer + ticket data; one-click settlement view; notes/reminders |
| **P&L / financial reporting** | Real-time P&L; revenue/expense; forecasts; weekly/monthly/annual reports | PnL thermometer; forecast/estimate/actuals; profitability at a glance | — | P&L per show (forecast/estimate/actual); PnL thermometer; venue/group roll-up reports |
| **Payment tracking** | Track each payment; never miss a beat | — | payout_status only | Payment tracker UI: status, history, due dates |
| **Permissions** | Customizable by role; different views per role | Authorized users for confidential financials | venue_roles (group_admin, venue_manager, stage_hand) | Keep + extend: financial visibility by role; “confidential” flags |
| **Assets** | — | Riders, contracts, posters, flyers; right people have access | Rider/catalog in event; no central asset store | Asset storage per venue/event: riders, contracts, posters; role-based access |
| **Integrations** | Google Cal, Eventbrite, POS, ticketing, social | Ticketing (their own); calendar import | — | Calendar sync (Google, iCal); ticketing (webhook or API); Sign/Splits wired |
| **Insights / benchmarks** | Prism Insights (opt-in box office data, artist history) | Benchmark report | — | Optional later: opt-in benchmarks or internal analytics only |
| **Venue hierarchy** | — | Multi-room toggle | VenueGroups → Venues → Stages; festival mode; HQ | Keep and strengthen; ensure all new features respect hierarchy |
| **Run of show / rider** | Run of show in calendar | — | Run-of-show times; house minimums; catalog; green room | Keep; tie to advances and settlement |
| **DAW UX** | — | — | #0B0E14, breadcrumbs, skeletons | Preserve everywhere |

---

## 2. DAW Workflow & UI Principles (Do Not Break)

When implementing any feature, preserve the following:

- **Background:** Use `#0B0E14` for main app background; `bg-[#0B0E14]` or CSS variable `var(--color-os-bg)`.
- **Headers:** Sticky headers with `border-b border-gray-800` (or `border-border`), `backdrop-blur-sm`, same dark base.
- **Breadcrumbs:** Venue area uses `VenueBreadcrumb`: HQ → Venue Group → Venue → Stage (dropdown). DAW-style, mono where appropriate.
- **Cards/panels:** `border border-gray-700` (or `border-border`), `bg-gray-800/50` or equivalent; rounded corners consistent with existing (e.g. `rounded-lg` / `rounded-xl`).
- **Loading:** Use `VenueDashboardSkeleton`-style blocks (DAW-style placeholders), not generic spinners.
- **Typography:** Mono for technical/ID data (e.g. stage names, times); sans for labels and body.
- **Density:** Prefer compact, information-rich layouts; avoid “card soup” or excessive whitespace.
- **Theme:** Dark-first; no optional light theme required for Venue app.

Reference files:
- `ShowCheck/app/venue/layout.tsx` – layout and background
- `ShowCheck/components/venue-breadcrumb.tsx` – breadcrumb pattern
- `ShowCheck/components/venue-dashboard-skeleton.tsx` – loading pattern
- `docs/VENUE_CORPORATE_HIERARCHY.md` – hierarchy and roles

---

## 3. Phased Implementation Plan

Execute in order. Each phase has **Objectives**, **Database**, **API/Hooks**, **UI**, and **Acceptance** so Cursor can implement and verify.

---

### Phase 0: Consolidation & Data Model Foundation

**Objectives:** Single source of truth for Venue app; add schema for holds, offers, deals, and financials so later phases don’t require breaking migrations.

**Database (new migration: `database/migrations/venue-lifecycle-and-deals.sql`):**

- **Show status expansion**
  - Add `show_type` to `shows`: `'hold' | 'confirmed' | 'on_sale' | 'past'` (or keep `status` and extend enum: draft, hold, confirmed, on_sale, cancelled, completed).
  - Add `hold_rank` (integer, nullable) and `hold_auto_promote` (boolean, default false) for ranked holds.
  - Add `offer_id` (UUID, nullable, FK to `offers`) once `offers` exists.
- **Holds**
  - Ensure a “hold” is a show with `status = 'hold'` (or equivalent); optional `hold_rank` per stage/date.
- **Offers table**
  - `id`, `venue_id` (or `stage_id`?), `created_by`, `artist_name`, `proposed_date` (date), `stage_id` (nullable), `deal_structure` (e.g. guarantee, split, bonus), `line_items` (JSONB), `status` (`draft` | `sent` | `accepted` | `declined` | `expired`), `show_id` (nullable, set when accepted), `sent_at`, `expires_at`, `created_at`, `updated_at`.
  - RLS: same as shows (via venue/stage ownership).
- **Offer templates table**
  - `id`, `venue_id` or `venue_group_id`, `name`, `deal_structure`, `line_items_template` (JSONB), `created_at`, `updated_at`.
- **Inbound submissions table**
  - `id`, `venue_id` (or group_id for multi-venue), `submitted_at`, `artist_name`, `contact_email`, `contact_phone`, `requested_dates` (JSONB or array), `message`, `source` (e.g. form, email), `status` (`new` | `reviewed` | `converted` | `rejected`), `tags` (TEXT[]), `assigned_to` (user id), `created_at`, `updated_at`.
- **Settlement/financials on shows**
  - Add `guarantee` (numeric), `door_split_pct` (numeric), `ticket_sales_count`, `ticket_revenue`, `expenses` (JSONB), `settlement_notes` (text), `settlement_finalized_at` (timestamptz). Keep `payout_status`.
- **Assets table (optional in Phase 0 or Phase 6)**
  - `id`, `venue_id`, `show_id` (nullable), `name`, `type` (`rider` | `contract` | `poster` | `flyer` | `other`), `storage_path` or `url`, `uploaded_by`, `created_at`. RLS by venue/show access.

**API/Hooks:**

- Centralize show CRUD and list in ShowCheck: ensure `ShowCheck/lib/show-api.ts` and `show-mapping.ts` support new fields (show_type/hold_rank, offer_id, financial fields).
- Add `lib/offer-api.ts` (CRUD offers), `lib/offer-templates-api.ts`, `lib/inbound-api.ts` for submissions.
- Add `lib/use-offers.ts`, `lib/use-inbound.ts` for React Query or SWR-style hooks.

**UI:**

- No new user-facing screens in Phase 0; ensure existing Venue dashboard and ShowCheck still load and display shows with new columns (backfill defaults where needed).

**Acceptance:**

- Migration runs clean; existing Venue and ShowCheck pages still work; new tables and columns exist and are documented in this doc or `VENUE_CORPORATE_HIERARCHY.md`.

---

### Phase 1: Calendar & Lifecycle Parity

**Objectives:** Full calendar and list experience: holds, confirmed, on-sale, past; multi-venue/stage toggle; filter by status; optional calendar import.

**Database:**

- Already covered in Phase 0 (show_type/hold fields). Add index on `(venue_id, date, status)` and `(stage_id, date)` if not present.

**API/Hooks:**

- List shows with filters: `status` (hold, confirmed, on_sale, past), `stage_id`, `venue_id`, date range. Support “promote hold” (delete one hold, optionally auto-promote next by rank).
- Optional: `lib/calendar-import.ts` – parse CSV/ICS and create holds or shows (with conflict detection).

**UI (DAW-preserving):**

- **Calendar view:** Add a proper calendar component (e.g. month/week) in ShowCheck. Use `#0B0E14` and existing card styles; show hold vs confirmed vs on_sale with distinct subtle colors (e.g. amber for hold, green for confirmed).
- **List view:** Table or list of events with columns: Date, Stage, Artist, Status, Offer (link if `offer_id` set). Sort by date; filter by status (holds, confirms, on-sale, past).
- **Multi-venue/stage:** Use existing venue/stage switcher or HQ roll-up; when “view multiple” is needed, show a compact multi-column or grouped list (DAW density).
- **Hold management:** “Add hold” flow: date(s), stage, artist name, optional rank and auto-promote. List holds; “Convert to confirmed” creates/updates show and optionally links offer. “Remove hold” with optional auto-promote.
- **Import:** Settings or calendar page: “Import” → upload CSV or paste ICS URL / connect Google (OAuth later); map columns to date, name, stage; create holds or confirmed shows. Show conflicts clearly.

**Acceptance:**

- User can add holds, see them on calendar and list, filter by status, convert hold to confirmed, remove hold (with optional auto-promote). Calendar and list both usable; import works for at least CSV.

---

### Phase 2: Inbound Requests & Artist Context

**Objectives:** Inbound booking form (embed/link), submission queue with tag/filter/sort; “our artists” list (artists we’ve booked or offered) for quick attach to inbound or offers.

**Database:**

- `inbound_submissions` from Phase 0. Optional: `artists` table (minimal): `id`, `name`, `first_seen_venue_id`, `last_show_id`, `metadata` (JSONB for genre, etc.) – populated from our shows/offers only.

**API/Hooks:**

- `lib/inbound-api.ts`: create submission (public endpoint or form post), list/filter/update (tag, status, assign). `lib/use-inbound.ts`.
- Optional: `lib/artists-api.ts` – list artists derived from shows + offers; search by name.

**UI:**

- **Inbound form:** Public page (or embeddable widget) with fields: artist name, contact email/phone, requested dates, message. POST to Supabase or edge function; store in `inbound_submissions`. Option to “link to venue” or “link to group” so submissions land in right queue.
- **Inbound queue (Venue app):** New view “Inbound” in Venue: list of submissions; columns: Artist, Contact, Requested dates, Status, Tags, Assigned. Tag/filter/sort (DAW table); actions: “Create hold”, “Create offer”, “Mark reviewed”, “Reject”. Keep layout dense, `#0B0E14`.
- **Our artists:** Simple list or typeahead built from shows + offers (no external API yet). Use when creating offer or hold: “Artist” autocomplete from our artists + free text.

**Acceptance:**

- Form submissions appear in Inbound queue; user can tag, filter, sort, and convert to hold or offer. Artist autocomplete suggests past artists.

---

### Phase 3: Offers & Deal Pipeline

**Objectives:** Create/send/track offers; offer templates; deal dashboard; link offer → show on accept.

**Database:**

- `offers`, `offer_templates` from Phase 0. Ensure `shows.offer_id` and optional `offers.show_id` for bidirectional link.

**API/Hooks:**

- Full CRUD offers; list with filters (sent, confirmed, draft, declined). “Accept offer” → create or update show, set `offer_id`, set offer status to accepted. `lib/offer-api.ts`, `lib/use-offers.ts`, `lib/use-offer-templates.ts`.

**UI:**

- **Offer templates:** Venue settings or “Templates” section: create/edit template (name, deal structure, default line items). List templates; “Use template” when creating offer.
- **Create offer:** Form: artist, proposed date(s), stage, deal structure (guarantee / split / bonus), line items, optional estimated ticket sales. Save as draft or “Send” (send = mark sent, optional email integration later).
- **Deal dashboard:** New view “Offers” or “Deals”: list all offers with status (draft, sent, accepted, declined). Search; filter by status/date/venue. Click → offer detail; “Accept” → convert to show and show in calendar. DAW table + detail panel.
- **Show detail:** Show “Linked offer” if `offer_id` set; link through to offer.

**Acceptance:**

- User can create offer from template, send (status tracked), accept offer and create show; deal dashboard shows all offers and statuses.

---

### Phase 4: Advances

**Objectives:** Advance templates; shareable event/advance page (run-of-show, rider, house info) so artist teams get one link.

**Database:**

- Optional `advance_templates` table: `id`, `venue_id`, `name`, `sections` (JSONB – run of show, load-in, rider summary, etc.). Or reuse venue metadata for default advance content.
- `shows` already have run-of-show, rider, green room; add `advance_page_slug` (unique per show) or use `show_id` in URL for shareable page.

**API/Hooks:**

- Public route: `GET /venue/advance/:slug` or `/:showId` (read-only, no auth required if slug is secret) returning run-of-show, rider summary, venue address, contact. Optional: require short PIN or token.
- List advance templates; “Generate advance page” for a show (copy link).

**UI:**

- **Advance templates (Venue settings):** Edit default sections (run of show blocks, rider disclaimer, venue details). Save as template.
- **Per-show advance:** “Advance” tab or “Share advance” button: show preview of advance page; “Copy link”. Link opens public (or tokenized) page with DAW-style read-only view.
- **Event page:** Same content as advance; can be “Event page” for fans (optional, later) or just internal/artist share.

**Acceptance:**

- User can create advance template and generate shareable advance link for a show; opening link shows run-of-show and rider in a clean, readable layout.

---

### Phase 5: Settlements & Financials (P&L, Payment Tracker)

**Objectives:** Settlement calculation from offer + ticket data; one-click settlement view; P&L (forecast/estimate/actuals); payment tracker UI; optional PnL “thermometer” per show.

**Database:**

- Financial fields on `shows` from Phase 0. Optional `payments` table: `id`, `show_id`, `amount`, `type` (guarantee, bonus, settlement), `status` (pending, scheduled, paid), `due_date`, `paid_at`, `notes`, for full payment history.

**API/Hooks:**

- Compute settlement for a show: from `guarantee`, `door_split_pct`, `ticket_sales_count`, `ticket_revenue`, `expenses`. Expose as “settlement summary” (what’s owed to artist). Optional: `lib/settlement-calc.ts`.
- List payments (from `payments` or derived from shows); update payout_status and payment records.

**UI (DAW-preserving):**

- **Settlement view (per show):** In ShowCheck promoter portal or show detail: “Settlement” panel – offer terms, ticket sales (manual or from integration), expenses, **calculated amount owed**; “Finalize” button sets `settlement_finalized_at` and can set payout_status to scheduled/paid. Notes field. Match existing SettlementSidebar styling; make it the single place for “one-click settlement” after the show.
- **P&L per show:** Card or section: Forecast (from offer), Estimate (updated mid-cycle), Actuals (post-show). Three numbers + optional simple PnL thermometer (bar or gauge) – green when in the black, amber/red when not. Use existing card borders and `#0B0E14`.
- **Payment tracker:** New view “Payments” or tab under Venue: list of all shows with payout_status and due date; filter by pending/scheduled/paid; mark as paid and record date. Dense table.
- **Reports (basic):** Venue or group level: “This month’s settlements”, “Total paid vs pending”. Simple tables; export CSV optional.

**Acceptance:**

- Per-show settlement is calculable and visible; user can finalize and update payment status; P&L (forecast/estimate/actual) visible per show; payment tracker list is usable.

---

### Phase 6: Assets & Integrations

**Objectives:** Central asset storage (riders, contracts, posters); role-based access; calendar sync (Google, iCal); ticketing webhook or API for ticket counts/revenue.

**Database:**

- `venue_assets` (or `show_assets`) from Phase 0; RLS by venue/show access. Optional: `integrations` table (venue_id, provider, credentials_encrypted, last_sync) for OAuth tokens.

**API/Hooks:**

- Asset upload (Supabase Storage); record in `venue_assets`; link to venue and optionally show. List/filter by type (rider, contract, poster).
- Calendar sync: OAuth for Google Calendar; read events and create holds/shows (with conflict check); optional two-way. iCal feed URL: periodic fetch, same flow.
- Ticketing: webhook or polling API for “ticket sales” and “gross” per event; update `ticket_sales_count` and `ticket_revenue` on show. Document webhook payload or partner API.

**UI:**

- **Assets (Venue or Show):** “Assets” tab: upload rider, contract, poster; list with type and date; open/download. Permissions: only roles that can see financials can see contracts (or tag “confidential”).
- **Integrations (Venue settings):** “Calendar” – connect Google, or add iCal URL; “Ticketing” – connect provider or webhook URL. Show last sync time and “Sync now”. DAW-style settings panel.
- **Sign/Splits:** Ensure Venue show/offer data can drive Sign (contract generation) and Splits (door splits, guarantees). Document or add “Generate contract” and “View splits” links from show/offer.

**Acceptance:**

- User can upload and view assets per venue/show; calendar import from Google or iCal works; ticketing data (or manual entry) updates ticket counts and revenue; Sign/Splits are linked where applicable.

---

### Phase 7: Polish, Avails, Reporting & “Most Capable”

**Objectives:** Check avails (date range → copy for artist team); improved reporting; accessibility and performance; optional Insights-like or benchmark view.

**Features:**

- **Check avails:** Tool: select stage(s), date range, “Include holds” / “Include confirms” / “Only certain days”. Compute available dates; “Copy to clipboard” (formatted list or calendar snippet) to send to artist/agent. DAW-style modal or sidebar.
- **Reports:** Venue/group roll-up: revenue by month, settlements by status, top artists (by show count or revenue). Export CSV. Tables with same visual language as rest of app.
- **Accessibility:** Keyboard nav, focus states, ARIA where needed; contrast check on `#0B0E14` and gray borders.
- **Performance:** Lazy load calendar; paginate long lists (offers, inbound, payments); index DB for date/status filters.
- **Optional:** “Insights” or “Benchmarks” – opt-in aggregate stats (e.g. “Your venue’s sell-through by genre”) or internal-only analytics. No requirement to match Prism’s network data in v1.

**Acceptance:**

- Avails checker works and copy is useful; at least one roll-up report is available; no regression in DAW UX; key flows are keyboard-accessible.

---

## 4. File & Route Reference (ShowCheck-Centric)

Use this as the primary map; align `src/` Venue with ShowCheck where both exist.

| Area | ShowCheck path | Notes |
|------|----------------|-------|
| App shell | `ShowCheck/app/page.tsx`, `app/venue/layout.tsx` | Venue layout, HQ/v/[venueId]/[stageId] |
| Breadcrumb | `ShowCheck/components/venue-breadcrumb.tsx` | DAW breadcrumb |
| Dashboard | `ShowCheck/components/venue-admin-dashboard.tsx` | Main venue dashboard |
| Promoter portal | `ShowCheck/components/promoter-portal.tsx` | Event detail, run-of-show, settlement sidebar |
| Settlement | `ShowCheck/components/promoter/settlement-sidebar.tsx` | Extend for full settlement + P&L |
| Event creator | `ShowCheck/components/venue/event-creator.tsx` | Add hold flow; link to offer |
| Venue settings | `ShowCheck/components/venue/venue-details-settings.tsx` | Add templates, integrations, advance defaults |
| APIs | `ShowCheck/lib/show-api.ts`, `show-mapping.ts`, `venue-types.ts` | Add offer, inbound, settlement, assets |
| DB migrations | `database/migrations/` | New: `venue-lifecycle-and-deals.sql`; extend as needed |

Vite Venue app in `src/`: `src/pages/VenueApp.jsx`, `src/components/venue/VenueDashboard.jsx` – either migrate fully to ShowCheck routes or keep as wrapper that embeds ShowCheck; new features go into ShowCheck.

---

## 5. Success Criteria (Summary)

- **Prism parity:** Unified calendar (holds, confirms, on-sale, past), deal & payment tracking, financial reporting (P&L), settlements workflow, permissions, integrations (calendar, ticketing), optional Insights-like later.
- **OpenDate inspiration:** Inbound queue, artist context, offers with templates, advances and shareable advance page, settlement from offer + ticket data, PnL thermometer, assets, check avails.
- **DAW UX:** All new UI uses `#0B0E14`, existing borders/skeletons/breadcrumbs, dense layout, mono where appropriate.
- **Easiest to use:** Clear information hierarchy (HQ → Venue → Stage); one place for each task (calendar, deals, inbound, settlement, payments); minimal clicks to common actions (add hold, accept offer, finalize settlement, copy avails).

---

## 6. Order of Execution for Cursor

1. **Phase 0** – Write migration `venue-lifecycle-and-deals.sql`; add offer, inbound, financial columns and tables; extend ShowCheck types and APIs; verify existing app still works.
2. **Phase 1** – Calendar + list views; holds; filters; import (CSV minimum).
3. **Phase 2** – Inbound form + queue; “our artists” from shows/offers.
4. **Phase 3** – Offers + templates; deal dashboard; accept → show.
5. **Phase 4** – Advance templates; shareable advance page.
6. **Phase 5** – Settlement calc; P&L and thermometer; payment tracker; basic reports.
7. **Phase 6** – Assets; calendar and ticketing integrations; Sign/Splits links.
8. **Phase 7** – Avails checker; reporting polish; a11y and performance.

Each phase can be implemented in separate Cursor sessions; reference this document and the capability matrix to avoid regressions and keep DAW UX consistent.
