-- Migration: Transform SoundPath into Multi-Tenant SaaS Architecture
-- Run this script in Supabase SQL Editor to enable multi-tenancy

-- ============================================================================
-- 1. ENHANCE ORGANIZATIONS TABLE
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    -- Add slug column (unique identifier for URL routing)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organizations' AND column_name = 'slug') THEN
      ALTER TABLE organizations ADD COLUMN slug TEXT UNIQUE;
      -- Generate slugs from existing names
      UPDATE organizations 
      SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
      WHERE slug IS NULL;
      -- Create unique constraint
      CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
      COMMENT ON COLUMN organizations.slug IS 'Unique URL-friendly identifier for the organization';
    END IF;

    -- Add owner_id column (references staff_members.id)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organizations' AND column_name = 'owner_id') THEN
      ALTER TABLE organizations ADD COLUMN owner_id TEXT REFERENCES staff_members(id) ON DELETE SET NULL;
      COMMENT ON COLUMN organizations.owner_id IS 'Reference to the staff member who owns this organization';
    END IF;

    -- Add branding_settings column (JSONB for flexible branding)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organizations' AND column_name = 'branding_settings') THEN
      ALTER TABLE organizations ADD COLUMN branding_settings JSONB DEFAULT '{}'::jsonb;
      COMMENT ON COLUMN organizations.branding_settings IS 'JSON object containing logo URL, primary color, etc.';
    END IF;

    -- Set owner_id for default organization (if exists)
    UPDATE organizations 
    SET owner_id = (
      SELECT id FROM staff_members 
      WHERE role = 'Owner' 
      AND organization_id = organizations.id 
      LIMIT 1
    )
    WHERE owner_id IS NULL AND id = '00000000-0000-0000-0000-000000000001'::uuid;
  END IF;
END $$;

-- ============================================================================
-- 2. ENSURE ALL TABLES HAVE organization_id
-- ============================================================================
-- This is already done in master-schema.sql, but we verify here
DO $$
BEGIN
  -- Verify tracks table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tracks') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'organization_id') THEN
      ALTER TABLE tracks ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
      UPDATE tracks SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE organization_id IS NULL;
    END IF;
  END IF;

  -- Verify artists table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artists') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'artists' AND column_name = 'organization_id') THEN
      ALTER TABLE artists ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
      UPDATE artists SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE organization_id IS NULL;
    END IF;
  END IF;

  -- Verify staff_members table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_members') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'staff_members' AND column_name = 'organization_id') THEN
      ALTER TABLE staff_members ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
      UPDATE staff_members SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE organization_id IS NULL;
      ALTER TABLE staff_members ALTER COLUMN organization_id SET NOT NULL;
    END IF;
  END IF;

  -- Verify votes table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'votes') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'votes' AND column_name = 'organization_id') THEN
      ALTER TABLE votes ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
      -- Update from tracks
      UPDATE votes SET organization_id = (
        SELECT organization_id FROM tracks WHERE tracks.id = votes.track_id
      ) WHERE organization_id IS NULL;
    END IF;
  END IF;

  -- Verify listen_logs table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'listen_logs') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'listen_logs' AND column_name = 'organization_id') THEN
      ALTER TABLE listen_logs ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
      -- Update from tracks
      UPDATE listen_logs SET organization_id = (
        SELECT organization_id FROM tracks WHERE tracks.id = listen_logs.track_id
      ) WHERE organization_id IS NULL;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 3. ENHANCE RLS POLICIES FOR STRICT MULTI-TENANCY
-- ============================================================================

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Staff can view their own organization" ON staff_members;
DROP POLICY IF EXISTS "Staff can update their own organization" ON staff_members;
DROP POLICY IF EXISTS "Staff can view their own organization tracks" ON tracks;
DROP POLICY IF EXISTS "Staff can insert their own organization tracks" ON tracks;
DROP POLICY IF EXISTS "Staff can update their own organization tracks" ON tracks;
DROP POLICY IF EXISTS "Staff can delete their own organization tracks" ON tracks;
DROP POLICY IF EXISTS "Staff can view their own organization artists" ON artists;
DROP POLICY IF EXISTS "Staff can insert their own organization artists" ON artists;
DROP POLICY IF EXISTS "Staff can update their own organization artists" ON artists;
DROP POLICY IF EXISTS "Staff can view their own organization votes" ON votes;
DROP POLICY IF EXISTS "Staff can insert their own organization votes" ON votes;
DROP POLICY IF EXISTS "Staff can update their own organization votes" ON votes;
DROP POLICY IF EXISTS "Staff can view their own organization listen_logs" ON listen_logs;
DROP POLICY IF EXISTS "Staff can insert their own organization listen_logs" ON listen_logs;
DROP POLICY IF EXISTS "Staff can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Owners can update their own organization" ON organizations;

-- Staff Members Policies
CREATE POLICY "Staff can view their own organization" ON staff_members
  FOR SELECT
  USING (
    organization_id = get_user_organization_id()
    OR auth_user_id = auth.uid()  -- Allow users to see their own record
  );

CREATE POLICY "Staff can update their own organization" ON staff_members
  FOR UPDATE
  USING (organization_id = get_user_organization_id());

-- Tracks Policies (strict isolation)
CREATE POLICY "Staff can view their own organization tracks" ON tracks
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Staff can insert their own organization tracks" ON tracks
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Staff can update their own organization tracks" ON tracks
  FOR UPDATE
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Staff can delete their own organization tracks" ON tracks
  FOR DELETE
  USING (organization_id = get_user_organization_id());

-- Artists Policies (strict isolation)
CREATE POLICY "Staff can view their own organization artists" ON artists
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Staff can insert their own organization artists" ON artists
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Staff can update their own organization artists" ON artists
  FOR UPDATE
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

-- Votes Policies (strict isolation)
CREATE POLICY "Staff can view their own organization votes" ON votes
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Staff can insert their own organization votes" ON votes
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Staff can update their own organization votes" ON votes
  FOR UPDATE
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

-- Listen Logs Policies (strict isolation)
CREATE POLICY "Staff can view their own organization listen_logs" ON listen_logs
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Staff can insert their own organization listen_logs" ON listen_logs
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

-- Organizations Policies
CREATE POLICY "Staff can view their own organization" ON organizations
  FOR SELECT
  USING (id = get_user_organization_id());

CREATE POLICY "Owners can update their own organization" ON organizations
  FOR UPDATE
  USING (
    id = get_user_organization_id() 
    AND (SELECT role FROM staff_members WHERE auth_user_id = auth.uid()) = 'Owner'
  );

-- ============================================================================
-- 4. VERIFY MIGRATION
-- ============================================================================
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'slug')
    THEN '✅ slug column added to organizations'
    ELSE '❌ slug column NOT found'
  END as slug_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'owner_id')
    THEN '✅ owner_id column added to organizations'
    ELSE '❌ owner_id column NOT found'
  END as owner_id_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'branding_settings')
    THEN '✅ branding_settings column added to organizations'
    ELSE '❌ branding_settings column NOT found'
  END as branding_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'organization_id')
    THEN '✅ tracks.organization_id exists'
    ELSE '❌ tracks.organization_id NOT found'
  END as tracks_org_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artists' AND column_name = 'organization_id')
    THEN '✅ artists.organization_id exists'
    ELSE '❌ artists.organization_id NOT found'
  END as artists_org_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_members' AND column_name = 'organization_id')
    THEN '✅ staff_members.organization_id exists'
    ELSE '❌ staff_members.organization_id NOT found'
  END as staff_org_check;
