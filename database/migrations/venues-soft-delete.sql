-- ============================================================================
-- Venues: soft delete (SoundPath retains data)
-- Run after venues-and-shows-schema.sql. "Delete" sets deleted_at; SELECT
-- excludes deleted venues so they disappear from the app but remain in DB.
-- ============================================================================

ALTER TABLE venues ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_venues_deleted_at ON venues(deleted_at) WHERE deleted_at IS NOT NULL;
COMMENT ON COLUMN venues.deleted_at IS 'When set, venue is archived; excluded from normal SELECT so app no longer shows it. Data retained for SoundPath.';

-- RLS: only show venues where deleted_at IS NULL
DROP POLICY IF EXISTS "Users can view own venues" ON venues;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'can_see_venue') THEN
    CREATE POLICY "Users can view own venues" ON venues FOR SELECT
      USING (deleted_at IS NULL AND can_see_venue(venues.id));
  ELSE
    CREATE POLICY "Users can view own venues" ON venues FOR SELECT
      USING (deleted_at IS NULL AND owner_id = auth.uid());
  END IF;
END $$;

-- Allow update so we can set deleted_at (soft delete)
-- (Existing update policy may already allow owner; if not, ensure owner can set deleted_at)
-- No change needed if "Users can update own venues" exists and allows owner_id = auth.uid().
