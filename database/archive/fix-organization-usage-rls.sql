-- ============================================================================
-- Fix RLS Policy for organization_usage table
-- ============================================================================
-- Problem: When creating a new organization, triggers try to insert into
-- organization_usage, but RLS policies block it because:
-- 1. Trigger functions are not SECURITY DEFINER
-- 2. RLS policy only allows SELECT, not INSERT/UPDATE
--
-- Solution: Make trigger functions SECURITY DEFINER and add INSERT/UPDATE policies
-- ============================================================================

-- ============================================================================
-- 1. UPDATE TRIGGER FUNCTIONS TO BE SECURITY DEFINER
-- ============================================================================

-- Function to update tracks count (make it SECURITY DEFINER)
CREATE OR REPLACE FUNCTION update_tracks_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO organization_usage (organization_id, tracks_count)
    VALUES (NEW.organization_id, 1)
    ON CONFLICT (organization_id) DO UPDATE
    SET tracks_count = organization_usage.tracks_count + 1,
        updated_at = NOW();
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE organization_usage
    SET tracks_count = GREATEST(0, tracks_count - 1),
        updated_at = NOW()
    WHERE organization_id = OLD.organization_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update staff count (make it SECURITY DEFINER)
CREATE OR REPLACE FUNCTION update_staff_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Only count active memberships
    IF NEW.active = true THEN
      INSERT INTO organization_usage (organization_id, staff_count)
      VALUES (NEW.organization_id, 1)
      ON CONFLICT (organization_id) DO UPDATE
      SET staff_count = organization_usage.staff_count + 1,
          updated_at = NOW();
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Only decrement if the deleted membership was active
    IF OLD.active = true THEN
      UPDATE organization_usage
      SET staff_count = GREATEST(0, staff_count - 1),
          updated_at = NOW()
      WHERE organization_id = OLD.organization_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes (active -> inactive or inactive -> active)
    IF OLD.active = true AND NEW.active = false THEN
      -- Membership deactivated, decrement count
      UPDATE organization_usage
      SET staff_count = GREATEST(0, staff_count - 1),
          updated_at = NOW()
      WHERE organization_id = NEW.organization_id;
    ELSIF OLD.active = false AND NEW.active = true THEN
      -- Membership activated, increment count
      INSERT INTO organization_usage (organization_id, staff_count)
      VALUES (NEW.organization_id, 1)
      ON CONFLICT (organization_id) DO UPDATE
      SET staff_count = organization_usage.staff_count + 1,
          updated_at = NOW();
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. ADD INSERT/UPDATE POLICIES FOR organization_usage
-- ============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Organizations can view their own usage" ON organization_usage;

-- Add SELECT policy (users can view their own organization's usage)
-- Agent-Centric: Use memberships table to check access
CREATE POLICY "Organizations can view their own usage" ON organization_usage
  FOR SELECT
  USING (
    is_system_admin()
    OR organization_id = ANY(
      SELECT organization_id 
      FROM memberships 
      WHERE user_id = (
        SELECT id FROM staff_members WHERE auth_user_id = auth.uid()
      )
      AND active = true
    )
  );

-- Add INSERT policy (allows triggers to insert via SECURITY DEFINER functions)
-- Note: SECURITY DEFINER functions bypass RLS, but this policy allows direct user inserts
-- if they have membership (though users shouldn't directly insert)
CREATE POLICY "Organizations can insert their own usage" ON organization_usage
  FOR INSERT
  WITH CHECK (
    is_system_admin()
    OR organization_id = ANY(
      SELECT organization_id 
      FROM memberships 
      WHERE user_id = (
        SELECT id FROM staff_members WHERE auth_user_id = auth.uid()
      )
      AND active = true
    )
  );

-- Add UPDATE policy (allows triggers to update via SECURITY DEFINER functions)
-- Note: SECURITY DEFINER functions bypass RLS, but this policy allows direct user updates
-- if they have membership (though users shouldn't directly update)
CREATE POLICY "Organizations can update their own usage" ON organization_usage
  FOR UPDATE
  USING (
    is_system_admin()
    OR organization_id = ANY(
      SELECT organization_id 
      FROM memberships 
      WHERE user_id = (
        SELECT id FROM staff_members WHERE auth_user_id = auth.uid()
      )
      AND active = true
    )
  );

-- ============================================================================
-- 3. INITIALIZE USAGE FOR ORGANIZATIONS THAT DON'T HAVE IT YET
-- ============================================================================

-- Initialize usage counts for existing organizations that don't have a record
INSERT INTO organization_usage (organization_id, tracks_count, staff_count)
SELECT 
  o.id,
  COALESCE((SELECT COUNT(*) FROM tracks WHERE organization_id = o.id), 0),
  COALESCE((SELECT COUNT(*) FROM memberships WHERE organization_id = o.id AND active = true), 0)
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM organization_usage ou WHERE ou.organization_id = o.id
)
ON CONFLICT (organization_id) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this script:
-- 1. Try creating a new organization
-- 2. Verify that organization_usage record is created automatically
-- 3. Check that triggers work when adding tracks or memberships
-- ============================================================================
