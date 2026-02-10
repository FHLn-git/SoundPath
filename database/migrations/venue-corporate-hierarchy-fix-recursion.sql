-- ============================================================================
-- Fix: infinite recursion in venue_roles and venues policies
-- Run this once if you get 500 on GET /venues or "infinite recursion" in policies.
-- ============================================================================

-- 0. Venues SELECT: use a helper so we never read stages/venues in policy (venues→stages→venues loop)
CREATE OR REPLACE FUNCTION can_see_venue(p_venue_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET row_security = off
AS $$
  SELECT EXISTS (SELECT 1 FROM venues WHERE id = p_venue_id AND owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM venue_groups vg JOIN venues v ON v.id = p_venue_id AND v.group_id = vg.id WHERE vg.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM venue_roles WHERE entity_type = 'group' AND entity_id = (SELECT group_id FROM venues WHERE id = p_venue_id) AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM venue_roles WHERE entity_type = 'venue' AND entity_id = p_venue_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM stages s JOIN venue_roles vr ON vr.entity_type = 'stage' AND vr.entity_id = s.id AND vr.user_id = auth.uid() WHERE s.venue_id = p_venue_id);
$$;

GRANT EXECUTE ON FUNCTION can_see_venue(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can view own venues" ON venues;
CREATE POLICY "Users can view own venues"
  ON venues FOR SELECT
  USING (can_see_venue(venues.id));

-- 1. Helper function (reads venue_roles with RLS bypass so policies don't recurse)
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

-- 2. Drop all policies that reference venue_roles (causes recursion when SELECTing venue_roles)
DROP POLICY IF EXISTS "Group owners and group_admin can manage venue_roles for their group" ON venue_roles;
DROP POLICY IF EXISTS "Venue owners and group_admin can manage venue_roles for their venue" ON venue_roles;
DROP POLICY IF EXISTS "Venue owners and venue_manager can manage stage_hand roles for their stage" ON venue_roles;

-- 3. Drop any existing manage policies so we can recreate them (idempotent)
DROP POLICY IF EXISTS "Group owners can manage venue_roles for their group" ON venue_roles;
DROP POLICY IF EXISTS "Group owners can update venue_roles for their group" ON venue_roles;
DROP POLICY IF EXISTS "Group owners can delete venue_roles for their group" ON venue_roles;
DROP POLICY IF EXISTS "Venue owners can insert venue_roles for their venue" ON venue_roles;
DROP POLICY IF EXISTS "Venue owners can update venue_roles for their venue" ON venue_roles;
DROP POLICY IF EXISTS "Venue owners can delete venue_roles for their venue" ON venue_roles;
DROP POLICY IF EXISTS "Group admins can manage venue_roles for their group" ON venue_roles;
DROP POLICY IF EXISTS "Group admins can update venue_roles for their group" ON venue_roles;
DROP POLICY IF EXISTS "Group admins can delete venue_roles for their group" ON venue_roles;
DROP POLICY IF EXISTS "Venue managers and group admins can manage venue_roles for venue" ON venue_roles;
DROP POLICY IF EXISTS "Venue managers and group admins can update venue_roles for venue" ON venue_roles;
DROP POLICY IF EXISTS "Venue managers and group admins can delete venue_roles for venue" ON venue_roles;
DROP POLICY IF EXISTS "Venue owners and venue_manager can manage stage_hand roles for their stage" ON venue_roles;
DROP POLICY IF EXISTS "Venue owners and venue_manager can update stage_hand roles" ON venue_roles;
DROP POLICY IF EXISTS "Venue owners and venue_manager can delete stage_hand roles" ON venue_roles;

-- 4. Add non-recursive policies (FOR INSERT/UPDATE/DELETE only)
-- Group: owners + admins (via function)
CREATE POLICY "Group owners can manage venue_roles for their group"
  ON venue_roles FOR INSERT WITH CHECK (entity_type = 'group' AND entity_id IN (SELECT id FROM venue_groups WHERE owner_id = auth.uid()));
CREATE POLICY "Group owners can update venue_roles for their group"
  ON venue_roles FOR UPDATE USING (entity_type = 'group' AND entity_id IN (SELECT id FROM venue_groups WHERE owner_id = auth.uid()));
CREATE POLICY "Group owners can delete venue_roles for their group"
  ON venue_roles FOR DELETE USING (entity_type = 'group' AND entity_id IN (SELECT id FROM venue_groups WHERE owner_id = auth.uid()));

CREATE POLICY "Venue owners can insert venue_roles for their venue"
  ON venue_roles FOR INSERT WITH CHECK (
    entity_type = 'venue' AND (
      entity_id IN (SELECT id FROM venues WHERE owner_id = auth.uid())
      OR entity_id IN (SELECT v.id FROM venues v JOIN venue_groups vg ON vg.id = v.group_id WHERE vg.owner_id = auth.uid())
    )
  );
CREATE POLICY "Venue owners can update venue_roles for their venue"
  ON venue_roles FOR UPDATE USING (
    entity_type = 'venue' AND (
      entity_id IN (SELECT id FROM venues WHERE owner_id = auth.uid())
      OR entity_id IN (SELECT v.id FROM venues v JOIN venue_groups vg ON vg.id = v.group_id WHERE vg.owner_id = auth.uid())
    )
  );
CREATE POLICY "Venue owners can delete venue_roles for their venue"
  ON venue_roles FOR DELETE USING (
    entity_type = 'venue' AND (
      entity_id IN (SELECT id FROM venues WHERE owner_id = auth.uid())
      OR entity_id IN (SELECT v.id FROM venues v JOIN venue_groups vg ON vg.id = v.group_id WHERE vg.owner_id = auth.uid())
    )
  );

-- 5. Add function-based policies (group_admin, venue_manager, stage_hand)
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
