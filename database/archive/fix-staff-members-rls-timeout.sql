-- ============================================================================
-- Fix Staff Members RLS Timeout Issue
-- ============================================================================
-- Problem: Query to staff_members times out after 5 seconds, likely due to
-- RLS policy recursion or complex queries within the policy.
--
-- Solution: Create SECURITY DEFINER helper function and update RLS policy
-- to allow users to view their own staff_members record without recursion.
-- ============================================================================

-- ============================================================================
-- 1. CREATE HELPER FUNCTION (SECURITY DEFINER - bypasses RLS)
-- ============================================================================

-- Function to get user's staff_member ID (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_staff_id()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT id FROM staff_members WHERE auth_user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 2. DROP EXISTING STAFF_MEMBERS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Staff can view their own organization" ON staff_members;
DROP POLICY IF EXISTS "Users can view their own staff profile" ON staff_members;
DROP POLICY IF EXISTS "Users can create their own staff profile" ON staff_members;
DROP POLICY IF EXISTS "Users can update their own staff profile" ON staff_members;
DROP POLICY IF EXISTS "Authenticated users can create staff members" ON staff_members;
DROP POLICY IF EXISTS "SystemAdmin can view all staff" ON staff_members;

-- ============================================================================
-- 3. CREATE NEW RLS POLICIES (using simple checks to avoid recursion)
-- ============================================================================

-- Users can always view their own staff_members record (by auth_user_id)
-- This is the most important policy - must be simple to avoid recursion
CREATE POLICY "Users can view their own staff profile" ON staff_members
  FOR SELECT
  USING (auth_user_id = auth.uid());

-- Users can create their own staff profile (during signup)
CREATE POLICY "Users can create their own staff profile" ON staff_members
  FOR INSERT
  WITH CHECK (auth_user_id = auth.uid());

-- Users can update their own staff profile
CREATE POLICY "Users can update their own staff profile" ON staff_members
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- SystemAdmin can view all staff (for admin dashboard)
CREATE POLICY "SystemAdmin can view all staff" ON staff_members
  FOR SELECT
  USING (is_system_admin());

-- ============================================================================
-- 4. VERIFY POLICIES
-- ============================================================================

SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'staff_members'
ORDER BY policyname;

-- ============================================================================
-- NOTES
-- ============================================================================
-- The key fix is using `auth_user_id = auth.uid()` directly in the policy
-- instead of querying staff_members within the policy, which causes recursion.
--
-- This policy allows:
-- 1. Users to view/update their own staff_members record
-- 2. SystemAdmins to view all staff_members
-- 3. Users to create their own staff_members record during signup
--
-- For viewing other staff members in an organization, use the memberships
-- table and join with staff_members, which has its own RLS policies.
-- ============================================================================
