-- ============================================================================
-- Organizational Hierarchy (Parent/Subsidiary) for SoundPath OS
-- Run after universal-profiles-schema and system-admin-schema
-- ============================================================================
-- Adds parent_id to organizations, recursive hierarchy helpers, and RLS so
-- Managers at a Parent have View access to all Child organizations.
-- ============================================================================

-- ============================================================================
-- 1. ADD parent_id TO organizations
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE organizations
      ADD COLUMN parent_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_organizations_parent_id ON organizations(parent_id);
    COMMENT ON COLUMN organizations.parent_id IS 'Parent organization for subsidiary/child hierarchy';
  END IF;
END $$;

-- ============================================================================
-- 2. RECURSIVE HIERARCHY: get_org_descendant_ids(org_id)
-- Returns the given org_id plus all descendant (child) organization IDs.
-- ============================================================================
CREATE OR REPLACE FUNCTION get_org_descendant_ids(org_id_param UUID)
RETURNS UUID[] AS $$
  WITH RECURSIVE descendants AS (
    SELECT id FROM organizations WHERE id = org_id_param
    UNION ALL
    SELECT o.id FROM organizations o
    INNER JOIN descendants d ON o.parent_id = d.id
  )
  SELECT ARRAY(SELECT id FROM descendants);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_org_descendant_ids(UUID) TO authenticated;

-- ============================================================================
-- 3. VIEW / FUNCTION: get_org_hierarchy(parent_org_id)
-- Returns all child organizations for a given parent (id, name, parent_id, depth).
-- ============================================================================
CREATE OR REPLACE FUNCTION get_org_hierarchy(parent_org_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  parent_id UUID,
  depth INTEGER
) AS $$
  WITH RECURSIVE hierarchy AS (
    SELECT o.id, o.name, o.parent_id, 0 AS depth
    FROM organizations o
    WHERE o.id = parent_org_id
    UNION ALL
    SELECT o.id, o.name, o.parent_id, h.depth + 1
    FROM organizations o
    INNER JOIN hierarchy h ON o.parent_id = h.id
  )
  SELECT hierarchy.id, hierarchy.name, hierarchy.parent_id, hierarchy.depth FROM hierarchy;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_org_hierarchy(UUID) TO authenticated;

-- ============================================================================
-- 4. VISIBLE ORGS: get_visible_organization_ids()
-- Org IDs the current user can at least VIEW (direct memberships + descendants
-- of orgs where user is Owner/Manager). Used for SELECT RLS only.
-- ============================================================================
CREATE OR REPLACE FUNCTION get_visible_organization_ids()
RETURNS UUID[] AS $$
DECLARE
  user_staff_id TEXT;
  result_ids UUID[] := '{}';
  member_record RECORD;
  descendant_ids UUID[];
BEGIN
  SELECT sm.id INTO user_staff_id
  FROM staff_members sm
  WHERE sm.auth_user_id = auth.uid()
  LIMIT 1;

  IF user_staff_id IS NULL THEN
    RETURN result_ids;
  END IF;

  -- Direct memberships: always visible
  SELECT ARRAY_AGG(m.organization_id) INTO result_ids
  FROM memberships m
  WHERE m.user_id = user_staff_id AND m.active = true;

  result_ids := COALESCE(result_ids, '{}');

  -- For each org where user is Owner or Manager, add all descendant orgs (View access)
  FOR member_record IN
    SELECT m.organization_id, m.role
    FROM memberships m
    WHERE m.user_id = user_staff_id AND m.active = true
      AND m.role IN ('Owner', 'Manager')
  LOOP
    SELECT get_org_descendant_ids(member_record.organization_id) INTO descendant_ids;
    result_ids := result_ids || descendant_ids;
  END LOOP;

  -- Deduplicate
  result_ids := ARRAY(SELECT DISTINCT unnest(result_ids));

  RETURN result_ids;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_visible_organization_ids() TO authenticated;

-- ============================================================================
-- 5. RLS: SELECT uses get_visible_organization_ids() for hierarchy view
-- INSERT/UPDATE/DELETE remain scoped to get_user_organization_ids()
-- ============================================================================

-- Organizations: can SELECT if org is in visible set
DROP POLICY IF EXISTS "Staff can view their own organization" ON organizations;
CREATE POLICY "Staff can view their own organization" ON organizations
  FOR SELECT
  USING (
    is_system_admin()
    OR id = ANY(get_visible_organization_ids())
  );

-- Owners can update their organization (direct membership, Owner role)
DROP POLICY IF EXISTS "Owners can update their organization" ON organizations;
CREATE POLICY "Owners can update their organization" ON organizations
  FOR UPDATE
  USING (
    id = ANY(get_user_organization_ids())
    AND EXISTS (
      SELECT 1 FROM memberships m
      JOIN staff_members sm ON sm.id = m.user_id
      WHERE sm.auth_user_id = auth.uid()
        AND m.organization_id = organizations.id
        AND m.role = 'Owner'
        AND m.active = true
    )
  )
  WITH CHECK (
    id = ANY(get_user_organization_ids())
    AND EXISTS (
      SELECT 1 FROM memberships m
      JOIN staff_members sm ON sm.id = m.user_id
      WHERE sm.auth_user_id = auth.uid()
        AND m.organization_id = organizations.id
        AND m.role = 'Owner'
        AND m.active = true
    )
  );

-- Tracks: SELECT visible orgs; INSERT/UPDATE/DELETE only direct membership orgs
DROP POLICY IF EXISTS "Staff can view their own organization tracks" ON tracks;
CREATE POLICY "Staff can view their own organization tracks" ON tracks
  FOR SELECT
  USING (
    is_system_admin()
    OR organization_id = ANY(get_visible_organization_ids())
  );

DROP POLICY IF EXISTS "Staff can insert their own organization tracks" ON tracks;
CREATE POLICY "Staff can insert their own organization tracks" ON tracks
  FOR INSERT
  WITH CHECK (organization_id = ANY(get_user_organization_ids()));

DROP POLICY IF EXISTS "Staff can update their own organization tracks" ON tracks;
CREATE POLICY "Staff can update their own organization tracks" ON tracks
  FOR UPDATE
  USING (organization_id = ANY(get_user_organization_ids()));

-- Artists
DROP POLICY IF EXISTS "Staff can view their own organization artists" ON artists;
CREATE POLICY "Staff can view their own organization artists" ON artists
  FOR SELECT
  USING (
    is_system_admin()
    OR organization_id = ANY(get_visible_organization_ids())
  );

-- Votes
DROP POLICY IF EXISTS "Staff can view their own organization votes" ON votes;
CREATE POLICY "Staff can view their own organization votes" ON votes
  FOR SELECT
  USING (
    is_system_admin()
    OR organization_id = ANY(get_visible_organization_ids())
  );

-- Listen logs
DROP POLICY IF EXISTS "Staff can view their own organization listen_logs" ON listen_logs;
CREATE POLICY "Staff can view their own organization listen_logs" ON listen_logs
  FOR SELECT
  USING (
    is_system_admin()
    OR organization_id = ANY(get_visible_organization_ids())
  );

-- ============================================================================
-- 6. RPC for client: get_org_children(org_id) – list direct children only
-- ============================================================================
CREATE OR REPLACE FUNCTION get_org_children(org_id_param UUID)
RETURNS TABLE (id UUID, name TEXT) AS $$
  SELECT o.id, o.name
  FROM organizations o
  WHERE o.parent_id = org_id_param
  ORDER BY o.name;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_org_children(UUID) TO authenticated;

-- ============================================================================
-- 7. RPC for client: get_org_breadcrumb(org_id) – parent chain for breadcrumb
-- Returns rows (id, name) from root to org (e.g. Parent, Child).
-- ============================================================================
CREATE OR REPLACE FUNCTION get_org_breadcrumb(org_id_param UUID)
RETURNS TABLE (id UUID, name TEXT, depth INTEGER) AS $$
  WITH RECURSIVE chain AS (
    SELECT o.id, o.name, 0 AS depth
    FROM organizations o
    WHERE o.id = org_id_param
    UNION ALL
    SELECT o.id, o.name, c.depth + 1
    FROM organizations o
    INNER JOIN chain c ON c.id = o.parent_id
  )
  SELECT chain.id, chain.name, chain.depth FROM chain ORDER BY chain.depth DESC;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_org_breadcrumb(UUID) TO authenticated;

-- ============================================================================
-- 8. RPC for client: get_user_memberships_with_hierarchy(user_id)
-- Same as get_user_memberships plus parent_id, parent_name for tree/breadcrumb UI.
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_memberships_with_hierarchy(user_id_param TEXT)
RETURNS TABLE (
  membership_id UUID,
  organization_id UUID,
  organization_name TEXT,
  organization_slug TEXT,
  role TEXT,
  permissions_json JSONB,
  is_active BOOLEAN,
  parent_id UUID,
  parent_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id AS membership_id,
    m.organization_id,
    o.name AS organization_name,
    o.name AS organization_slug,
    m.role,
    m.permissions_json,
    m.active AS is_active,
    p.id AS parent_id,
    p.name AS parent_name
  FROM memberships m
  JOIN organizations o ON o.id = m.organization_id
  LEFT JOIN organizations p ON p.id = o.parent_id
  WHERE m.user_id = user_id_param
    AND m.active = true
  ORDER BY p.name NULLS FIRST, o.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_memberships_with_hierarchy(TEXT) TO authenticated;
