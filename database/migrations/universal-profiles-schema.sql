-- Migration: Universal User Profiles with Multiple Label Memberships
-- Run this script in Supabase SQL Editor to enable multi-label support

-- ============================================================================
-- 1. CREATE MEMBERSHIPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('Owner', 'Manager', 'Scout', 'SystemAdmin')),
  permissions_json JSONB DEFAULT '{
    "can_vote": true,
    "can_set_energy": true,
    "can_advance_lobby": true,
    "can_advance_office": false,
    "can_advance_contract": false,
    "can_access_archive": true,
    "can_access_vault": true,
    "can_edit_release_date": false,
    "can_view_metrics": false
  }'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_organization_id ON memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_active ON memberships(active) WHERE active = true;

-- ============================================================================
-- 2. MIGRATE EXISTING DATA
-- ============================================================================
-- Migrate existing staff_members to memberships
DO $$
DECLARE
  staff_record RECORD;
BEGIN
  FOR staff_record IN 
    SELECT id, organization_id, role, 
           can_vote, can_set_energy, can_advance_lobby, can_advance_office,
           can_advance_contract, can_access_archive, can_access_vault,
           can_edit_release_date, can_view_metrics
    FROM staff_members
    WHERE organization_id IS NOT NULL
  LOOP
    -- Insert membership if it doesn't exist
    INSERT INTO memberships (
      user_id, 
      organization_id, 
      role,
      permissions_json
    )
    VALUES (
      staff_record.id,
      staff_record.organization_id,
      staff_record.role,
      jsonb_build_object(
        'can_vote', COALESCE(staff_record.can_vote, true),
        'can_set_energy', COALESCE(staff_record.can_set_energy, true),
        'can_advance_lobby', COALESCE(staff_record.can_advance_lobby, true),
        'can_advance_office', COALESCE(staff_record.can_advance_office, false),
        'can_advance_contract', COALESCE(staff_record.can_advance_contract, false),
        'can_access_archive', COALESCE(staff_record.can_access_archive, true),
        'can_access_vault', COALESCE(staff_record.can_access_vault, true),
        'can_edit_release_date', COALESCE(staff_record.can_edit_release_date, false),
        'can_view_metrics', COALESCE(staff_record.can_view_metrics, false)
      )
    )
    ON CONFLICT (user_id, organization_id) DO NOTHING;
  END LOOP;
END $$;

-- ============================================================================
-- 3. CREATE INVITES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Owner', 'Manager', 'Scout')),
  permissions_json JSONB DEFAULT '{
    "can_vote": true,
    "can_set_energy": true,
    "can_advance_lobby": true,
    "can_advance_office": false,
    "can_advance_contract": false,
    "can_access_archive": true,
    "can_access_vault": true,
    "can_edit_release_date": false,
    "can_view_metrics": false
  }'::jsonb,
  invited_by TEXT REFERENCES staff_members(id),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);
CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_organization_id ON invites(organization_id);

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Get user's active memberships
CREATE OR REPLACE FUNCTION get_user_memberships(user_id_param TEXT)
RETURNS TABLE (
  membership_id UUID,
  organization_id UUID,
  organization_name TEXT,
  organization_slug TEXT,
  role TEXT,
  permissions_json JSONB,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as membership_id,
    m.organization_id,
    o.name as organization_name,
    o.slug as organization_slug,
    m.role,
    m.permissions_json,
    m.active as is_active
  FROM memberships m
  JOIN organizations o ON o.id = m.organization_id
  WHERE m.user_id = user_id_param
    AND m.active = true
  ORDER BY o.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_memberships(TEXT) TO authenticated;

-- Get active membership for user and organization
CREATE OR REPLACE FUNCTION get_active_membership(user_id_param TEXT, org_id_param UUID)
RETURNS TABLE (
  membership_id UUID,
  role TEXT,
  permissions_json JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as membership_id,
    m.role,
    m.permissions_json
  FROM memberships m
  WHERE m.user_id = user_id_param
    AND m.organization_id = org_id_param
    AND m.active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_active_membership(TEXT, UUID) TO authenticated;

-- Accept invite and create membership
CREATE OR REPLACE FUNCTION accept_invite(invite_token TEXT, user_id_param TEXT)
RETURNS JSONB AS $$
DECLARE
  invite_record RECORD;
  new_membership_id UUID;
BEGIN
  -- Get invite
  SELECT * INTO invite_record
  FROM invites
  WHERE token = invite_token
    AND expires_at > NOW()
    AND accepted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired invite'
    );
  END IF;
  
  -- Check if user already has membership
  IF EXISTS (
    SELECT 1 FROM memberships 
    WHERE user_id = user_id_param 
      AND organization_id = invite_record.organization_id
  ) THEN
    -- Update existing membership
    UPDATE memberships
    SET role = invite_record.role,
        permissions_json = invite_record.permissions_json,
        active = true,
        updated_at = NOW()
    WHERE user_id = user_id_param
      AND organization_id = invite_record.organization_id
    RETURNING id INTO new_membership_id;
  ELSE
    -- Create new membership
    INSERT INTO memberships (
      user_id,
      organization_id,
      role,
      permissions_json
    )
    VALUES (
      user_id_param,
      invite_record.organization_id,
      invite_record.role,
      invite_record.permissions_json
    )
    RETURNING id INTO new_membership_id;
  END IF;
  
  -- Mark invite as accepted
  UPDATE invites
  SET accepted_at = NOW()
  WHERE id = invite_record.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'membership_id', new_membership_id,
    'organization_id', invite_record.organization_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION accept_invite(TEXT, TEXT) TO authenticated;

-- ============================================================================
-- 5. UPDATE RLS POLICIES
-- ============================================================================

-- Memberships: Users can view their own memberships
DROP POLICY IF EXISTS "Users can view their own memberships" ON memberships;
CREATE POLICY "Users can view their own memberships" ON memberships
  FOR SELECT
  USING (user_id = (SELECT id FROM staff_members WHERE auth_user_id = auth.uid() LIMIT 1));

-- Memberships: Owners can manage memberships for their organization
DROP POLICY IF EXISTS "Owners can manage memberships" ON memberships;
CREATE POLICY "Owners can manage memberships" ON memberships
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN staff_members sm ON sm.id = m.user_id
      WHERE sm.auth_user_id = auth.uid()
        AND m.organization_id = memberships.organization_id
        AND m.role = 'Owner'
        AND m.active = true
    )
  );

-- Invites: Users can view invites for their email
DROP POLICY IF EXISTS "Users can view their invites" ON invites;
CREATE POLICY "Users can view their invites" ON invites
  FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM memberships m
      JOIN staff_members sm ON sm.id = m.user_id
      WHERE sm.auth_user_id = auth.uid()
        AND m.organization_id = invites.organization_id
        AND m.role = 'Owner'
        AND m.active = true
    )
  );

-- Invites: Owners can create invites
DROP POLICY IF EXISTS "Owners can create invites" ON invites;
CREATE POLICY "Owners can create invites" ON invites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN staff_members sm ON sm.id = m.user_id
      WHERE sm.auth_user_id = auth.uid()
        AND m.organization_id = invites.organization_id
        AND m.role = 'Owner'
        AND m.active = true
    )
  );

-- ============================================================================
-- 6. UPDATE EXISTING RLS POLICIES TO USE MEMBERSHIPS
-- ============================================================================

-- Helper function to get user's organization IDs from memberships
CREATE OR REPLACE FUNCTION get_user_organization_ids()
RETURNS UUID[] AS $$
DECLARE
  user_staff_id TEXT;
BEGIN
  SELECT id INTO user_staff_id
  FROM staff_members
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  IF user_staff_id IS NULL THEN
    RETURN ARRAY[]::UUID[];
  END IF;
  
  RETURN ARRAY(
    SELECT organization_id
    FROM memberships
    WHERE user_id = user_staff_id
      AND active = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_organization_ids() TO authenticated;

-- Update tracks policy to use memberships
DROP POLICY IF EXISTS "Staff can view their own organization tracks" ON tracks;
CREATE POLICY "Staff can view their own organization tracks" ON tracks
  FOR SELECT
  USING (
    is_system_admin() 
    OR organization_id = ANY(get_user_organization_ids())
  );

-- Update artists policy
DROP POLICY IF EXISTS "Staff can view their own organization artists" ON artists;
CREATE POLICY "Staff can view their own organization artists" ON artists
  FOR SELECT
  USING (
    is_system_admin() 
    OR organization_id = ANY(get_user_organization_ids())
  );

-- Update organizations policy
DROP POLICY IF EXISTS "Staff can view their own organization" ON organizations;
CREATE POLICY "Staff can view their own organization" ON organizations
  FOR SELECT
  USING (
    is_system_admin() 
    OR id = ANY(get_user_organization_ids())
  );

-- Update votes policy
DROP POLICY IF EXISTS "Staff can view their own organization votes" ON votes;
CREATE POLICY "Staff can view their own organization votes" ON votes
  FOR SELECT
  USING (
    is_system_admin() 
    OR organization_id = ANY(get_user_organization_ids())
  );

-- Update listen_logs policy
DROP POLICY IF EXISTS "Staff can view their own organization listen_logs" ON listen_logs;
CREATE POLICY "Staff can view their own organization listen_logs" ON listen_logs
  FOR SELECT
  USING (
    is_system_admin() 
    OR organization_id = ANY(get_user_organization_ids())
  );

-- ============================================================================
-- VERIFY MIGRATION
-- ============================================================================
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'memberships')
    THEN '✅ memberships table exists'
    ELSE '❌ memberships table NOT found'
  END as memberships_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invites')
    THEN '✅ invites table exists'
    ELSE '❌ invites table NOT found'
  END as invites_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_memberships')
    THEN '✅ get_user_memberships function exists'
    ELSE '❌ get_user_memberships function NOT found'
  END as function_check;
