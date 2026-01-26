-- Migration: Add granular permissions to staff_members table
-- Run this script in Supabase SQL Editor to add permission columns

-- Add permission columns to staff_members table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_members') THEN
    -- Evaluation Permissions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'staff_members' AND column_name = 'can_vote') THEN
      ALTER TABLE staff_members ADD COLUMN can_vote BOOLEAN DEFAULT true;
      COMMENT ON COLUMN staff_members.can_vote IS 'Ability to Like/Dislike tracks';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'staff_members' AND column_name = 'can_set_energy') THEN
      ALTER TABLE staff_members ADD COLUMN can_set_energy BOOLEAN DEFAULT true;
      COMMENT ON COLUMN staff_members.can_set_energy IS 'Ability to set 1-5 energy levels';
    END IF;

    -- Advancement Permissions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'staff_members' AND column_name = 'can_advance_lobby') THEN
      ALTER TABLE staff_members ADD COLUMN can_advance_lobby BOOLEAN DEFAULT true;
      COMMENT ON COLUMN staff_members.can_advance_lobby IS 'Permission to move tracks from Inbox to Second Listen';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'staff_members' AND column_name = 'can_advance_office') THEN
      ALTER TABLE staff_members ADD COLUMN can_advance_office BOOLEAN DEFAULT false;
      COMMENT ON COLUMN staff_members.can_advance_office IS 'Permission to move tracks from Second Listen to The Office';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'staff_members' AND column_name = 'can_advance_contract') THEN
      ALTER TABLE staff_members ADD COLUMN can_advance_contract BOOLEAN DEFAULT false;
      COMMENT ON COLUMN staff_members.can_advance_contract IS 'Permission to move tracks from The Office to Contracting';
    END IF;

    -- Access Permissions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'staff_members' AND column_name = 'can_access_archive') THEN
      ALTER TABLE staff_members ADD COLUMN can_access_archive BOOLEAN DEFAULT true;
      COMMENT ON COLUMN staff_members.can_access_archive IS 'Permission to view the Rejection Archive';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'staff_members' AND column_name = 'can_access_vault') THEN
      ALTER TABLE staff_members ADD COLUMN can_access_vault BOOLEAN DEFAULT true;
      COMMENT ON COLUMN staff_members.can_access_vault IS 'Permission to view released tracks in The Vault';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'staff_members' AND column_name = 'can_edit_release_date') THEN
      ALTER TABLE staff_members ADD COLUMN can_edit_release_date BOOLEAN DEFAULT false;
      COMMENT ON COLUMN staff_members.can_edit_release_date IS 'Permission to change calendar/scheduling data';
    END IF;

    -- View Sensitive Metrics (Enterprise Feature)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'staff_members' AND column_name = 'can_view_metrics') THEN
      ALTER TABLE staff_members ADD COLUMN can_view_metrics BOOLEAN DEFAULT false;
      COMMENT ON COLUMN staff_members.can_view_metrics IS 'Allows user to see ROI, Hit Rates, and advanced data aggregations';
    END IF;

    -- Set default permissions based on role
    UPDATE staff_members 
    SET 
      can_advance_office = CASE WHEN role IN ('Owner', 'Manager') THEN true ELSE false END,
      can_advance_contract = CASE WHEN role IN ('Owner', 'Manager') THEN true ELSE false END,
      can_edit_release_date = CASE WHEN role = 'Owner' THEN true ELSE false END,
      can_view_metrics = CASE WHEN role IN ('Owner', 'Manager') THEN true ELSE false END
    WHERE can_advance_office IS NULL OR can_advance_contract IS NULL OR can_edit_release_date IS NULL OR can_view_metrics IS NULL;
  END IF;
END $$;

-- Verify columns were added
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_members' AND column_name = 'can_vote')
    THEN '✅ can_vote column added'
    ELSE '❌ can_vote column NOT found'
  END as can_vote_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_members' AND column_name = 'can_set_energy')
    THEN '✅ can_set_energy column added'
    ELSE '❌ can_set_energy column NOT found'
  END as can_set_energy_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_members' AND column_name = 'can_advance_lobby')
    THEN '✅ can_advance_lobby column added'
    ELSE '❌ can_advance_lobby column NOT found'
  END as can_advance_lobby_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_members' AND column_name = 'can_advance_office')
    THEN '✅ can_advance_office column added'
    ELSE '❌ can_advance_office column NOT found'
  END as can_advance_office_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_members' AND column_name = 'can_advance_contract')
    THEN '✅ can_advance_contract column added'
    ELSE '❌ can_advance_contract column NOT found'
  END as can_advance_contract_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_members' AND column_name = 'can_access_archive')
    THEN '✅ can_access_archive column added'
    ELSE '❌ can_access_archive column NOT found'
  END as can_access_archive_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_members' AND column_name = 'can_access_vault')
    THEN '✅ can_access_vault column added'
    ELSE '❌ can_access_vault column NOT found'
  END as can_access_vault_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_members' AND column_name = 'can_edit_release_date')
    THEN '✅ can_edit_release_date column added'
    ELSE '❌ can_edit_release_date column NOT found'
  END as can_edit_release_date_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_members' AND column_name = 'can_view_metrics')
    THEN '✅ can_view_metrics column added'
    ELSE '❌ can_view_metrics column NOT found'
  END as can_view_metrics_check;

-- ============================================================================
-- RLS POLICIES FOR PERMISSION ENFORCEMENT
-- ============================================================================

-- Function to check if user has permission to vote
CREATE OR REPLACE FUNCTION check_can_vote()
RETURNS BOOLEAN AS $$
DECLARE
  staff_record RECORD;
BEGIN
  SELECT can_vote INTO staff_record
  FROM staff_members
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  RETURN COALESCE(staff_record.can_vote, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can set energy
CREATE OR REPLACE FUNCTION check_can_set_energy()
RETURNS BOOLEAN AS $$
DECLARE
  staff_record RECORD;
BEGIN
  SELECT can_set_energy INTO staff_record
  FROM staff_members
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  RETURN COALESCE(staff_record.can_set_energy, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check advancement permissions
CREATE OR REPLACE FUNCTION check_can_advance(from_phase TEXT, to_phase TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  staff_record RECORD;
BEGIN
  SELECT 
    can_advance_lobby, 
    can_advance_office, 
    can_advance_contract
  INTO staff_record
  FROM staff_members
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check specific advancement permissions based on phase transition
  IF from_phase = 'inbox' AND to_phase = 'second-listen' THEN
    RETURN COALESCE(staff_record.can_advance_lobby, true);
  ELSIF from_phase = 'second-listen' AND to_phase = 'team-review' THEN
    RETURN COALESCE(staff_record.can_advance_office, false);
  ELSIF from_phase = 'team-review' AND to_phase = 'contracting' THEN
    RETURN COALESCE(staff_record.can_advance_contract, false);
  ELSIF from_phase = 'contracting' AND to_phase = 'upcoming' THEN
    RETURN COALESCE(staff_record.can_advance_contract, false);
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_can_vote() TO authenticated;
GRANT EXECUTE ON FUNCTION check_can_set_energy() TO authenticated;
GRANT EXECUTE ON FUNCTION check_can_advance(TEXT, TEXT) TO authenticated;

-- Note: These functions can be called in triggers or application logic
-- to enforce permissions at the database level
