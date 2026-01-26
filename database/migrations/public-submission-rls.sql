-- RLS Policies for Public Submission System
-- Run this script in Supabase SQL Editor to enable public submission lookups

-- ============================================================================
-- 1. ADD SLUG COLUMN TO STAFF_MEMBERS TABLE
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff_members' AND column_name = 'slug'
  ) THEN
    ALTER TABLE staff_members ADD COLUMN slug TEXT;
    CREATE INDEX IF NOT EXISTS idx_staff_members_slug ON staff_members(slug);
    COMMENT ON COLUMN staff_members.slug IS 'URL-friendly identifier for public submission portal';
  END IF;
END $$;

-- Generate slugs for existing staff members
UPDATE staff_members
SET slug = LOWER(
  SUBSTRING(
    REGEXP_REPLACE(
      REGEXP_REPLACE(COALESCE(name, ''), '[^a-zA-Z0-9]+', '-', 'g'),
      '^-+|-+$', '', 'g'
    ),
    1, 50
  )
)
WHERE slug IS NULL OR slug = '';

-- ============================================================================
-- 2. FUNCTION TO GET STAFF MEMBER BY SLUG (PUBLIC ACCESS)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_staff_by_slug(slug_to_find TEXT)
RETURNS TABLE (
  id TEXT,
  name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sm.id,
    sm.name
  FROM staff_members sm
  WHERE LOWER(sm.slug) = LOWER(slug_to_find)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_staff_by_slug(TEXT) TO anon, authenticated;

-- ============================================================================
-- 2. UPDATE RLS POLICIES FOR PUBLIC TRACK SUBMISSIONS
-- ============================================================================

-- Allow anonymous users to insert tracks (for public submissions)
DROP POLICY IF EXISTS "Public can submit tracks" ON tracks;
CREATE POLICY "Public can submit tracks" ON tracks
  FOR INSERT
  TO anon
  WITH CHECK (true); -- Allow anonymous inserts for public submissions

-- Allow anonymous users to insert artists (for public submissions)
DROP POLICY IF EXISTS "Public can create artists" ON artists;
CREATE POLICY "Public can create artists" ON artists
  FOR INSERT
  TO anon
  WITH CHECK (true); -- Allow anonymous inserts for public submissions

-- Allow anonymous users to read organization by slug (already exists via get_organization_by_slug)
-- This is already handled by the existing function

-- ============================================================================
-- 3. COMMENTS
-- ============================================================================
COMMENT ON FUNCTION get_staff_by_slug(TEXT) IS 'Public function to lookup staff member by name slug for submission portal. Returns minimal info (id, name) only.';
