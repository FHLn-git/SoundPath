-- ============================================================================
-- Multi-Tier Subscription Logic and Capacity Limits for SoundPath
-- Run this script in Supabase SQL Editor to enable tier-based capacity limits
-- ============================================================================

-- ============================================================================
-- 1. ADD TIER COLUMN TO staff_members TABLE
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_members') THEN
    -- Add tier column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'staff_members' AND column_name = 'tier') THEN
      ALTER TABLE staff_members ADD COLUMN tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'agent', 'starter', 'pro'));
      COMMENT ON COLUMN staff_members.tier IS 'User subscription tier: free, agent, starter, pro';
      
      -- Set default tier for existing users
      UPDATE staff_members SET tier = 'free' WHERE tier IS NULL;
    END IF;
    
    -- Create index for tier lookups
    CREATE INDEX IF NOT EXISTS idx_staff_members_tier ON staff_members(tier);
  END IF;
END $$;

-- ============================================================================
-- 2. ENSURE organizations TABLE HAS owner_id
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    -- Add owner_id column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organizations' AND column_name = 'owner_id') THEN
      ALTER TABLE organizations ADD COLUMN owner_id TEXT REFERENCES staff_members(id) ON DELETE SET NULL;
      COMMENT ON COLUMN organizations.owner_id IS 'Reference to the staff member who owns this organization';
    END IF;
    
    -- Create index for owner lookups
    CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);
  END IF;
END $$;

-- ============================================================================
-- 3. FUNCTION: GET USER TIER
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_tier(user_id_param TEXT)
RETURNS TEXT AS $$
DECLARE
  user_tier TEXT;
BEGIN
  SELECT tier INTO user_tier
  FROM staff_members
  WHERE id = user_id_param
  LIMIT 1;
  
  RETURN COALESCE(user_tier, 'free');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_tier(TEXT) TO authenticated;

-- ============================================================================
-- 4. FUNCTION: GET OWNED LABELS COUNT
-- ============================================================================
CREATE OR REPLACE FUNCTION get_owned_labels_count(user_id_param TEXT)
RETURNS INTEGER AS $$
DECLARE
  owned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO owned_count
  FROM organizations
  WHERE owner_id = user_id_param;
  
  RETURN COALESCE(owned_count, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_owned_labels_count(TEXT) TO authenticated;

-- ============================================================================
-- 5. FUNCTION: GET STAFF MEMBERSHIPS COUNT (for Free tier limit)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_staff_memberships_count(user_id_param TEXT)
RETURNS INTEGER AS $$
DECLARE
  membership_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO membership_count
  FROM memberships
  WHERE user_id = user_id_param
    AND active = true
    AND role != 'Owner'; -- Count only non-owner memberships (staff positions)
  
  RETURN COALESCE(membership_count, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_staff_memberships_count(TEXT) TO authenticated;

-- ============================================================================
-- 6. FUNCTION: CHECK PERSONAL TRACKS CAPACITY
-- ============================================================================
CREATE OR REPLACE FUNCTION check_personal_tracks_capacity(user_id_param TEXT)
RETURNS JSONB AS $$
DECLARE
  user_tier TEXT;
  personal_tracks_count INTEGER;
  max_personal_tracks INTEGER;
  can_add BOOLEAN;
BEGIN
  -- Get user tier
  user_tier := get_user_tier(user_id_param);
  
  -- Count personal tracks (organization_id IS NULL AND recipient_user_id = user_id)
  SELECT COUNT(*) INTO personal_tracks_count
  FROM tracks
  WHERE recipient_user_id = user_id_param
    AND organization_id IS NULL
    AND archived = false;
  
  -- Set limits based on tier
  CASE user_tier
    WHEN 'free' THEN max_personal_tracks := 10;
    WHEN 'agent' THEN max_personal_tracks := 100;
    WHEN 'starter' THEN max_personal_tracks := 100;
    WHEN 'pro' THEN max_personal_tracks := 1000;
    ELSE max_personal_tracks := 10; -- Default to free tier
  END CASE;
  
  can_add := personal_tracks_count < max_personal_tracks;
  
  RETURN jsonb_build_object(
    'can_add', can_add,
    'current_count', personal_tracks_count,
    'max_count', max_personal_tracks,
    'tier', user_tier
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_personal_tracks_capacity(TEXT) TO authenticated;

-- ============================================================================
-- 7. FUNCTION: CHECK LABEL PIPELINE TRACKS CAPACITY
-- ============================================================================
CREATE OR REPLACE FUNCTION check_label_pipeline_capacity(user_id_param TEXT, org_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  user_tier TEXT;
  label_tracks_count INTEGER;
  max_label_tracks INTEGER;
  can_add BOOLEAN;
  is_owner BOOLEAN;
BEGIN
  -- Get user tier
  user_tier := get_user_tier(user_id_param);
  
  -- Check if user owns this organization
  SELECT EXISTS(
    SELECT 1 FROM organizations
    WHERE id = org_id_param
      AND owner_id = user_id_param
  ) INTO is_owner;
  
  -- Only check capacity if user owns the organization
  IF NOT is_owner THEN
    RETURN jsonb_build_object(
      'can_add', false,
      'error', 'User does not own this organization',
      'current_count', 0,
      'max_count', 0,
      'tier', user_tier
    );
  END IF;
  
  -- Count label tracks (organization_id = org_id_param)
  SELECT COUNT(*) INTO label_tracks_count
  FROM tracks
  WHERE organization_id = org_id_param
    AND archived = false;
  
  -- Set limits based on tier
  CASE user_tier
    WHEN 'free' THEN max_label_tracks := 10;
    WHEN 'agent' THEN max_label_tracks := 10;
    WHEN 'starter' THEN max_label_tracks := 100;
    WHEN 'pro' THEN max_label_tracks := 1000;
    ELSE max_label_tracks := 10; -- Default to free tier
  END CASE;
  
  can_add := label_tracks_count < max_label_tracks;
  
  RETURN jsonb_build_object(
    'can_add', can_add,
    'current_count', label_tracks_count,
    'max_count', max_label_tracks,
    'tier', user_tier
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_label_pipeline_capacity(TEXT, UUID) TO authenticated;

-- ============================================================================
-- 8. FUNCTION: CHECK TOTAL TRACKS CAPACITY (for FREE tier)
-- ============================================================================
CREATE OR REPLACE FUNCTION check_total_tracks_capacity(user_id_param TEXT)
RETURNS JSONB AS $$
DECLARE
  user_tier TEXT;
  personal_tracks_count INTEGER;
  owned_labels_tracks_count INTEGER;
  total_tracks_count INTEGER;
  max_total_tracks INTEGER;
  can_add BOOLEAN;
BEGIN
  -- Get user tier
  user_tier := get_user_tier(user_id_param);
  
  -- Only apply total limit for FREE tier
  IF user_tier != 'free' THEN
    RETURN jsonb_build_object(
      'can_add', true,
      'current_count', 0,
      'max_count', -1,
      'tier', user_tier,
      'note', 'Total limit only applies to free tier'
    );
  END IF;
  
  -- Count personal tracks
  SELECT COUNT(*) INTO personal_tracks_count
  FROM tracks
  WHERE recipient_user_id = user_id_param
    AND organization_id IS NULL
    AND archived = false;
  
  -- Count tracks in owned labels
  SELECT COUNT(*) INTO owned_labels_tracks_count
  FROM tracks t
  JOIN organizations o ON o.id = t.organization_id
  WHERE o.owner_id = user_id_param
    AND t.archived = false;
  
  total_tracks_count := personal_tracks_count + owned_labels_tracks_count;
  max_total_tracks := 10; -- FREE tier limit
  
  can_add := total_tracks_count < max_total_tracks;
  
  RETURN jsonb_build_object(
    'can_add', can_add,
    'current_count', total_tracks_count,
    'max_count', max_total_tracks,
    'tier', user_tier,
    'personal_count', personal_tracks_count,
    'label_count', owned_labels_tracks_count
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_total_tracks_capacity(TEXT) TO authenticated;

-- ============================================================================
-- 9. FUNCTION: CHECK IF USER CAN CREATE LABEL
-- ============================================================================
CREATE OR REPLACE FUNCTION can_create_label(user_id_param TEXT)
RETURNS JSONB AS $$
DECLARE
  user_tier TEXT;
  owned_count INTEGER;
  max_labels INTEGER;
  can_create BOOLEAN;
BEGIN
  -- Get user tier
  user_tier := get_user_tier(user_id_param);
  
  -- Get owned labels count
  owned_count := get_owned_labels_count(user_id_param);
  
  -- Set limits based on tier
  CASE user_tier
    WHEN 'free' THEN max_labels := 1;
    WHEN 'agent' THEN max_labels := 1;
    WHEN 'starter' THEN max_labels := 2;
    WHEN 'pro' THEN max_labels := 5;
    ELSE max_labels := 1; -- Default to free tier
  END CASE;
  
  can_create := owned_count < max_labels;
  
  RETURN jsonb_build_object(
    'can_create', can_create,
    'current_count', owned_count,
    'max_count', max_labels,
    'tier', user_tier
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION can_create_label(TEXT) TO authenticated;

-- ============================================================================
-- 10. FUNCTION: CHECK IF USER CAN ACCEPT STAFF INVITATION
-- ============================================================================
CREATE OR REPLACE FUNCTION can_accept_staff_invitation(user_id_param TEXT)
RETURNS JSONB AS $$
DECLARE
  user_tier TEXT;
  staff_memberships_count INTEGER;
  max_staff_memberships INTEGER;
  can_accept BOOLEAN;
BEGIN
  -- Get user tier
  user_tier := get_user_tier(user_id_param);
  
  -- Only check for FREE tier
  IF user_tier != 'free' THEN
    RETURN jsonb_build_object(
      'can_accept', true,
      'current_count', 0,
      'max_count', -1,
      'tier', user_tier,
      'note', 'Staff limit only applies to free tier'
    );
  END IF;
  
  -- Get staff memberships count (non-owner)
  staff_memberships_count := get_staff_memberships_count(user_id_param);
  max_staff_memberships := 3; -- FREE tier limit
  
  can_accept := staff_memberships_count < max_staff_memberships;
  
  RETURN jsonb_build_object(
    'can_accept', can_accept,
    'current_count', staff_memberships_count,
    'max_count', max_staff_memberships,
    'tier', user_tier
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION can_accept_staff_invitation(TEXT) TO authenticated;

-- ============================================================================
-- 11. FUNCTION: COMPREHENSIVE CAPACITY CHECK (for track creation/promotion)
-- ============================================================================
CREATE OR REPLACE FUNCTION check_track_capacity(
  user_id_param TEXT,
  org_id_param UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  user_tier TEXT;
  result JSONB;
  personal_check JSONB;
  label_check JSONB;
  total_check JSONB;
BEGIN
  -- Get user tier
  user_tier := get_user_tier(user_id_param);
  
  -- If org_id is NULL, check personal capacity
  IF org_id_param IS NULL THEN
    -- For FREE tier, check total capacity
    IF user_tier = 'free' THEN
      total_check := check_total_tracks_capacity(user_id_param);
      RETURN total_check;
    ELSE
      -- For other tiers, check personal capacity
      personal_check := check_personal_tracks_capacity(user_id_param);
      RETURN personal_check;
    END IF;
  ELSE
    -- Check label pipeline capacity
    label_check := check_label_pipeline_capacity(user_id_param, org_id_param);
    RETURN label_check;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_track_capacity(TEXT, UUID) TO authenticated;

-- ============================================================================
-- VERIFY MIGRATION
-- ============================================================================
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_members' AND column_name = 'tier')
    THEN '✅ tier column exists'
    ELSE '❌ tier column NOT found'
  END as tier_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'owner_id')
    THEN '✅ owner_id column exists'
    ELSE '❌ owner_id column NOT found'
  END as owner_id_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_track_capacity')
    THEN '✅ check_track_capacity function exists'
    ELSE '❌ check_track_capacity function NOT found'
  END as function_check;
