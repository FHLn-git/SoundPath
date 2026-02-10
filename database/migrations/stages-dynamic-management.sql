-- ============================================================================
-- Dynamic Multi-Stage Management for SoundPath VENUE
-- Run after: venue-corporate-hierarchy.sql (stages table exists)
-- ============================================================================
-- Extends stages with: legal_capacity, comfort_capacity, audio_specs,
-- lighting_specs, bar_count, is_default. RLS already allows venue owners
-- and venue_manager/group_admin to manage stages.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stages' AND column_name = 'legal_capacity') THEN
    ALTER TABLE stages ADD COLUMN legal_capacity INTEGER;
    COMMENT ON COLUMN stages.legal_capacity IS 'Fire/legal capacity limit';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stages' AND column_name = 'comfort_capacity') THEN
    ALTER TABLE stages ADD COLUMN comfort_capacity INTEGER;
    COMMENT ON COLUMN stages.comfort_capacity IS 'Comfortable operating capacity';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stages' AND column_name = 'audio_specs') THEN
    ALTER TABLE stages ADD COLUMN audio_specs JSONB DEFAULT '{}'::jsonb;
    COMMENT ON COLUMN stages.audio_specs IS 'Sound console, PA specs, technical rider (audio)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stages' AND column_name = 'lighting_specs') THEN
    ALTER TABLE stages ADD COLUMN lighting_specs JSONB DEFAULT '{}'::jsonb;
    COMMENT ON COLUMN stages.lighting_specs IS 'Lighting rig, specs (technical rider)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stages' AND column_name = 'bar_count') THEN
    ALTER TABLE stages ADD COLUMN bar_count INTEGER DEFAULT 0;
    COMMENT ON COLUMN stages.bar_count IS 'Number of bars at this stage';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stages' AND column_name = 'is_default') THEN
    ALTER TABLE stages ADD COLUMN is_default BOOLEAN DEFAULT false;
    COMMENT ON COLUMN stages.is_default IS 'Default stage for this venue (e.g. Main Stage)';
  END IF;
END $$;

-- Ensure at most one default stage per venue
CREATE UNIQUE INDEX IF NOT EXISTS idx_stages_venue_default ON stages(venue_id) WHERE is_default = true;
