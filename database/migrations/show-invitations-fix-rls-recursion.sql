-- ============================================================================
-- Fix RLS infinite recursion: shows <-> show_invitations
-- Run after: show-invitations-and-promoter-portal.sql
-- ============================================================================
-- show_invitations policies joined to shows; shows policies reference
-- show_invitations -> recursion. Add venue_id to show_invitations and use
-- only venues in show_invitations policies so we never touch shows from there.
-- ============================================================================

-- 1. Add venue_id to show_invitations (denormalized to avoid joining shows in RLS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'show_invitations' AND column_name = 'venue_id') THEN
    ALTER TABLE show_invitations ADD COLUMN venue_id UUID REFERENCES venues(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_show_invitations_venue_id ON show_invitations(venue_id);
  END IF;
END $$;

-- 2. Backfill venue_id from shows (one-time)
UPDATE show_invitations si
SET venue_id = s.venue_id
FROM shows s
WHERE s.id = si.show_id AND si.venue_id IS NULL;

-- 3. Make venue_id NOT NULL for new rows (optional; keep nullable if you prefer)
-- ALTER TABLE show_invitations ALTER COLUMN venue_id SET NOT NULL;  -- uncomment after backfill if desired

-- 4. Drop show_invitations policies that reference shows (they cause recursion)
DROP POLICY IF EXISTS "Venue owners can view show_invitations for own venues" ON show_invitations;
DROP POLICY IF EXISTS "Venue owners can insert show_invitations for own venues" ON show_invitations;
DROP POLICY IF EXISTS "Venue owners can update show_invitations for own venues" ON show_invitations;

-- 5. Recreate them using only venue_id (no reference to shows)
CREATE POLICY "Venue owners can view show_invitations for own venues"
  ON show_invitations FOR SELECT
  USING (
    venue_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM venues v WHERE v.id = show_invitations.venue_id AND v.owner_id = auth.uid())
  );

CREATE POLICY "Venue owners can insert show_invitations for own venues"
  ON show_invitations FOR INSERT
  WITH CHECK (
    venue_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM venues v WHERE v.id = show_invitations.venue_id AND v.owner_id = auth.uid())
  );

CREATE POLICY "Venue owners can update show_invitations for own venues"
  ON show_invitations FOR UPDATE
  USING (
    venue_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM venues v WHERE v.id = show_invitations.venue_id AND v.owner_id = auth.uid())
  );

-- 6. Ensure create_show_invitation sets venue_id
CREATE OR REPLACE FUNCTION create_show_invitation(
  p_show_id UUID,
  p_email TEXT,
  p_invited_by UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venue_owner UUID;
  v_venue_id UUID;
  v_token TEXT;
  v_invitation_id UUID;
BEGIN
  SELECT v.owner_id, v.id INTO v_venue_owner, v_venue_id
  FROM shows s
  JOIN venues v ON v.id = s.venue_id
  WHERE s.id = p_show_id;
  IF v_venue_owner IS NULL THEN
    RETURN json_build_object('error', 'Show not found');
  END IF;
  IF v_venue_owner != auth.uid() AND p_invited_by IS DISTINCT FROM auth.uid() THEN
    RETURN json_build_object('error', 'Not authorized to invite to this show');
  END IF;

  v_token := md5(random()::text || clock_timestamp()::text) || md5(random()::text || clock_timestamp()::text);
  INSERT INTO show_invitations (show_id, venue_id, email, token, status, invited_by)
  VALUES (p_show_id, v_venue_id, LOWER(TRIM(p_email)), v_token, 'pending', COALESCE(p_invited_by, auth.uid()))
  ON CONFLICT (show_id, email) DO UPDATE SET
    token = EXCLUDED.token,
    status = 'pending',
    invited_by = EXCLUDED.invited_by,
    accepted_at = NULL,
    user_id = NULL,
    venue_id = EXCLUDED.venue_id,
    updated_at = NOW()
  RETURNING id, token INTO v_invitation_id, v_token;

  RETURN json_build_object('id', v_invitation_id, 'token', v_token);
END;
$$;

COMMENT ON COLUMN show_invitations.venue_id IS 'Denormalized from show; avoids RLS recursion (policies use venues only).';
