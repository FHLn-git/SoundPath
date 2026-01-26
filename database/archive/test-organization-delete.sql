-- ============================================================================
-- Test Organization Delete Policy
-- ============================================================================
-- Run this script to verify the DELETE policy is working correctly
-- Replace 'YOUR_ORG_ID' with the actual organization ID you want to test
-- ============================================================================

-- 1. Check if DELETE policy exists
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'organizations'
  AND cmd = 'DELETE';

-- 2. Check if is_owner_of_org function exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'is_owner_of_org'
    )
    THEN '✅ is_owner_of_org function exists'
    ELSE '❌ is_owner_of_org function NOT found'
  END as function_check;

-- 3. Test if current user is owner of an organization
-- Replace 'YOUR_ORG_ID' with actual organization ID
-- Uncomment and run this with your organization ID:
-- SELECT is_owner_of_org('YOUR_ORG_ID'::uuid) as is_owner;

-- 3b. Alternative: Check ownership for all your organizations
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  is_owner_of_org(o.id) as is_owner,
  m.role as your_role,
  m.active as membership_active
FROM organizations o
LEFT JOIN memberships m ON m.organization_id = o.id
LEFT JOIN staff_members sm ON sm.id = m.user_id
WHERE sm.auth_user_id = auth.uid()
ORDER BY o.name;

-- 4. Check current user's memberships and roles
SELECT 
  m.organization_id,
  o.name as organization_name,
  m.role,
  m.active,
  sm.id as staff_id,
  sm.name as staff_name
FROM memberships m
JOIN organizations o ON o.id = m.organization_id
JOIN staff_members sm ON sm.id = m.user_id
WHERE sm.auth_user_id = auth.uid()
ORDER BY m.organization_id;

-- 5. Verify RLS is enabled on organizations table
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'organizations';

-- 6. Check all policies on organizations table (for debugging)
SELECT 
  policyname,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'organizations'
ORDER BY cmd, policyname;
