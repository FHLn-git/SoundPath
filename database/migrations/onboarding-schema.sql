-- Migration: Public Auth and Label Onboarding System
-- Run this script in Supabase SQL Editor to enable onboarding features

-- ============================================================================
-- 1. ENSURE ORGANIZATIONS TABLE HAS REQUIRED COLUMNS
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    -- Add slug column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organizations' AND column_name = 'slug') THEN
      ALTER TABLE organizations ADD COLUMN slug TEXT UNIQUE;
      COMMENT ON COLUMN organizations.slug IS 'Unique URL-friendly identifier for the organization';
    END IF;

    -- Add owner_id column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organizations' AND column_name = 'owner_id') THEN
      ALTER TABLE organizations ADD COLUMN owner_id TEXT REFERENCES staff_members(id) ON DELETE SET NULL;
      COMMENT ON COLUMN organizations.owner_id IS 'Reference to the staff member who owns this organization';
    END IF;

    -- Add branding_settings column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organizations' AND column_name = 'branding_settings') THEN
      ALTER TABLE organizations ADD COLUMN branding_settings JSONB DEFAULT '{}'::jsonb;
      COMMENT ON COLUMN organizations.branding_settings IS 'JSON object containing logo URL, primary color, etc.';
    END IF;

    -- Create unique index on slug
    CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
  END IF;
END $$;

-- ============================================================================
-- 2. FUNCTION TO CHECK SLUG AVAILABILITY
-- ============================================================================
CREATE OR REPLACE FUNCTION check_slug_availability(slug_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM organizations WHERE slug = slug_to_check
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_slug_availability(TEXT) TO anon, authenticated;

-- ============================================================================
-- 3. FUNCTION TO CREATE NEW LABEL WITH SETUP
-- ============================================================================
CREATE OR REPLACE FUNCTION create_new_label(
  label_name TEXT,
  label_slug TEXT,
  owner_email TEXT,
  owner_password TEXT,
  owner_name TEXT
)
RETURNS JSONB AS $$
DECLARE
  new_org_id UUID;
  new_staff_id TEXT;
  auth_user_id UUID;
  result JSONB;
BEGIN
  -- Validate slug is available
  IF NOT check_slug_availability(label_slug) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Slug already exists'
    );
  END IF;

  -- Create auth user (this will be handled by Supabase Auth, but we'll create the staff record)
  -- Note: In production, you'd use Supabase Auth Admin API to create the user
  -- For now, we'll assume the auth user is created separately and passed in
  
  -- Create organization
  INSERT INTO organizations (name, slug, branding_settings)
  VALUES (label_name, label_slug, '{}'::jsonb)
  RETURNING id INTO new_org_id;

  -- Create owner staff member
  new_staff_id := 'staff_' || substr(new_org_id::text, 1, 8) || '_' || floor(random() * 1000000)::text;
  
  INSERT INTO staff_members (
    id,
    name,
    role,
    organization_id,
    organization_name,
    auth_user_id,
    can_advance_office,
    can_advance_contract,
    can_edit_release_date,
    can_view_metrics
  )
  VALUES (
    new_staff_id,
    owner_name,
    'Owner',
    new_org_id,
    label_name,
    NULL, -- Will be updated when auth user is created
    true,
    true,
    true,
    true
  )
  RETURNING id INTO new_staff_id;

  -- Update organization with owner_id
  UPDATE organizations
  SET owner_id = new_staff_id
  WHERE id = new_org_id;

  -- Note: Genres are global and should already exist in the database
  -- No need to create organization-specific genres

  -- Create getting started track
  INSERT INTO tracks (
    artist_name,
    title,
    genre,
    bpm,
    energy,
    status,
    "column",
    organization_id,
    sc_link,
    created_at
  )
  VALUES (
    'SoundPath',
    'Welcome to Your Label Dashboard',
    'Tech House',
    128,
    0,
    'inbox',
    'inbox',
    new_org_id,
    'https://soundcloud.com',
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', new_org_id,
    'staff_id', new_staff_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This function requires Supabase Auth Admin API to create the auth user
-- In production, you'd call Supabase Auth Admin API from your backend

-- ============================================================================
-- 4. TRIGGER TO AUTO-SETUP NEW ORGANIZATIONS
-- ============================================================================
-- This trigger will run after an organization is created
CREATE OR REPLACE FUNCTION setup_new_organization()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default genres (if genres table supports organization_id)
  -- Note: If genres are global, skip this step
  
  -- Create getting started track
  INSERT INTO tracks (
    artist_name,
    title,
    genre,
    bpm,
    energy,
    status,
    "column",
    organization_id,
    sc_link,
    created_at
  )
  VALUES (
    'SoundPath',
    'Welcome to Your Label Dashboard',
    'Tech House',
    128,
    0,
    'inbox',
    'inbox',
    NEW.id,
    'https://soundcloud.com',
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_setup_new_organization ON organizations;
CREATE TRIGGER trigger_setup_new_organization
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION setup_new_organization();

-- ============================================================================
-- 5. FUNCTION TO GET ORGANIZATION BY SLUG
-- ============================================================================
CREATE OR REPLACE FUNCTION get_organization_by_slug(slug_to_find TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  branding_settings JSONB,
  owner_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.slug,
    o.branding_settings,
    o.owner_id
  FROM organizations o
  WHERE o.slug = slug_to_find;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_organization_by_slug(TEXT) TO anon, authenticated;

-- ============================================================================
-- 6. RLS POLICIES FOR ORGANIZATIONS
-- ============================================================================
-- Allow anonymous users to read organization slug and name for branding
DROP POLICY IF EXISTS "Public can view organization by slug" ON organizations;
CREATE POLICY "Public can view organization by slug" ON organizations
  FOR SELECT
  USING (true); -- Allow public read access for slug-based routing

-- Allow authenticated users to create organizations (for onboarding)
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated'); -- Any authenticated user can create an organization during onboarding

-- Allow users to update organizations they just created (to set owner_id)
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

-- Allow authenticated users to create their own staff member record (for onboarding)
DROP POLICY IF EXISTS "Authenticated users can create staff members" ON staff_members;
CREATE POLICY "Authenticated users can create staff members" ON staff_members
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' 
    AND auth_user_id = auth.uid() -- Can only create their own staff record
  );

-- ============================================================================
-- VERIFY MIGRATION
-- ============================================================================
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'slug')
    THEN '✅ slug column exists'
    ELSE '❌ slug column NOT found'
  END as slug_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_slug_availability')
    THEN '✅ check_slug_availability function exists'
    ELSE '❌ check_slug_availability function NOT found'
  END as function_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_setup_new_organization')
    THEN '✅ setup trigger exists'
    ELSE '❌ setup trigger NOT found'
  END as trigger_check;
