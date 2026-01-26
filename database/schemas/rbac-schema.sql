-- RBAC Schema Updates for SoundPath
-- Run this script in your Supabase SQL Editor to add RBAC support

-- Update staff_members table to support RBAC
DO $$ 
BEGIN
  -- Add organization_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'staff_members' AND column_name = 'organization_id') THEN
    ALTER TABLE staff_members ADD COLUMN organization_id UUID;
    -- Set a default organization for existing staff (you may want to update this)
    UPDATE staff_members SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE organization_id IS NULL;
    ALTER TABLE staff_members ALTER COLUMN organization_id SET NOT NULL;
  END IF;

  -- Add auth_user_id to link to Supabase Auth users
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'staff_members' AND column_name = 'auth_user_id') THEN
    ALTER TABLE staff_members ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_staff_members_auth_user_id ON staff_members(auth_user_id);
  END IF;

  -- Drop existing constraint if it exists (we'll add it back after updating roles)
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'check_role_values' AND table_name = 'staff_members') THEN
    ALTER TABLE staff_members DROP CONSTRAINT check_role_values;
  END IF;

  -- Add bio field for profile
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'staff_members' AND column_name = 'bio') THEN
    ALTER TABLE staff_members ADD COLUMN bio TEXT;
  END IF;

  -- Add last_active_at for login status tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'staff_members' AND column_name = 'last_active_at') THEN
    ALTER TABLE staff_members ADD COLUMN last_active_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Add organization_name for display
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'staff_members' AND column_name = 'organization_name') THEN
    ALTER TABLE staff_members ADD COLUMN organization_name TEXT;
  END IF;
END $$;

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add organization_id to tracks table for RLS
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tracks' AND column_name = 'organization_id') THEN
    ALTER TABLE tracks ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_tracks_organization_id ON tracks(organization_id);
    -- Set default organization for existing tracks
    UPDATE tracks SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE organization_id IS NULL;
  END IF;
END $$;

-- Add organization_id to artists table for RLS
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'artists' AND column_name = 'organization_id') THEN
    ALTER TABLE artists ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_artists_organization_id ON artists(organization_id);
    -- Set default organization for existing artists
    UPDATE artists SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE organization_id IS NULL;
  END IF;
END $$;

-- Add organization_id to votes table for RLS
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'votes' AND column_name = 'organization_id') THEN
    ALTER TABLE votes ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_votes_organization_id ON votes(organization_id);
    -- Set default organization for existing votes (based on track's organization)
    UPDATE votes SET organization_id = (
      SELECT organization_id FROM tracks WHERE tracks.id = votes.track_id
    ) WHERE organization_id IS NULL;
  END IF;
END $$;

-- Create default organization
INSERT INTO organizations (id, name) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Default Label')
ON CONFLICT (id) DO NOTHING;

-- Update existing staff_members to have organization
UPDATE staff_members 
SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid,
    organization_name = 'Default Label'
WHERE organization_id IS NULL;

-- Update staff roles to match RBAC (Owner, Manager, Scout)
-- Update all possible old role values to new RBAC roles
UPDATE staff_members SET role = 'Owner' WHERE role IN ('Label Owner', 'Owner');
UPDATE staff_members SET role = 'Manager' WHERE role IN ('A&R Manager', 'Manager');
UPDATE staff_members SET role = 'Scout' WHERE role IN ('A&R Scout', 'Scout');

-- Add constraint to enforce RBAC roles (after updating existing data)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'check_role_values' AND table_name = 'staff_members') THEN
    ALTER TABLE staff_members ADD CONSTRAINT check_role_values 
      CHECK (role IN ('Owner', 'Manager', 'Scout'));
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Staff can view their own organization" ON staff_members;
DROP POLICY IF EXISTS "Staff can view their own organization tracks" ON tracks;
DROP POLICY IF EXISTS "Staff can view their own organization artists" ON artists;
DROP POLICY IF EXISTS "Staff can view their own organization votes" ON votes;
DROP POLICY IF EXISTS "Staff can view their own organization" ON organizations;

-- RLS Policy: Staff can only see their own organization's data
CREATE POLICY "Staff can view their own organization" ON staff_members
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM staff_members 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view their own organization tracks" ON tracks
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM staff_members 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can insert their own organization tracks" ON tracks
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM staff_members 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can update their own organization tracks" ON tracks
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM staff_members 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view their own organization artists" ON artists
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM staff_members 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can insert their own organization artists" ON artists
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM staff_members 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view their own organization votes" ON votes
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM staff_members 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can insert their own organization votes" ON votes
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM staff_members 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view their own organization" ON organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM staff_members 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Function to update last_active_at on staff_members
CREATE OR REPLACE FUNCTION update_staff_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE staff_members
  SET last_active_at = NOW()
  WHERE auth_user_id = auth.uid();
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger to update last_active_at when user interacts with tracks
DROP TRIGGER IF EXISTS update_staff_activity ON tracks;
CREATE TRIGGER update_staff_activity
  AFTER INSERT OR UPDATE ON tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_last_active();
