-- ============================================================================
-- Corporate Hierarchy & Resource Inheritance for SoundPath VENUE
-- Run after: venues-and-shows-schema.sql, venues-address-fields.sql
-- Optional: organization-hierarchy.sql (for org linkage)
-- ============================================================================
-- Shell/Node model: VenueGroups → Venues → Stages. Events (shows) link to
-- one or many stages (festival mode). Permissions: Group Admin, Venue Manager,
-- Stage Hand/Tech via venue_roles.
-- ============================================================================

-- ============================================================================
-- 1. VENUE_GROUPS
-- ============================================================================
CREATE TABLE IF NOT EXISTS venue_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venue_groups_owner_id ON venue_groups(owner_id);
ALTER TABLE venue_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own venue groups"
  ON venue_groups FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own venue groups"
  ON venue_groups FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own venue groups"
  ON venue_groups FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own venue groups"
  ON venue_groups FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================================================
-- 2. VENUES: add group_id, timezone, shared_facilities_json
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'venues' AND column_name = 'group_id') THEN
    ALTER TABLE venues ADD COLUMN group_id UUID REFERENCES venue_groups(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_venues_group_id ON venues(group_id);
    COMMENT ON COLUMN venues.group_id IS 'Parent venue group (corporate hierarchy)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'venues' AND column_name = 'timezone') THEN
    ALTER TABLE venues ADD COLUMN timezone TEXT;
    COMMENT ON COLUMN venues.timezone IS 'IANA timezone (e.g. America/New_York)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'venues' AND column_name = 'shared_facilities_json') THEN
    ALTER TABLE venues ADD COLUMN shared_facilities_json JSONB DEFAULT '[]'::jsonb;
    COMMENT ON COLUMN venues.shared_facilities_json IS 'Shared resources: e.g. [{ "id": "...", "name": "Green Room 1", "status": "occupied" }]';
  END IF;
END $$;

-- ============================================================================
-- 3. VENUE_ROLES (create before stages so stages RLS can reference it)
-- ============================================================================
CREATE TABLE IF NOT EXISTS venue_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('group', 'venue', 'stage')),
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('group_admin', 'venue_manager', 'stage_hand')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (entity_type, entity_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_venue_roles_user_id ON venue_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_roles_entity ON venue_roles(entity_type, entity_id);
ALTER TABLE venue_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own venue roles"
  ON venue_roles FOR SELECT
  USING (user_id = auth.uid());

-- Policies that allow group_admin/venue_manager to manage roles must not SELECT from
-- venue_roles (causes infinite recursion). Use can_manage_venue_roles() instead (section 4c).
-- FOR INSERT/UPDATE/DELETE only (not SELECT) to avoid evaluating these when app SELECTs venue_roles.
CREATE POLICY "Group owners can manage venue_roles for their group"
  ON venue_roles FOR INSERT
  WITH CHECK (entity_type = 'group' AND entity_id IN (SELECT id FROM venue_groups WHERE owner_id = auth.uid()));
CREATE POLICY "Group owners can update venue_roles for their group"
  ON venue_roles FOR UPDATE
  USING (entity_type = 'group' AND entity_id IN (SELECT id FROM venue_groups WHERE owner_id = auth.uid()));
CREATE POLICY "Group owners can delete venue_roles for their group"
  ON venue_roles FOR DELETE
  USING (entity_type = 'group' AND entity_id IN (SELECT id FROM venue_groups WHERE owner_id = auth.uid()));

CREATE POLICY "Venue owners can insert venue_roles for their venue"
  ON venue_roles FOR INSERT
  WITH CHECK (
    entity_type = 'venue' AND (
      entity_id IN (SELECT id FROM venues WHERE owner_id = auth.uid())
      OR entity_id IN (SELECT v.id FROM venues v JOIN venue_groups vg ON vg.id = v.group_id WHERE vg.owner_id = auth.uid())
    )
  );
CREATE POLICY "Venue owners can update venue_roles for their venue"
  ON venue_roles FOR UPDATE
  USING (
    entity_type = 'venue' AND (
      entity_id IN (SELECT id FROM venues WHERE owner_id = auth.uid())
      OR entity_id IN (SELECT v.id FROM venues v JOIN venue_groups vg ON vg.id = v.group_id WHERE vg.owner_id = auth.uid())
    )
  );
CREATE POLICY "Venue owners can delete venue_roles for their venue"
  ON venue_roles FOR DELETE
  USING (
    entity_type = 'venue' AND (
      entity_id IN (SELECT id FROM venues WHERE owner_id = auth.uid())
      OR entity_id IN (SELECT v.id FROM venues v JOIN venue_groups vg ON vg.id = v.group_id WHERE vg.owner_id = auth.uid())
    )
  );

-- (group_admin and venue_manager for group/venue/stage added in section 4c via can_manage_venue_roles; stage_hand uses function to avoid recursion)

-- ============================================================================
-- 4. STAGES (per venue; capacity and tech specs live here)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INTEGER,
  technical_specs_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stages_venue_id ON stages(venue_id);
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;

-- Stages: access if user can access the venue (owner or venue_roles)
CREATE POLICY "Users can view stages for accessible venues"
  ON stages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM venues v
      WHERE v.id = stages.venue_id
        AND (
          v.owner_id = auth.uid()
          OR EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid())
          OR EXISTS (SELECT 1 FROM venue_groups vg JOIN venues v2 ON v2.group_id = vg.id WHERE v2.id = stages.venue_id AND (vg.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = vg.id AND vr.user_id = auth.uid())))
        )
    )
    OR EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'stage' AND vr.entity_id = stages.id AND vr.user_id = auth.uid())
  );

CREATE POLICY "Users can insert stages for owned venues"
  ON stages FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = stages.venue_id AND v.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM venues v JOIN venue_groups vg ON vg.id = v.group_id WHERE v.id = stages.venue_id AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = vg.id AND vr.user_id = auth.uid() AND vr.role = 'group_admin'))
    OR EXISTS (SELECT 1 FROM venues v WHERE v.id = stages.venue_id AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid() AND vr.role = 'venue_manager'))
  );

CREATE POLICY "Users can update stages for owned or managed venues"
  ON stages FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = stages.venue_id AND v.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM venues v JOIN venue_groups vg ON vg.id = v.group_id WHERE v.id = stages.venue_id AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = vg.id AND vr.user_id = auth.uid() AND vr.role = 'group_admin'))
    OR EXISTS (SELECT 1 FROM venues v WHERE v.id = stages.venue_id AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid() AND vr.role = 'venue_manager'))
    OR EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'stage' AND vr.entity_id = stages.id AND vr.user_id = auth.uid())
  );

CREATE POLICY "Users can delete stages for owned or group-admin venues"
  ON stages FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = stages.venue_id AND v.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM venues v JOIN venue_groups vg ON vg.id = v.group_id WHERE v.id = stages.venue_id AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = vg.id AND vr.user_id = auth.uid() AND vr.role = 'group_admin'))
    OR EXISTS (SELECT 1 FROM venues v WHERE v.id = stages.venue_id AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid() AND vr.role = 'venue_manager'))
  );

-- ============================================================================
-- 4a. Helper: can current user manage venue_roles for (entity_type, entity_id)?
--     SECURITY DEFINER + row_security = off so we can read venue_roles without recursion.
-- ============================================================================
CREATE OR REPLACE FUNCTION can_manage_venue_roles(p_entity_type text, p_entity_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET row_security = off
AS $$
BEGIN
  IF p_entity_type = 'group' THEN
    RETURN EXISTS (SELECT 1 FROM venue_groups WHERE id = p_entity_id AND owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM venue_roles WHERE entity_type = 'group' AND entity_id = p_entity_id AND user_id = auth.uid() AND role = 'group_admin');
  ELSIF p_entity_type = 'venue' THEN
    RETURN EXISTS (SELECT 1 FROM venues WHERE id = p_entity_id AND owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM venues v JOIN venue_groups vg ON vg.id = v.group_id WHERE v.id = p_entity_id AND vg.owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM venue_roles vr JOIN venues v ON v.id = p_entity_id AND v.group_id = vr.entity_id WHERE vr.entity_type = 'group' AND vr.user_id = auth.uid() AND vr.role = 'group_admin')
      OR EXISTS (SELECT 1 FROM venue_roles WHERE entity_type = 'venue' AND entity_id = p_entity_id AND user_id = auth.uid() AND role = 'venue_manager');
  ELSIF p_entity_type = 'stage' THEN
    RETURN EXISTS (SELECT 1 FROM stages s JOIN venues v ON v.id = s.venue_id WHERE s.id = p_entity_id AND v.owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM stages s JOIN venues v ON v.id = s.venue_id JOIN venue_groups vg ON vg.id = v.group_id WHERE s.id = p_entity_id AND vg.owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM stages s JOIN venues v ON v.id = s.venue_id WHERE s.id = p_entity_id AND v.group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = v.group_id AND vr.user_id = auth.uid() AND vr.role = 'group_admin'))
      OR EXISTS (SELECT 1 FROM stages s JOIN venues v ON v.id = s.venue_id WHERE s.id = p_entity_id AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid() AND vr.role = 'venue_manager'));
  END IF;
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION can_manage_venue_roles(text, uuid) TO authenticated;

-- ============================================================================
-- 4b. VENUE_ROLES: policies that need group_admin/venue_manager (use helper; FOR INSERT/UPDATE/DELETE only to avoid recursion on SELECT)
-- ============================================================================
DROP POLICY IF EXISTS "Venue owners and venue_manager can manage stage_hand roles for their stage" ON venue_roles;

CREATE POLICY "Group admins can manage venue_roles for their group"
  ON venue_roles FOR INSERT WITH CHECK (entity_type = 'group' AND can_manage_venue_roles('group', entity_id));
CREATE POLICY "Group admins can update venue_roles for their group"
  ON venue_roles FOR UPDATE USING (entity_type = 'group' AND can_manage_venue_roles('group', entity_id));
CREATE POLICY "Group admins can delete venue_roles for their group"
  ON venue_roles FOR DELETE USING (entity_type = 'group' AND can_manage_venue_roles('group', entity_id));

CREATE POLICY "Venue managers and group admins can manage venue_roles for venue"
  ON venue_roles FOR INSERT WITH CHECK (entity_type = 'venue' AND can_manage_venue_roles('venue', entity_id));
CREATE POLICY "Venue managers and group admins can update venue_roles for venue"
  ON venue_roles FOR UPDATE USING (entity_type = 'venue' AND can_manage_venue_roles('venue', entity_id));
CREATE POLICY "Venue managers and group admins can delete venue_roles for venue"
  ON venue_roles FOR DELETE USING (entity_type = 'venue' AND can_manage_venue_roles('venue', entity_id));

CREATE POLICY "Venue owners and venue_manager can manage stage_hand roles for their stage"
  ON venue_roles FOR INSERT WITH CHECK (entity_type = 'stage' AND can_manage_venue_roles('stage', entity_id));
CREATE POLICY "Venue owners and venue_manager can update stage_hand roles"
  ON venue_roles FOR UPDATE USING (entity_type = 'stage' AND can_manage_venue_roles('stage', entity_id));
CREATE POLICY "Venue owners and venue_manager can delete stage_hand roles"
  ON venue_roles FOR DELETE USING (entity_type = 'stage' AND can_manage_venue_roles('stage', entity_id));

-- ============================================================================
-- 5. SHOWS (events): add stage_id, is_multi_stage, linked_stage_ids
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shows' AND column_name = 'stage_id') THEN
    ALTER TABLE shows ADD COLUMN stage_id UUID REFERENCES stages(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_shows_stage_id ON shows(stage_id);
    COMMENT ON COLUMN shows.stage_id IS 'Single stage for this show; null when is_multi_stage and linked_stage_ids used';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shows' AND column_name = 'is_multi_stage') THEN
    ALTER TABLE shows ADD COLUMN is_multi_stage BOOLEAN DEFAULT false;
    COMMENT ON COLUMN shows.is_multi_stage IS 'Festival mode: event blocks all stages in linked_stage_ids';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shows' AND column_name = 'linked_stage_ids') THEN
    ALTER TABLE shows ADD COLUMN linked_stage_ids UUID[] DEFAULT '{}';
    CREATE INDEX IF NOT EXISTS idx_shows_linked_stage_ids ON shows USING GIN(linked_stage_ids);
    COMMENT ON COLUMN shows.linked_stage_ids IS 'When is_multi_stage=true, stages blocked by this event; otherwise derived from stage_id';
  END IF;
END $$;

-- ============================================================================
-- 6. RLS: extend venues to allow access via venue_roles (group_admin, venue_manager)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own venues" ON venues;
CREATE POLICY "Users can view own venues"
  ON venues FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM venue_groups vg WHERE vg.id = venues.group_id AND vg.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = venues.group_id AND vr.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = venues.id AND vr.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM stages s JOIN venue_roles vr ON vr.entity_type = 'stage' AND vr.entity_id = s.id AND vr.user_id = auth.uid() WHERE s.venue_id = venues.id)
  );

-- ============================================================================
-- 6a. SHOWS: allow venue_manager, group_admin, stage_hand to SELECT
-- ============================================================================
CREATE POLICY "Venue managers can view shows for their venue"
  ON shows FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = shows.venue_id AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid()))
  );

CREATE POLICY "Group admins can view shows for their group venues"
  ON shows FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = shows.venue_id AND v.group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = v.group_id AND vr.user_id = auth.uid()))
  );

CREATE POLICY "Stage hands can view shows for their stage"
  ON shows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM venue_roles vr
      WHERE vr.entity_type = 'stage' AND vr.user_id = auth.uid()
        AND (vr.entity_id = shows.stage_id OR (shows.linked_stage_ids IS NOT NULL AND array_length(shows.linked_stage_ids, 1) > 0 AND vr.entity_id = ANY(shows.linked_stage_ids)))
    )
  );

-- ============================================================================
-- 6b. SHOWS: allow venue_manager and group_admin to insert/update/delete
-- ============================================================================
CREATE POLICY "Venue managers can insert shows for their venue"
  ON shows FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = shows.venue_id AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid() AND vr.role = 'venue_manager'))
  );

CREATE POLICY "Group admins can insert shows for their group venues"
  ON shows FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = shows.venue_id AND v.group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = v.group_id AND vr.user_id = auth.uid() AND vr.role = 'group_admin'))
  );

CREATE POLICY "Venue managers can update shows for their venue"
  ON shows FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = shows.venue_id AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid() AND vr.role = 'venue_manager'))
  );

CREATE POLICY "Group admins can update shows for their group venues"
  ON shows FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = shows.venue_id AND v.group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = v.group_id AND vr.user_id = auth.uid() AND vr.role = 'group_admin'))
  );

CREATE POLICY "Venue managers can delete shows for their venue"
  ON shows FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = shows.venue_id AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid() AND vr.role = 'venue_manager'))
  );

CREATE POLICY "Group admins can delete shows for their group venues"
  ON shows FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = shows.venue_id AND v.group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = v.group_id AND vr.user_id = auth.uid() AND vr.role = 'group_admin'))
  );

-- ============================================================================
-- 7. RLS: extend venue_groups to allow access via venue_roles (group_admin)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own venue groups" ON venue_groups;
CREATE POLICY "Users can view own venue groups"
  ON venue_groups FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = venue_groups.id AND vr.user_id = auth.uid())
  );

-- ============================================================================
-- 8. Updated_at triggers for venue_groups and stages
-- ============================================================================
DROP TRIGGER IF EXISTS venue_groups_updated_at ON venue_groups;
CREATE TRIGGER venue_groups_updated_at
  BEFORE UPDATE ON venue_groups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS stages_updated_at ON stages;
CREATE TRIGGER stages_updated_at
  BEFORE UPDATE ON stages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 9. Helper: get effective stage IDs for a show (for blocking checks)
-- ============================================================================
CREATE OR REPLACE FUNCTION shows_linked_stage_ids(show_row shows)
RETURNS UUID[] AS $$
  SELECT CASE
    WHEN show_row.is_multi_stage AND array_length(show_row.linked_stage_ids, 1) > 0 THEN show_row.linked_stage_ids
    WHEN show_row.stage_id IS NOT NULL THEN ARRAY[show_row.stage_id]
    ELSE '{}'::uuid[]
  END;
$$ LANGUAGE sql STABLE;

COMMENT ON TABLE venue_groups IS 'Corporate shell: group of venues (e.g. festival brand)';
COMMENT ON TABLE stages IS 'Room/stage within a venue; capacity and technical_specs_json';
COMMENT ON TABLE venue_roles IS 'Group Admin, Venue Manager, Stage Hand access to groups/venues/stages';