-- Migration: Refactor permissions to separate viewing from metrics
-- Run this script in Supabase SQL Editor to rename master_view to can_view_metrics

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_members') THEN
    -- Rename master_view to can_view_metrics
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'staff_members' AND column_name = 'master_view') THEN
      ALTER TABLE staff_members RENAME COLUMN master_view TO can_view_metrics;
      COMMENT ON COLUMN staff_members.can_view_metrics IS 'Allows user to see ROI, Hit Rates, and advanced data aggregations';
    END IF;

    -- Add can_view_metrics if it doesn't exist (for new installations)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'staff_members' AND column_name = 'can_view_metrics') THEN
      ALTER TABLE staff_members ADD COLUMN can_view_metrics BOOLEAN DEFAULT false;
      COMMENT ON COLUMN staff_members.can_view_metrics IS 'Allows user to see ROI, Hit Rates, and advanced data aggregations';
      
      -- Set default: Owners and Managers can view metrics
      UPDATE staff_members 
      SET can_view_metrics = CASE WHEN role IN ('Owner', 'Manager') THEN true ELSE false END
      WHERE can_view_metrics IS NULL;
    END IF;

    -- Ensure all staff can view all phases by default (no column needed, just ensure no restrictions exist)
    -- Viewing is now unrestricted - all staff can see all phases
  END IF;
END $$;

-- Verify column was renamed/added
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_members' AND column_name = 'can_view_metrics')
    THEN '✅ can_view_metrics column exists'
    ELSE '❌ can_view_metrics column NOT found'
  END as can_view_metrics_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_members' AND column_name = 'master_view')
    THEN '⚠️ master_view column still exists (should be renamed)'
    ELSE '✅ master_view column renamed successfully'
  END as master_view_check;
