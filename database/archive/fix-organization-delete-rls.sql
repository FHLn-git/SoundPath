-- ============================================================================
-- Fix Organization Delete RLS Policy
-- ============================================================================
-- Problem: Organizations table has no DELETE policy, so owners cannot delete
-- their organizations. RLS blocks the deletion even though the code attempts it.
--
-- Solution: Add a DELETE policy that allows owners to delete their organizations.
-- This uses the existing is_owner_of_org() helper function to check ownership.
-- ============================================================================

-- Ensure the is_owner_of_org helper function exists (from fix-memberships-rls-recursion.sql)
-- If it doesn't exist, create it
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

-- Add DELETE policy for organizations (Owners only)
DROP POLICY IF EXISTS "Owners can delete their organization" ON organizations;
CREATE POLICY "Owners can delete their organization" ON organizations
  FOR DELETE
  USING (is_owner_of_org(id));

-- Verify the policy was created
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'organizations' 
      AND policyname = 'Owners can delete their organization'
    )
    THEN '✅ Organizations DELETE policy created successfully'
    ELSE '❌ Organizations DELETE policy NOT found'
  END as policy_check;
