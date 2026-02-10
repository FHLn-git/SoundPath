-- ============================================================================
-- Phase 2: Allow anonymous INSERT into inbound_submissions for public form
-- Run after: venue-lifecycle-and-deals.sql
-- ============================================================================
-- Venue shares a link like /inbound/<venue_id>; artist submits without signing in.
-- Only INSERT is allowed for anon; SELECT/UPDATE/DELETE remain venue/group-owner only.
-- ============================================================================

CREATE POLICY "Anon can insert inbound with venue or group"
  ON inbound_submissions FOR INSERT
  TO anon
  WITH CHECK (
    (venue_id IS NOT NULL AND group_id IS NULL) OR (venue_id IS NULL AND group_id IS NOT NULL)
  );

COMMENT ON POLICY "Anon can insert inbound with venue or group" ON inbound_submissions IS 'Phase 2: public booking request form; venue_id/group_id from shared link';
