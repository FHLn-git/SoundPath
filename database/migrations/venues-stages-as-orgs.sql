-- ============================================================================
-- Venue Stages as Child Organizations (ShowCheck Multi-Stage View)
-- Run after organization-hierarchy.sql and venues-and-shows-schema.sql
-- ============================================================================
-- Stages are child organizations of a Venue's organization. Shows can be
-- assigned to a stage (stage_organization_id). Multi-stage view shows all
-- shows for the venue (main + all stage orgs).
-- ============================================================================

-- Add stage_organization_id to shows (nullable: null = main venue, set = that stage)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shows' AND column_name = 'stage_organization_id'
  ) THEN
    ALTER TABLE shows
      ADD COLUMN stage_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_shows_stage_organization_id ON shows(stage_organization_id);
    COMMENT ON COLUMN shows.stage_organization_id IS 'When set, show is for this stage (child org of venue org). Null = main venue.';
  END IF;
END $$;
