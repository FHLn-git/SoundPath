-- Fix RLS Policies for Onboarding
-- Run this script to fix the organization creation and staff member creation during onboarding

-- ============================================================================
-- 1. ALLOW AUTHENTICATED USERS TO CREATE ORGANIZATIONS (ONBOARDING)
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated'); -- Any authenticated user can create an organization during onboarding

-- ============================================================================
-- 2. ALLOW AUTHENTICATED USERS TO UPDATE ORGANIZATIONS THEY CREATE (SET OWNER_ID)
-- ============================================================================
-- This allows setting owner_id after creating the organization
DROP POLICY IF EXISTS "Users can update organizations they create" ON organizations;
CREATE POLICY "Users can update organizations they create" ON organizations
  FOR UPDATE
  USING (
    -- Allow if user is authenticated and the organization was just created (no owner_id yet)
    auth.role() = 'authenticated' 
    AND owner_id IS NULL
  )
  WITH CHECK (
    auth.role() = 'authenticated'
  );

-- ============================================================================
-- 3. ALLOW AUTHENTICATED USERS TO CREATE STAFF MEMBERS (ONBOARDING)
-- ============================================================================
-- Check if INSERT policy exists for staff_members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'staff_members' 
    AND policyname = 'Authenticated users can create staff members'
  ) THEN
    CREATE POLICY "Authenticated users can create staff members" ON staff_members
      FOR INSERT
      WITH CHECK (
        auth.role() = 'authenticated' 
        AND auth_user_id = auth.uid() -- Can only create their own staff record
      );
  END IF;
END $$;

-- ============================================================================
-- VERIFY POLICIES
-- ============================================================================
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'organizations' 
      AND policyname = 'Authenticated users can create organizations'
    )
    THEN '✅ Organizations INSERT policy exists'
    ELSE '❌ Organizations INSERT policy NOT found'
  END as org_insert_check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'organizations' 
      AND policyname = 'Users can update organizations they create'
    )
    THEN '✅ Organizations UPDATE policy exists'
    ELSE '❌ Organizations UPDATE policy NOT found'
  END as org_update_check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'staff_members' 
      AND policyname = 'Authenticated users can create staff members'
    )
    THEN '✅ Staff members INSERT policy exists'
    ELSE '❌ Staff members INSERT policy NOT found'
  END as staff_insert_check;
