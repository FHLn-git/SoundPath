# Venue Phase 6: Assets, Integrations & Ecosystem Links

Phase 6 adds **assets**, **integrations**, and **Sign/Splits** links so Venue fits into the full SoundPath SaaS ecosystem.

## Assets

- **Storage:** Supabase Storage bucket `venue-assets` (private). Path: `{venue_id}/{asset_id}/{filename}`.
- **Table:** `venue_assets` (venue_id, show_id optional, name, type, storage_path, url, confidential, uploaded_by).
- **Types:** rider, contract, poster, flyer, other. Contracts are confidential by default (visible only to roles with financial access).
- **UI:** Settings → “Assets & files” (venue-level list + upload). Event detail → “Assets” card (show-scoped list + upload).
- **Ecosystem:** Same asset pattern can be reused for Label/Artist (e.g. contract storage, rider links). Vault can later link to venue assets if needed.

## Integrations

- **Table:** `venue_integrations` (venue_id, provider, config JSONB, last_sync_at, status). Unique on (venue_id, provider).
- **Providers:** `ical`, `google_calendar`, `ticketing_webhook`.
- **iCal:** Config `ical_url`. “Check feed” verifies the URL returns a valid iCal; calendar import (creating holds/shows from events) can be wired separately.
- **Ticketing webhook:** Config `webhook_secret`. API: `POST /api/venue/ticketing-webhook?venue_id=...` with body `{ show_id, ticket_sales_count?, ticket_revenue? }`. Optional header `X-Webhook-Signature` (HMAC-SHA256 of body with `webhook_secret`). Updates `shows.ticket_sales_count` and `shows.ticket_revenue` for settlement and P&L.
- **Ecosystem:** Same integrations pattern (entity_type + entity_id) can be extended for Label (e.g. calendar sync, distribution webhooks).

## Sign & Splits Links

Venue passes **context** to the utility apps so they can pre-fill or scope to the same show/offer.

- **From event (show) detail:**  
  - “Generate contract (Sign)” → `/products/sign?context=venue&show_id={id}&offer_id={id}` (offer_id if linked).  
  - “View splits” → `/products/splits?context=venue&show_id={id}`.
- **From offer detail:**  
  - “Generate contract (Sign)” → `/products/sign?context=venue&offer_id={id}&show_id={id}` (show_id if accepted).  
  - “View splits” → `/products/splits?context=venue&offer_id={id}&show_id={id}`.

When Sign and Splits apps are built, they should:

- Read `context=venue`, `show_id`, `offer_id` from the URL.
- Fetch show/offer data (guarantee, door split, line items, etc.) and use it for contract generation (Sign) or split/royalty views (Splits).
- Keep one source of truth: Venue owns show/offer; Sign/Splits consume and link back where needed.

## Files Touched (Summary)

- **DB:** `database/migrations/venue-assets-and-integrations-phase6.sql`
- **APIs:** `ShowCheck/lib/assets-api.ts`, `ShowCheck/lib/integrations-api.ts`, `ShowCheck/lib/use-assets.ts`
- **UI:** `VenueAssetsCard`, `VenueIntegrationsCard`; Settings tab; `MasterEventView` (assets + Sign/Splits); `OfferDetail` (Sign/Splits)
- **Webhook:** `ShowCheck/app/api/venue/ticketing-webhook/route.ts`
- **Types:** `ShowCheck/lib/venue-types.ts` (VenueAssetRow.confidential, VenueIntegrationRow, VenueIntegrationProvider)
