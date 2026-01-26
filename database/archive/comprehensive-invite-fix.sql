-- ============================================================================
-- Comprehensive Invite System Fix
-- ============================================================================
-- This script fixes all potential issues with invite visibility:
-- 1. Case-insensitive RLS policy
-- 2. Removes duplicate/conflicting policies
-- 3. Ensures proper policy configuration
-- ============================================================================

-- ============================================================================
-- 1. DROP ALL EXISTING INVITE POLICIES (to avoid conflicts)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their invites" ON invites;
DROP POLICY IF EXISTS "Owners can view organization invites" ON invites;
DROP POLICY IF EXISTS "Managers can view organization invites" ON invites;
DROP POLICY IF EXISTS "Owners can create invites" ON invites;
DROP POLICY IF EXISTS "Owners can update invites" ON invites;
DROP POLICY IF EXISTS "SystemAdmin can manage all invites" ON invites;
DROP POLICY IF EXISTS "Public can view invite by token" ON invites;

-- ============================================================================
-- 2. CREATE HELPER FUNCTION TO GET USER EMAIL (SECURITY DEFINER)
-- ============================================================================

-- Function to get current user's email (bypasses RLS to access auth.users)
CREATE OR REPLACE FUNCTION get_user_email()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 3. CREATE CASE-INSENSITIVE POLICY FOR USERS TO VIEW THEIR INVITES
-- ============================================================================

-- Users can view invites sent to their email address (case-insensitive)
CREATE POLICY "Users can view their invites" ON invites
  FOR SELECT
  USING (
    LOWER(TRIM(invites.email)) = LOWER(TRIM(get_user_email()))
  );

-- ============================================================================
-- 3. CREATE HELPER FUNCTIONS (to avoid RLS recursion)
-- ============================================================================

-- Function to check if user is Owner of an organization (bypasses RLS)
CREATE OR REPLACE FUNCTION is_owner_of_org(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM memberships m
    JOIN staff_members sm ON sm.id = m.user_id
    WHERE sm.auth_user_id = auth.uid()
      AND m.organization_id = org_id
      AND m.role = 'Owner'
      AND m.active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user is Owner or Manager of an organization (bypasses RLS)
CREATE OR REPLACE FUNCTION is_owner_or_manager_of_org(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM memberships m
    JOIN staff_members sm ON sm.id = m.user_id
    WHERE sm.auth_user_id = auth.uid()
      AND m.organization_id = org_id
      AND m.role IN ('Owner', 'Manager')
      AND m.active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 5. CREATE POLICIES FOR OWNERS/MANAGERS TO VIEW ORGANIZATION INVITES
-- ============================================================================

-- Owners can view invites for their organization
CREATE POLICY "Owners can view organization invites" ON invites
  FOR SELECT
  USING (is_owner_of_org(organization_id));

-- Managers can also view invites for their organization (for transparency)
CREATE POLICY "Managers can view organization invites" ON invites
  FOR SELECT
  USING (is_owner_or_manager_of_org(organization_id));

-- ============================================================================
-- 5. CREATE POLICIES FOR OWNERS TO MANAGE INVITES
-- ============================================================================

-- Owners can create invites for their organization
CREATE POLICY "Owners can create invites" ON invites
  FOR INSERT
  WITH CHECK (is_owner_of_org(organization_id));

-- Owners can update invites for their organization (resend, cancel, etc.)
CREATE POLICY "Owners can update invites" ON invites
  FOR UPDATE
  USING (is_owner_of_org(organization_id));

-- ============================================================================
-- 7. SYSTEM ADMIN POLICY
-- ============================================================================

-- SystemAdmin can manage all invites
CREATE POLICY "SystemAdmin can manage all invites" ON invites
  FOR ALL
  USING (is_system_admin());

-- ============================================================================
-- 8. VERIFY POLICIES WERE CREATED
-- ============================================================================

SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%LOWER%' THEN '✅ Case-insensitive'
    ELSE '⚠️ Case-sensitive'
  END as case_sensitivity
FROM pg_policies
WHERE tablename = 'invites'
ORDER BY policyname;

-- ============================================================================
-- 7. CREATE TEST FUNCTION TO VERIFY INVITE VISIBILITY
-- ============================================================================

-- Function to test if a user can see their invites (for debugging)
CREATE OR REPLACE FUNCTION test_invite_visibility(test_email TEXT)
RETURNS TABLE (
  invite_id UUID,
  email TEXT,
  organization_name TEXT,
  role TEXT,
  status TEXT,
  can_see BOOLEAN,
  reason TEXT
) AS $$
DECLARE
  auth_email TEXT;
BEGIN
  -- Get current user's email
  SELECT email INTO auth_email
  FROM auth.users
  WHERE id = auth.uid();
  
  -- Return all invites for the test email with visibility check
  RETURN QUERY
  SELECT 
    i.id as invite_id,
    i.email,
    o.name as organization_name,
    i.role,
    CASE 
      WHEN i.accepted_at IS NOT NULL THEN 'Accepted'
      WHEN i.expires_at < NOW() THEN 'Expired'
      ELSE 'Pending'
    END as status,
    (LOWER(TRIM(i.email)) = LOWER(TRIM(COALESCE(auth_email, '')))) as can_see,
    CASE 
      WHEN LOWER(TRIM(i.email)) = LOWER(TRIM(COALESCE(auth_email, ''))) THEN 'Email matches'
      ELSE 'Email does not match: ' || COALESCE(auth_email, 'NULL') || ' vs ' || i.email
    END as reason
  FROM invites i
  JOIN organizations o ON o.id = i.organization_id
  WHERE LOWER(TRIM(i.email)) = LOWER(TRIM(test_email))
  ORDER BY i.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION test_invite_visibility(TEXT) TO authenticated;

-- ============================================================================
-- 10. TEST QUERY (Replace 'test@example.com' with actual email)
-- ============================================================================
-- Run this as the user to test if they can see their invites:
--
-- SELECT * FROM test_invite_visibility('test@example.com');
--
-- Or test directly:
--
-- SELECT 
--   i.*,
--   o.name as organization_name,
--   CASE 
--     WHEN i.accepted_at IS NOT NULL THEN 'Accepted'
--     WHEN i.expires_at < NOW() THEN 'Expired'
--     ELSE 'Pending'
--   END as status
-- FROM invites i
-- JOIN organizations o ON o.id = i.organization_id
-- WHERE LOWER(TRIM(i.email)) = LOWER(TRIM((SELECT email FROM auth.users WHERE id = auth.uid())))
--   AND i.accepted_at IS NULL
--   AND i.expires_at > NOW();
-- ============================================================================
