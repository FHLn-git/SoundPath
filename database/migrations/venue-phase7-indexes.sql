-- ============================================================================
-- Phase 7: Optional indexes for venue list/report performance
-- Run after: venue-lifecycle-and-deals, venue-assets-and-integrations-phase6
-- ============================================================================
-- Composite indexes for common filters: list offers by venue+date, inbound by venue+submitted_at.
-- shows(venue_id, date, status) already exists from Phase 0.
-- ============================================================================

-- Offers: list by venue ordered by proposed_date (listOffers)
CREATE INDEX IF NOT EXISTS idx_offers_venue_proposed_date
  ON offers(venue_id, proposed_date DESC);

-- Inbound: list by venue ordered by submitted_at (listInbound)
CREATE INDEX IF NOT EXISTS idx_inbound_submissions_venue_submitted
  ON inbound_submissions(venue_id, submitted_at DESC)
  WHERE venue_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inbound_submissions_group_submitted
  ON inbound_submissions(group_id, submitted_at DESC)
  WHERE group_id IS NOT NULL;
