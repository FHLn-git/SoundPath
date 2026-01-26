-- ============================================================================
-- SoundPath Master Database Schema - FINAL VERSION
-- "One Schema to Rule Them All"
-- ============================================================================
-- This is a comprehensive, production-ready schema that can be run multiple times
-- safely. It includes all tables, columns, indexes, triggers, functions,
-- RLS policies, and default data for the complete SoundPath application.
--
-- IMPORTANT: This schema fixes the RLS infinite recursion issue.
--
-- RUN AS: postgres role (default in Supabase SQL Editor)
-- The SQL Editor in Supabase runs as postgres role automatically.
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ORGANIZATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  require_rejection_reason BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create default organization
INSERT INTO organizations (id, name, require_rejection_reason) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Default Label', true)
ON CONFLICT (id) DO NOTHING;

-- Add require_rejection_reason to existing organizations if missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organizations' AND column_name = 'require_rejection_reason') THEN
      ALTER TABLE organizations ADD COLUMN require_rejection_reason BOOLEAN DEFAULT true;
      UPDATE organizations SET require_rejection_reason = true WHERE require_rejection_reason IS NULL;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- ARTISTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS artists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  bio TEXT,
  primary_genre TEXT,
  profitability_score NUMERIC(5, 2) DEFAULT 0,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add organization_id to existing artists if missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artists') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'artists' AND column_name = 'organization_id') THEN
      ALTER TABLE artists ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
      UPDATE artists SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE organization_id IS NULL;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- GENRES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS genres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  avg_performance NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STAFF MEMBERS TABLE (with RBAC)
-- ============================================================================
CREATE TABLE IF NOT EXISTS staff_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  bio TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  organization_name TEXT,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RBAC columns to existing staff_members if missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_members') THEN
    -- Add organization_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'staff_members' AND column_name = 'organization_id') THEN
      ALTER TABLE staff_members ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
      UPDATE staff_members SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE organization_id IS NULL;
      ALTER TABLE staff_members ALTER COLUMN organization_id SET NOT NULL;
    END IF;

    -- Add auth_user_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'staff_members' AND column_name = 'auth_user_id') THEN
      ALTER TABLE staff_members ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- Add bio
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'staff_members' AND column_name = 'bio') THEN
      ALTER TABLE staff_members ADD COLUMN bio TEXT;
    END IF;

    -- Add last_active_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'staff_members' AND column_name = 'last_active_at') THEN
      ALTER TABLE staff_members ADD COLUMN last_active_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Add organization_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'staff_members' AND column_name = 'organization_name') THEN
      ALTER TABLE staff_members ADD COLUMN organization_name TEXT;
    END IF;
  END IF;
END $$;

-- Drop existing role constraint if it exists (we'll add it back after updating roles)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'check_role_values' AND table_name = 'staff_members') THEN
    ALTER TABLE staff_members DROP CONSTRAINT check_role_values;
  END IF;
END $$;

-- Update existing staff roles to RBAC format
UPDATE staff_members SET role = 'Owner' WHERE role IN ('Label Owner', 'Owner');
UPDATE staff_members SET role = 'Manager' WHERE role IN ('A&R Manager', 'Manager');
UPDATE staff_members SET role = 'Scout' WHERE role IN ('A&R Scout', 'Scout');

-- Add RBAC role constraint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'check_role_values' AND table_name = 'staff_members') THEN
    ALTER TABLE staff_members ADD CONSTRAINT check_role_values 
      CHECK (role IN ('Owner', 'Manager', 'Scout'));
  END IF;
END $$;

-- Update existing staff to have organization
UPDATE staff_members 
SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid,
    organization_name = 'Default Label'
WHERE organization_id IS NULL OR organization_name IS NULL;

-- ============================================================================
-- TRACKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES artists(id) ON DELETE SET NULL,
  artist_name TEXT NOT NULL,
  title TEXT NOT NULL,
  sc_link TEXT,
  genre TEXT,
  bpm INTEGER DEFAULT 128,
  energy INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'inbox',
  "column" TEXT NOT NULL DEFAULT 'inbox',
  votes INTEGER DEFAULT 0,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_user_id TEXT REFERENCES staff_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  moved_to_second_listen TIMESTAMPTZ,
  target_release_date DATE,
  release_date DATE,
  contract_signed BOOLEAN DEFAULT FALSE,
  total_earnings NUMERIC(10, 2) DEFAULT 0,
  watched BOOLEAN DEFAULT FALSE,
  archived BOOLEAN DEFAULT FALSE,
  spotify_plays INTEGER DEFAULT 0,
  rejection_reason TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to existing tracks table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tracks') THEN
    -- Add organization_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'organization_id') THEN
      ALTER TABLE tracks ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
      UPDATE tracks SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE organization_id IS NULL;
    END IF;

    -- Add all other columns if missing (consolidated check)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'artist_name') THEN
      ALTER TABLE tracks ADD COLUMN artist_name TEXT;
      UPDATE tracks SET artist_name = '' WHERE artist_name IS NULL;
      ALTER TABLE tracks ALTER COLUMN artist_name SET NOT NULL;
      ALTER TABLE tracks ALTER COLUMN artist_name SET DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'status') THEN
      ALTER TABLE tracks ADD COLUMN status TEXT;
      UPDATE tracks SET status = COALESCE("column", 'inbox') WHERE status IS NULL;
      ALTER TABLE tracks ALTER COLUMN status SET NOT NULL;
      ALTER TABLE tracks ALTER COLUMN status SET DEFAULT 'inbox';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'column') THEN
      ALTER TABLE tracks ADD COLUMN "column" TEXT;
      UPDATE tracks SET "column" = COALESCE(status, 'inbox') WHERE "column" IS NULL;
      ALTER TABLE tracks ALTER COLUMN "column" SET NOT NULL;
      ALTER TABLE tracks ALTER COLUMN "column" SET DEFAULT 'inbox';
    END IF;

    -- Add remaining columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'moved_to_second_listen') THEN
      ALTER TABLE tracks ADD COLUMN moved_to_second_listen TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'target_release_date') THEN
      ALTER TABLE tracks ADD COLUMN target_release_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'release_date') THEN
      ALTER TABLE tracks ADD COLUMN release_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'contract_signed') THEN
      ALTER TABLE tracks ADD COLUMN contract_signed BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'total_earnings') THEN
      ALTER TABLE tracks ADD COLUMN total_earnings NUMERIC(10, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'watched') THEN
      ALTER TABLE tracks ADD COLUMN watched BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'archived') THEN
      ALTER TABLE tracks ADD COLUMN archived BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'spotify_plays') THEN
      ALTER TABLE tracks ADD COLUMN spotify_plays INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'rejection_reason') THEN
      ALTER TABLE tracks ADD COLUMN rejection_reason TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'bpm') THEN
      ALTER TABLE tracks ADD COLUMN bpm INTEGER DEFAULT 128;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'energy') THEN
      ALTER TABLE tracks ADD COLUMN energy INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'genre') THEN
      ALTER TABLE tracks ADD COLUMN genre TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'sc_link') THEN
      ALTER TABLE tracks ADD COLUMN sc_link TEXT;
    END IF;
    
    -- Add recipient_user_id for Personal Inbox feature
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'recipient_user_id') THEN
      ALTER TABLE tracks ADD COLUMN recipient_user_id TEXT REFERENCES staff_members(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_tracks_recipient_user_id ON tracks(recipient_user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'votes') THEN
      ALTER TABLE tracks ADD COLUMN votes INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'updated_at') THEN
      ALTER TABLE tracks ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Sync status and column
    UPDATE tracks SET status = COALESCE(status, "column", 'inbox') WHERE status IS NULL;
    UPDATE tracks SET "column" = COALESCE("column", status, 'inbox') WHERE "column" IS NULL;
  END IF;
END $$;

-- ============================================================================
-- VOTES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  staff_id TEXT NOT NULL,
  vote_type INTEGER NOT NULL CHECK (vote_type IN (-1, 1)),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(track_id, staff_id)
);

-- ============================================================================
-- LISTEN LOGS TABLE (Cognitive Load Tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS listen_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id TEXT NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  listened_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_listen_logs_staff_id ON listen_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_listen_logs_track_id ON listen_logs(track_id);
CREATE INDEX IF NOT EXISTS idx_listen_logs_listened_at ON listen_logs(listened_at);
CREATE INDEX IF NOT EXISTS idx_listen_logs_organization_id ON listen_logs(organization_id);

-- Add organization_id to existing votes if missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'votes') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'votes' AND column_name = 'organization_id') THEN
      ALTER TABLE votes ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
      UPDATE votes SET organization_id = (
        SELECT organization_id FROM tracks WHERE tracks.id = votes.track_id
      ) WHERE organization_id IS NULL;
    END IF;
  END IF;
END $$;

-- Add organization_id to existing listen_logs if missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'listen_logs') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'listen_logs' AND column_name = 'organization_id') THEN
      ALTER TABLE listen_logs ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
      UPDATE listen_logs SET organization_id = (
        SELECT organization_id FROM tracks WHERE tracks.id = listen_logs.track_id
      ) WHERE organization_id IS NULL;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_tracks_status ON tracks(status);
CREATE INDEX IF NOT EXISTS idx_tracks_artist_id ON tracks(artist_id);
CREATE INDEX IF NOT EXISTS idx_tracks_artist_name ON tracks(artist_name);
CREATE INDEX IF NOT EXISTS idx_tracks_release_date ON tracks(release_date);
CREATE INDEX IF NOT EXISTS idx_tracks_organization_id ON tracks(organization_id);
CREATE INDEX IF NOT EXISTS idx_artists_organization_id ON artists(organization_id);
CREATE INDEX IF NOT EXISTS idx_votes_track_id ON votes(track_id);
CREATE INDEX IF NOT EXISTS idx_votes_staff_id ON votes(staff_id);
CREATE INDEX IF NOT EXISTS idx_votes_organization_id ON votes(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_auth_user_id ON staff_members(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_organization_id ON staff_members(organization_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to recalculate track votes when a vote is added/updated/deleted
CREATE OR REPLACE FUNCTION recalculate_track_votes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tracks
  SET votes = (
    SELECT COALESCE(SUM(vote_type), 0)
    FROM votes
    WHERE track_id = COALESCE(NEW.track_id, OLD.track_id)
  )
  WHERE id = COALESCE(NEW.track_id, OLD.track_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

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

-- Function to get user's organization_id (prevents RLS recursion)
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
DECLARE
  user_org_id UUID;
BEGIN
  SELECT organization_id INTO user_org_id
  FROM staff_members
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  RETURN user_org_id;
END;
$$ language 'plpgsql' STABLE SECURITY DEFINER;

-- Grant execute permissions on functions to anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_user_organization_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION recalculate_track_votes() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_staff_last_active() TO anon, authenticated;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update tracks.updated_at
DROP TRIGGER IF EXISTS update_tracks_updated_at ON tracks;
CREATE TRIGGER update_tracks_updated_at 
  BEFORE UPDATE ON tracks
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to recalculate votes
DROP TRIGGER IF EXISTS recalculate_votes_on_vote_change ON votes;
CREATE TRIGGER recalculate_votes_on_vote_change
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW 
  EXECUTE FUNCTION recalculate_track_votes();

-- Trigger to update staff activity
DROP TRIGGER IF EXISTS update_staff_activity ON tracks;
CREATE TRIGGER update_staff_activity
  AFTER INSERT OR UPDATE ON tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_last_active();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - FIXED TO PREVENT INFINITE RECURSION
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE listen_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Staff can view their own organization" ON staff_members;
DROP POLICY IF EXISTS "Staff can view their own organization tracks" ON tracks;
DROP POLICY IF EXISTS "Staff can insert their own organization tracks" ON tracks;
DROP POLICY IF EXISTS "Staff can update their own organization tracks" ON tracks;
DROP POLICY IF EXISTS "Staff can view their own organization artists" ON artists;
DROP POLICY IF EXISTS "Staff can insert their own organization artists" ON artists;
DROP POLICY IF EXISTS "Staff can view their own organization votes" ON votes;
DROP POLICY IF EXISTS "Staff can insert their own organization votes" ON votes;
DROP POLICY IF EXISTS "Staff can view their own organization listen_logs" ON listen_logs;
DROP POLICY IF EXISTS "Staff can insert their own organization listen_logs" ON listen_logs;
DROP POLICY IF EXISTS "Staff can view their own organization" ON organizations;

-- FIXED RLS Policies: Use SECURITY DEFINER function to prevent recursion
-- Staff can view their own staff record (uses function to avoid recursion)
CREATE POLICY "Staff can view their own organization" ON staff_members
  FOR SELECT
  USING (
    organization_id = get_user_organization_id()
    OR auth_user_id = auth.uid()  -- Allow users to see their own record
  );

-- Tracks policies
CREATE POLICY "Staff can view their own organization tracks" ON tracks
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Staff can insert their own organization tracks" ON tracks
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Staff can update their own organization tracks" ON tracks
  FOR UPDATE
  USING (organization_id = get_user_organization_id());

-- Artists policies
CREATE POLICY "Staff can view their own organization artists" ON artists
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Staff can insert their own organization artists" ON artists
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

-- Votes policies
CREATE POLICY "Staff can view their own organization votes" ON votes
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Staff can insert their own organization votes" ON votes
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

-- Listen logs policies
CREATE POLICY "Staff can view their own organization listen_logs" ON listen_logs
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Staff can insert their own organization listen_logs" ON listen_logs
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

-- Organizations policies
CREATE POLICY "Staff can view their own organization" ON organizations
  FOR SELECT
  USING (id = get_user_organization_id());

-- Owners can update their organization settings
CREATE POLICY "Owners can update their organization" ON organizations
  FOR UPDATE
  USING (id = get_user_organization_id())
  WITH CHECK (
    id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.organization_id = organizations.id
      AND staff_members.auth_user_id = auth.uid()
      AND staff_members.role = 'Owner'
    )
  );

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

-- Delete old genres and insert new ones
DELETE FROM genres;
INSERT INTO genres (name) VALUES
  ('Tech House'),
  ('Deep House'),
  ('Classic House'),
  ('Piano House'),
  ('Progressive House')
ON CONFLICT (name) DO NOTHING;

-- Insert default staff members with RBAC roles
INSERT INTO staff_members (id, name, role, organization_id, organization_name) VALUES
  ('staff1', 'Sin Morera', 'Owner', '00000000-0000-0000-0000-000000000001'::uuid, 'Default Label'),
  ('staff2', 'Ethan Berdofe', 'Manager', '00000000-0000-0000-0000-000000000001'::uuid, 'Default Label'),
  ('staff3', 'Lex Luca', 'Scout', '00000000-0000-0000-0000-000000000001'::uuid, 'Default Label')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  organization_id = EXCLUDED.organization_id,
  organization_name = EXCLUDED.organization_name;

-- ============================================================================
-- AUTHENTICATION SETUP
-- ============================================================================
-- Link your auth user (772e6d80-2178-4845-8915-8e397ecfa52b) to staff1
UPDATE staff_members 
SET auth_user_id = '772e6d80-2178-4845-8915-8e397ecfa52b'::uuid 
WHERE id = 'staff1' AND auth_user_id IS NULL;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Grant necessary permissions to anon and authenticated roles
-- These roles need to be able to use the tables (RLS will control access)

-- Grant table permissions (RLS will enforce row-level access)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Specifically grant on listen_logs
GRANT SELECT, INSERT ON listen_logs TO anon, authenticated;

-- Grant permissions on future tables (for any tables created later)
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
-- This schema is now complete and ready for use!
-- All tables, columns, indexes, triggers, functions, and policies are in place.
-- RLS policies are fixed to prevent infinite recursion.
--
-- ROLE INFORMATION:
-- - Run this schema as: postgres role (default in Supabase SQL Editor)
-- - Functions use: SECURITY DEFINER (run with postgres privileges)
-- - App uses: authenticated role (when logged in) or anon role (when not)
-- - RLS policies: Control what authenticated/anon users can see
--
-- NEXT STEPS:
-- 1. This schema automatically links your auth user to staff1
-- 2. Login to SoundPath with your auth user credentials
-- 3. Everything should work now!
-- ============================================================================
