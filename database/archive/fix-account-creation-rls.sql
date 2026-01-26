-- Fix RLS policies to allow users to create their own staff_members record
-- This is critical for account creation to work properly

-- ============================================================================
-- 0. MAKE ORGANIZATION_ID NULLABLE (for new signups without organizations)
-- ============================================================================

-- Make organization_id nullable since users can sign up without being in an organization
-- Organization membership is now handled via the memberships table
DO $$
BEGIN
  -- Check if organization_id is NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff_members' 
      AND column_name = 'organization_id' 
      AND is_nullable = 'NO'
  ) THEN
    -- Make it nullable
    ALTER TABLE staff_members ALTER COLUMN organization_id DROP NOT NULL;
    RAISE NOTICE 'Made organization_id nullable in staff_members';
  ELSE
    RAISE NOTICE 'organization_id is already nullable or does not exist';
  END IF;
END $$;

-- ============================================================================
-- 1. ALLOW USERS TO CREATE THEIR OWN STAFF_MEMBERS RECORD
-- ============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can create their own staff profile" ON staff_members;

-- Allow authenticated users to create their own staff_members record
-- This is needed during signup when the user doesn't have a staff_members record yet
-- organization_id can be NULL for new signups (they'll join organizations via memberships)
CREATE POLICY "Users can create their own staff profile" ON staff_members
  FOR INSERT
  WITH CHECK (
    auth_user_id = auth.uid()
    -- Allow NULL organization_id for new signups
    -- Organization membership is handled via memberships table
  );

-- ============================================================================
-- 2. ALLOW USERS TO VIEW THEIR OWN STAFF_MEMBERS RECORD
-- ============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view their own staff profile" ON staff_members;

-- Allow users to view their own staff_members record
CREATE POLICY "Users can view their own staff profile" ON staff_members
  FOR SELECT
  USING (
    auth_user_id = auth.uid()
  );

-- ============================================================================
-- 3. FIX EXISTING ACCOUNTS WITHOUT STAFF_MEMBERS RECORDS
-- ============================================================================

-- Find auth users without staff_members records
-- Run this query to see which users need fixing:
SELECT 
  u.id as auth_user_id,
  u.email,
  u.created_at,
  CASE 
    WHEN sm.id IS NULL THEN '❌ Missing staff_members record'
    ELSE '✅ Has staff_members record'
  END as status
FROM auth.users u
LEFT JOIN staff_members sm ON sm.auth_user_id = u.id
WHERE sm.id IS NULL
ORDER BY u.created_at DESC;

-- Auto-create missing staff_members records
-- This will create staff_members records for any auth users that don't have one
-- Note: organization_id is NULL for new signups (they'll join organizations via memberships)
INSERT INTO staff_members (id, name, role, auth_user_id, organization_id)
SELECT 
  'staff_' || SUBSTRING(u.id::text, 1, 8) || '_' || EXTRACT(EPOCH FROM u.created_at)::bigint as id,
  COALESCE(u.raw_user_meta_data->>'name', 'User') as name,
  'Scout' as role,
  u.id as auth_user_id,
  NULL as organization_id  -- NULL is allowed now for new signups
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM staff_members sm WHERE sm.auth_user_id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. VERIFY FIXES
-- ============================================================================

-- Check that all auth users now have staff_members records
SELECT 
  COUNT(DISTINCT u.id) as total_auth_users,
  COUNT(DISTINCT sm.id) as total_staff_members,
  COUNT(DISTINCT u.id) - COUNT(DISTINCT sm.id) as missing_records
FROM auth.users u
LEFT JOIN staff_members sm ON sm.auth_user_id = u.id;

-- Should show 0 missing_records if everything is fixed
