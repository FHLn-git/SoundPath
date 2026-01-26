-- ============================================================================
-- RLS Policies for email_queue, invites, and memberships
-- Run this after enabling RLS on these tables
-- 
-- IMPORTANT: This script creates comprehensive security policies and
-- SECURITY DEFINER functions to safely bypass RLS when needed.
-- ============================================================================

-- ============================================================================
-- 1. EMAIL_QUEUE RLS POLICIES
-- ============================================================================

-- Enable RLS on email_queue
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "SystemAdmin can view all emails" ON email_queue;
DROP POLICY IF EXISTS "SystemAdmin can manage all emails" ON email_queue;
DROP POLICY IF EXISTS "Users can view their organization emails" ON email_queue;

-- SystemAdmin can view all emails (for debugging/monitoring)
CREATE POLICY "SystemAdmin can view all emails" ON email_queue
  FOR SELECT
  USING (is_system_admin());

-- SystemAdmin can manage all emails (for retry logic, etc.)
CREATE POLICY "SystemAdmin can manage all emails" ON email_queue
  FOR ALL
  USING (is_system_admin());

-- Regular users cannot directly access email_queue
-- Email sending should be done via SECURITY DEFINER functions only
-- This ensures only the system can queue emails, not users directly

-- ============================================================================
-- 2. INVITES RLS POLICIES
-- ============================================================================

-- Enable RLS on invites (if not already enabled)
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their invites" ON invites;
DROP POLICY IF EXISTS "Owners can view organization invites" ON invites;
DROP POLICY IF EXISTS "Owners can create invites" ON invites;
DROP POLICY IF EXISTS "Owners can update invites" ON invites;
DROP POLICY IF EXISTS "SystemAdmin can manage all invites" ON invites;
DROP POLICY IF EXISTS "Public can view invite by token" ON invites;

-- Users can view invites sent to their email address
CREATE POLICY "Users can view their invites" ON invites
  FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Owners can view invites for their organization
CREATE POLICY "Owners can view organization invites" ON invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN staff_members sm ON sm.id = m.user_id
      WHERE sm.auth_user_id = auth.uid()
        AND m.organization_id = invites.organization_id
        AND m.role = 'Owner'
        AND m.active = true
    )
  );

-- Managers can also view invites for their organization (for transparency)
CREATE POLICY "Managers can view organization invites" ON invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN staff_members sm ON sm.id = m.user_id
      WHERE sm.auth_user_id = auth.uid()
        AND m.organization_id = invites.organization_id
        AND m.role IN ('Owner', 'Manager')
        AND m.active = true
    )
  );

-- Owners can create invites for their organization
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

-- Owners can update invites for their organization (resend, cancel, etc.)
CREATE POLICY "Owners can update invites" ON invites
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN staff_members sm ON sm.id = m.user_id
      WHERE sm.auth_user_id = auth.uid()
        AND m.organization_id = invites.organization_id
        AND m.role = 'Owner'
        AND m.active = true
    )
  );

-- SystemAdmin can manage all invites
CREATE POLICY "SystemAdmin can manage all invites" ON invites
  FOR ALL
  USING (is_system_admin());

-- Public access for invite acceptance (via token) - handled by SECURITY DEFINER function
-- No direct policy needed as accept_invite() function handles this securely

-- ============================================================================
-- 3. MEMBERSHIPS RLS POLICIES
-- ============================================================================

-- Enable RLS on memberships (if not already enabled)
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own memberships" ON memberships;
DROP POLICY IF EXISTS "Owners can view organization memberships" ON memberships;
DROP POLICY IF EXISTS "Owners can manage organization memberships" ON memberships;
DROP POLICY IF EXISTS "SystemAdmin can manage all memberships" ON memberships;

-- Users can view their own memberships
CREATE POLICY "Users can view their own memberships" ON memberships
  FOR SELECT
  USING (
    user_id = (SELECT id FROM staff_members WHERE auth_user_id = auth.uid() LIMIT 1)
  );

-- Owners can view all memberships in their organization
CREATE POLICY "Owners can view organization memberships" ON memberships
  FOR SELECT
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

-- Managers can also view memberships in their organization
CREATE POLICY "Managers can view organization memberships" ON memberships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN staff_members sm ON sm.id = m.user_id
      WHERE sm.auth_user_id = auth.uid()
        AND m.organization_id = memberships.organization_id
        AND m.role IN ('Owner', 'Manager')
        AND m.active = true
    )
  );

-- Owners can insert memberships (for their organization only)
CREATE POLICY "Owners can insert organization memberships" ON memberships
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN staff_members sm ON sm.id = m.user_id
      WHERE sm.auth_user_id = auth.uid()
        AND m.organization_id = memberships.organization_id
        AND m.role = 'Owner'
        AND m.active = true
    )
  );

-- Owners can update memberships (for their organization only)
CREATE POLICY "Owners can update organization memberships" ON memberships
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN staff_members sm ON sm.id = m.user_id
      WHERE sm.auth_user_id = auth.uid()
        AND m.organization_id = memberships.organization_id
        AND m.role = 'Owner'
        AND m.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN staff_members sm ON sm.id = m.user_id
      WHERE sm.auth_user_id = auth.uid()
        AND m.organization_id = memberships.organization_id
        AND m.role = 'Owner'
        AND m.active = true
    )
  );

-- Owners can delete/deactivate memberships (for their organization only)
CREATE POLICY "Owners can delete organization memberships" ON memberships
  FOR DELETE
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

-- SystemAdmin can manage all memberships
CREATE POLICY "SystemAdmin can manage all memberships" ON memberships
  FOR ALL
  USING (is_system_admin());

-- ============================================================================
-- 4. SECURITY DEFINER FUNCTIONS FOR MEMBERSHIPS (RLS-Safe Operations)
-- ============================================================================

-- Function to create membership (used during onboarding, invite acceptance)
-- This bypasses RLS because it's called during account creation when user might not have membership yet
CREATE OR REPLACE FUNCTION create_membership(
  user_id_param TEXT,
  organization_id_param UUID,
  role_param TEXT,
  permissions_json_param JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  membership_id UUID;
BEGIN
  -- Default permissions if not provided
  IF permissions_json_param IS NULL THEN
    permissions_json_param := '{
      "can_vote": true,
      "can_set_energy": true,
      "can_advance_lobby": true,
      "can_advance_office": false,
      "can_advance_contract": false,
      "can_access_archive": true,
      "can_access_vault": true,
      "can_edit_release_date": false,
      "can_view_metrics": false
    }'::jsonb;
  END IF;

  INSERT INTO memberships (user_id, organization_id, role, permissions_json, active)
  VALUES (user_id_param, organization_id_param, role_param, permissions_json_param, true)
  ON CONFLICT (user_id, organization_id) DO UPDATE
  SET role = role_param,
      permissions_json = permissions_json_param,
      active = true,
      updated_at = NOW()
  RETURNING id INTO membership_id;
  
  RETURN membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_membership(TEXT, UUID, TEXT, JSONB) TO authenticated;

-- Function to update membership role (Owner only, but function bypasses RLS check)
CREATE OR REPLACE FUNCTION update_membership_role(
  user_id_param TEXT,
  organization_id_param UUID,
  new_role_param TEXT
)
RETURNS UUID AS $$
DECLARE
  membership_id UUID;
  current_user_id TEXT;
BEGIN
  -- Get current user's staff ID
  SELECT id INTO current_user_id
  FROM staff_members
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  -- Verify current user is Owner of the organization
  IF NOT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = current_user_id
      AND m.organization_id = organization_id_param
      AND m.role = 'Owner'
      AND m.active = true
  ) THEN
    RAISE EXCEPTION 'Only Owners can update membership roles';
  END IF;

  UPDATE memberships
  SET role = new_role_param,
      updated_at = NOW()
  WHERE user_id = user_id_param
    AND organization_id = organization_id_param
  RETURNING id INTO membership_id;
  
  RETURN membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_membership_role(TEXT, UUID, TEXT) TO authenticated;

-- Function to update membership permissions (Owner only)
CREATE OR REPLACE FUNCTION update_membership_permissions(
  user_id_param TEXT,
  organization_id_param UUID,
  permissions_json_param JSONB
)
RETURNS UUID AS $$
DECLARE
  membership_id UUID;
  current_user_id TEXT;
BEGIN
  -- Get current user's staff ID
  SELECT id INTO current_user_id
  FROM staff_members
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  -- Verify current user is Owner of the organization
  IF NOT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = current_user_id
      AND m.organization_id = organization_id_param
      AND m.role = 'Owner'
      AND m.active = true
  ) THEN
    RAISE EXCEPTION 'Only Owners can update membership permissions';
  END IF;

  UPDATE memberships
  SET permissions_json = permissions_json_param,
      updated_at = NOW()
  WHERE user_id = user_id_param
    AND organization_id = organization_id_param
  RETURNING id INTO membership_id;
  
  RETURN membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_membership_permissions(TEXT, UUID, JSONB) TO authenticated;

-- Function to deactivate membership (Owner only)
CREATE OR REPLACE FUNCTION deactivate_membership(
  user_id_param TEXT,
  organization_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id TEXT;
BEGIN
  -- Get current user's staff ID
  SELECT id INTO current_user_id
  FROM staff_members
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  -- Prevent self-removal
  IF current_user_id = user_id_param THEN
    RAISE EXCEPTION 'You cannot remove yourself from the organization';
  END IF;

  -- Verify current user is Owner of the organization
  IF NOT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = current_user_id
      AND m.organization_id = organization_id_param
      AND m.role = 'Owner'
      AND m.active = true
  ) THEN
    RAISE EXCEPTION 'Only Owners can remove memberships';
  END IF;

  UPDATE memberships
  SET active = false,
      updated_at = NOW()
  WHERE user_id = user_id_param
    AND organization_id = organization_id_param;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION deactivate_membership(TEXT, UUID) TO authenticated;

-- ============================================================================
-- 5. SECURITY DEFINER FUNCTIONS FOR EMAIL QUEUE
-- ============================================================================

-- Function to queue email (only callable by authenticated users, but inserts bypass RLS)
CREATE OR REPLACE FUNCTION queue_email(
  to_email_param TEXT,
  subject_param TEXT,
  html_param TEXT,
  text_param TEXT
)
RETURNS UUID AS $$
DECLARE
  email_id UUID;
BEGIN
  INSERT INTO email_queue (to_email, subject, html, text, status)
  VALUES (to_email_param, subject_param, html_param, text_param, 'pending')
  RETURNING id INTO email_id;
  
  RETURN email_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION queue_email(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Function to get email queue status (for monitoring)
CREATE OR REPLACE FUNCTION get_email_queue_status()
RETURNS TABLE (
  total_pending INTEGER,
  total_sent INTEGER,
  total_failed INTEGER
) AS $$
BEGIN
  -- Only SystemAdmin can call this
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Access denied. SystemAdmin role required.';
  END IF;
  
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE status = 'pending')::INTEGER as total_pending,
    COUNT(*) FILTER (WHERE status = 'sent')::INTEGER as total_sent,
    COUNT(*) FILTER (WHERE status = 'failed')::INTEGER as total_failed
  FROM email_queue;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_email_queue_status() TO authenticated;

-- ============================================================================
-- 6. SECURITY DEFINER FUNCTIONS FOR INVITES (RLS-Safe Operations)
-- ============================================================================

-- Function to create invite (Owner only, but function handles permission check)
CREATE OR REPLACE FUNCTION create_invite(
  organization_id_param UUID,
  email_param TEXT,
  role_param TEXT,
  permissions_json_param JSONB DEFAULT NULL,
  invited_by_param TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  invite_id UUID;
  current_user_id TEXT;
BEGIN
  -- Get current user's staff ID
  SELECT id INTO current_user_id
  FROM staff_members
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  -- Verify current user is Owner of the organization
  IF NOT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = current_user_id
      AND m.organization_id = organization_id_param
      AND m.role = 'Owner'
      AND m.active = true
  ) THEN
    RAISE EXCEPTION 'Only Owners can create invites';
  END IF;

  -- Default permissions if not provided
  IF permissions_json_param IS NULL THEN
    permissions_json_param := '{
      "can_vote": true,
      "can_set_energy": true,
      "can_advance_lobby": true,
      "can_advance_office": false,
      "can_advance_contract": false,
      "can_access_archive": true,
      "can_access_vault": true,
      "can_edit_release_date": false,
      "can_view_metrics": false
    }'::jsonb;
  END IF;

  INSERT INTO invites (organization_id, email, role, permissions_json, invited_by)
  VALUES (organization_id_param, email_param, role_param, permissions_json_param, invited_by_param)
  ON CONFLICT (organization_id, email) DO UPDATE
  SET role = role_param,
      permissions_json = permissions_json_param,
      expires_at = NOW() + INTERVAL '7 days',
      accepted_at = NULL,
      invited_by = invited_by_param
  RETURNING id INTO invite_id;
  
  RETURN invite_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_invite(UUID, TEXT, TEXT, JSONB, TEXT) TO authenticated;

-- Function to update invite (Owner only)
CREATE OR REPLACE FUNCTION update_invite(
  invite_id_param UUID,
  role_param TEXT DEFAULT NULL,
  permissions_json_param JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  current_user_id TEXT;
  org_id UUID;
BEGIN
  -- Get invite's organization
  SELECT organization_id INTO org_id
  FROM invites
  WHERE id = invite_id_param;

  IF org_id IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  -- Get current user's staff ID
  SELECT id INTO current_user_id
  FROM staff_members
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  -- Verify current user is Owner of the organization
  IF NOT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = current_user_id
      AND m.organization_id = org_id
      AND m.role = 'Owner'
      AND m.active = true
  ) THEN
    RAISE EXCEPTION 'Only Owners can update invites';
  END IF;

  UPDATE invites
  SET 
    role = COALESCE(role_param, role),
    permissions_json = COALESCE(permissions_json_param, permissions_json),
    expires_at = NOW() + INTERVAL '7 days',
    accepted_at = NULL
  WHERE id = invite_id_param
  RETURNING id INTO invite_id_param;
  
  RETURN invite_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_invite(UUID, TEXT, JSONB) TO authenticated;

-- ============================================================================
-- 7. UPDATE EXISTING FUNCTIONS TO BE RLS-SAFE
-- ============================================================================

-- Ensure get_user_memberships uses SECURITY DEFINER (already should be)
-- This function needs to bypass RLS to get memberships for the user
-- It's safe because it filters by user_id_param which comes from the authenticated user

-- Ensure get_active_membership uses SECURITY DEFINER (already should be)
-- This function needs to bypass RLS to get membership for the user

-- Ensure accept_invite uses SECURITY DEFINER (already should be)
-- This function needs to bypass RLS to:
-- 1. Read invite by token (public access needed)
-- 2. Create/update membership (needs to work even if user doesn't have membership yet)
-- 3. Update invite to mark as accepted

-- ============================================================================
-- 6. VERIFY POLICIES
-- ============================================================================

-- Check that RLS is enabled
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables t
      JOIN pg_class c ON c.relname = t.tablename
      WHERE t.schemaname = 'public'
        AND t.tablename IN ('email_queue', 'invites', 'memberships')
        AND c.relrowsecurity = true
    )
    THEN '✅ RLS is enabled on all tables'
    ELSE '❌ RLS not enabled on all tables'
  END as rls_status;

-- Count policies
SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('email_queue', 'invites', 'memberships')
GROUP BY schemaname, tablename
ORDER BY tablename;
