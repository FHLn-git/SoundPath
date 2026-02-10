-- ============================================================================
-- Template-Based Visual Scheduling & Show Advance
-- Run after: venue-corporate-hierarchy, stages-dynamic-management, venue-lifecycle-and-deals
-- ============================================================================
-- Stages: default_operating_hours (weekly schedule), default_show_costs (Staffing, Tech, Cleaning).
-- Shows: extend status for OPEN, HOLD_1, HOLD_2, CHALLENGED, CONFIRMED.
-- ============================================================================

-- ============================================================================
-- 1. STAGES: operating hours and default show costs
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stages' AND column_name = 'default_operating_hours') THEN
    ALTER TABLE stages ADD COLUMN default_operating_hours JSONB DEFAULT '{}'::jsonb;
    COMMENT ON COLUMN stages.default_operating_hours IS 'Weekly schedule: e.g. {"mon":null,"tue":null,"wed":["19:00","01:00"],"thu":["19:00","01:00"],"fri":["18:00","02:00"],"sat":["18:00","02:00"],"sun":null} (null = closed, [start,end] = open)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stages' AND column_name = 'default_show_costs') THEN
    ALTER TABLE stages ADD COLUMN default_show_costs JSONB DEFAULT '{}'::jsonb;
    COMMENT ON COLUMN stages.default_show_costs IS 'Default costs for shows on this stage: e.g. {"staffing":500,"tech":300,"cleaning":150}';
  END IF;
END $$;

-- ============================================================================
-- 2. SHOWS: extend status for OPEN, HOLD_1, HOLD_2, CHALLENGED, CONFIRMED
-- ============================================================================
DO $$
BEGIN
  ALTER TABLE shows DROP CONSTRAINT IF EXISTS shows_status_check;
  ALTER TABLE shows ADD CONSTRAINT shows_status_check CHECK (status IN (
    'draft', 'open', 'hold', 'hold_1', 'hold_2', 'challenged', 'confirmed',
    'pending-approval', 'on_sale', 'cancelled', 'completed'
  ));
END $$;

COMMENT ON COLUMN shows.status IS 'open=available slot; hold_1/hold_2=ranked holds; challenged=disputed; confirmed=booked; plus draft, on_sale, cancelled, completed';
