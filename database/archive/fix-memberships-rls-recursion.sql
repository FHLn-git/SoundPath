-- ============================================================================
-- Fix Infinite Recursion in Memberships RLS Policies
-- ============================================================================
-- Problem: Memberships RLS policies query the memberships table, which
-- triggers RLS again, causing infinite recursion.
--
-- Solution: Create SECURITY DEFINER helper functions that bypass RLS
-- to check membership status, then use those in policies.
-- ============================================================================

-- ============================================================================
-- 1. CREATE HELPER FUNCTIONS (SECURITY DEFINER - bypasses RLS)
-- ============================================================================

-- Function to get current user's email (bypasses RLS to access auth.users)
CREATE OR REPLACE FUNCTION get_user_email()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

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

-- Function to get user's staff_member ID (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_staff_id()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT id FROM staff_members WHERE auth_user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 2. DROP EXISTING MEMBERSHIPS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own memberships" ON memberships;
DROP POLICY IF EXISTS "Owners can view organization memberships" ON memberships;
DROP POLICY IF EXISTS "Managers can view organization memberships" ON memberships;
DROP POLICY IF EXISTS "Owners can insert organization memberships" ON memberships;
DROP POLICY IF EXISTS "Owners can update organization memberships" ON memberships;
DROP POLICY IF EXISTS "Owners can delete organization memberships" ON memberships;
DROP POLICY IF EXISTS "Owners can manage memberships" ON memberships;
DROP POLICY IF EXISTS "SystemAdmin can manage all memberships" ON memberships;

-- ============================================================================
-- 3. CREATE NEW MEMBERSHIPS POLICIES (using helper functions to avoid recursion)
-- ============================================================================

-- Users can view their own memberships
CREATE POLICY "Users can view their own memberships" ON memberships
  FOR SELECT
  USING (user_id = get_user_staff_id());

-- Owners can view all memberships in their organization
CREATE POLICY "Owners can view organization memberships" ON memberships
  FOR SELECT
  USING (is_owner_of_org(organization_id));

-- Managers can also view memberships in their organization
CREATE POLICY "Managers can view organization memberships" ON memberships
  FOR SELECT
  USING (is_owner_or_manager_of_org(organization_id));

-- Owners can insert memberships (for their organization only)
CREATE POLICY "Owners can insert organization memberships" ON memberships
  FOR INSERT
  WITH CHECK (is_owner_of_org(organization_id));

-- Owners can update memberships (for their organization only)
CREATE POLICY "Owners can update organization memberships" ON memberships
  FOR UPDATE
  USING (is_owner_of_org(organization_id))
  WITH CHECK (is_owner_of_org(organization_id));

-- Owners can delete memberships (for their organization only)
CREATE POLICY "Owners can delete organization memberships" ON memberships
  FOR DELETE
  USING (is_owner_of_org(organization_id));

-- SystemAdmin can manage all memberships
CREATE POLICY "SystemAdmin can manage all memberships" ON memberships
  FOR ALL
  USING (is_system_admin());

-- ============================================================================
-- 4. UPDATE INVITE POLICIES TO USE HELPER FUNCTIONS
-- ============================================================================

-- Drop existing invite policies that query memberships
DROP POLICY IF EXISTS "Owners can view organization invites" ON invites;
DROP POLICY IF EXISTS "Managers can view organization invites" ON invites;
DROP POLICY IF EXISTS "Owners can create invites" ON invites;
DROP POLICY IF EXISTS "Owners can update invites" ON invites;

-- Owners can view invites for their organization
CREATE POLICY "Owners can view organization invites" ON invites
  FOR SELECT
  USING (is_owner_of_org(organization_id));

-- Managers can also view invites for their organization
CREATE POLICY "Managers can view organization invites" ON invites
  FOR SELECT
  USING (is_owner_or_manager_of_org(organization_id));

-- Owners can create invites for their organization
CREATE POLICY "Owners can create invites" ON invites
  FOR INSERT
  WITH CHECK (is_owner_of_org(organization_id));

-- Owners can update invites for their organization
CREATE POLICY "Owners can update invites" ON invites
  FOR UPDATE
  USING (is_owner_of_org(organization_id));

-- ============================================================================
-- 5. VERIFY POLICIES
-- ============================================================================

SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('memberships', 'invites')
ORDER BY tablename, policyname;

-- ============================================================================
-- TEST QUERIES
-- ============================================================================
-- Test the helper functions (run as a user):
-- SELECT is_owner_of_org('organization-uuid-here');
-- SELECT is_owner_or_manager_of_org('organization-uuid-here');
-- SELECT get_user_staff_id();
-- ============================================================================
