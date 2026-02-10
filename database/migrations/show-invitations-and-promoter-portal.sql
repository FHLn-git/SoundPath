-- ============================================================================
-- Show Invitations, Section Approval, and Promoter Portal
-- Run after: venues-and-shows-schema.sql (and venue-advance-phase4 if used)
-- ============================================================================
-- Adds: show_invitations (promoter access), section-level approval_status on
-- shows, venue_notifications (in-app bell), and 'completed' show status for
-- settlement visibility. RLS allows promoters to read/update only their shows.
-- ============================================================================

-- 1. Allow 'completed' status on shows (for post-show settlement)
DO $$
DECLARE
  cname text;
BEGIN
  -- Normalize any invalid status values so the new constraint can be added
  UPDATE shows
  SET status = 'draft'
  WHERE status IS NULL
     OR status NOT IN ('draft', 'confirmed', 'pending-approval', 'completed');

  -- Drop any existing status check constraint (name may vary)
  FOR cname IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.shows'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE shows DROP CONSTRAINT IF EXISTS %I', cname);
  END LOOP;
  -- Add constraint only if it does not already exist (idempotent re-run)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.shows'::regclass AND conname = 'shows_status_check'
  ) THEN
    ALTER TABLE shows ADD CONSTRAINT shows_status_check
      CHECK (status IN ('draft', 'confirmed', 'pending-approval', 'completed'));
  END IF;
END $$;

-- 2. Section-level approval status (Production, Hospitality, Schedule)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shows' AND column_name = 'production_approval_status') THEN
    ALTER TABLE shows ADD COLUMN production_approval_status TEXT DEFAULT 'CONFIRMED' CHECK (production_approval_status IN ('CONFIRMED', 'PENDING_APPROVAL'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shows' AND column_name = 'hospitality_approval_status') THEN
    ALTER TABLE shows ADD COLUMN hospitality_approval_status TEXT DEFAULT 'CONFIRMED' CHECK (hospitality_approval_status IN ('CONFIRMED', 'PENDING_APPROVAL'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shows' AND column_name = 'schedule_approval_status') THEN
    ALTER TABLE shows ADD COLUMN schedule_approval_status TEXT DEFAULT 'CONFIRMED' CHECK (schedule_approval_status IN ('CONFIRMED', 'PENDING_APPROVAL'));
  END IF;
END $$;

COMMENT ON COLUMN shows.production_approval_status IS 'Venue approval for Production section; PENDING_APPROVAL when promoter edits';
COMMENT ON COLUMN shows.hospitality_approval_status IS 'Venue approval for Hospitality section';
COMMENT ON COLUMN shows.schedule_approval_status IS 'Venue approval for Schedule/Logistics section';

-- 3. Show Invitations (promoter access per show)
-- venue_id is denormalized so RLS policies never reference shows (avoids recursion).
CREATE TABLE IF NOT EXISTS show_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(show_id, email)
);

CREATE INDEX IF NOT EXISTS idx_show_invitations_show_id ON show_invitations(show_id);
CREATE INDEX IF NOT EXISTS idx_show_invitations_venue_id ON show_invitations(venue_id);
CREATE INDEX IF NOT EXISTS idx_show_invitations_token ON show_invitations(token);
CREATE INDEX IF NOT EXISTS idx_show_invitations_email ON show_invitations(LOWER(TRIM(email)));
CREATE INDEX IF NOT EXISTS idx_show_invitations_user_id ON show_invitations(user_id);

ALTER TABLE show_invitations ENABLE ROW LEVEL SECURITY;

-- Venue owners can manage invitations (use venue_id only to avoid RLS recursion with shows)
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

-- Promoters can view invitations sent to their email (for accept flow) or where they are the linked user
CREATE POLICY "Promoters can view own show_invitations"
  ON show_invitations FOR SELECT
  USING (
    user_id = auth.uid()
    OR (LOWER(TRIM(email)) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', ''))))
  );

-- Promoters can update their own invitation to accept (status, accepted_at, user_id)
CREATE POLICY "Promoters can accept own show_invitation"
  ON show_invitations FOR UPDATE
  USING (
    status = 'pending'
    AND (LOWER(TRIM(email)) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', ''))))
  )
  WITH CHECK (status = 'accepted' AND user_id = auth.uid());

DROP TRIGGER IF EXISTS show_invitations_updated_at ON show_invitations;
CREATE TRIGGER show_invitations_updated_at
  BEFORE UPDATE ON show_invitations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE show_invitations IS 'Invitations for external promoters to access a show advance; token used in magic link';

-- 4. Allow promoters to SELECT/UPDATE shows they are invited to (accepted)
CREATE POLICY "Promoters can view shows they are invited to"
  ON shows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM show_invitations si
      WHERE si.show_id = shows.id AND si.status = 'accepted'
        AND (si.user_id = auth.uid() OR LOWER(TRIM(si.email)) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', ''))))
    )
  );

CREATE POLICY "Promoters can update shows they are invited to"
  ON shows FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM show_invitations si
      WHERE si.show_id = shows.id AND si.status = 'accepted'
        AND (si.user_id = auth.uid() OR LOWER(TRIM(si.email)) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', ''))))
    )
  );

-- 5. Venue notifications (in-app bell: pending promoter requests)
CREATE TABLE IF NOT EXISTS venue_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_venue_notifications_venue_id ON venue_notifications(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_notifications_read_at ON venue_notifications(venue_id, read_at);

ALTER TABLE venue_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue owners can view own venue_notifications"
  ON venue_notifications FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = venue_notifications.venue_id AND v.owner_id = auth.uid())
  );

CREATE POLICY "Venue owners can update own venue_notifications"
  ON venue_notifications FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = venue_id AND v.owner_id = auth.uid())
  );

-- Service/backend will insert via service role or SECURITY DEFINER
CREATE POLICY "Venue owners can insert venue_notifications for own venue"
  ON venue_notifications FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = venue_id AND v.owner_id = auth.uid())
  );

DROP TRIGGER IF EXISTS venue_notifications_updated_at ON venue_notifications;
CREATE TRIGGER venue_notifications_updated_at
  BEFORE UPDATE ON venue_notifications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE venue_notifications IS 'In-app notifications for venue (e.g. advance updated by promoter)';

-- 6. RPC: Create show invitation (returns token; caller sends email)
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

GRANT EXECUTE ON FUNCTION create_show_invitation(UUID, TEXT, UUID) TO authenticated;

-- 7. RPC: Accept show invitation (call after user is authenticated; links user_id and marks accepted)
CREATE OR REPLACE FUNCTION accept_show_invitation(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row show_invitations%ROWTYPE;
  v_email TEXT;
BEGIN
  v_email := LOWER(TRIM(auth.jwt()->>'email'));
  SELECT * INTO v_row FROM show_invitations WHERE token = p_token AND status = 'pending';
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invalid or expired invitation');
  END IF;
  IF LOWER(TRIM(v_row.email)) != v_email THEN
    RETURN json_build_object('error', 'Invitation was sent to a different email address');
  END IF;

  UPDATE show_invitations
  SET status = 'accepted', accepted_at = NOW(), user_id = auth.uid()
  WHERE id = v_row.id;

  RETURN json_build_object('show_id', v_row.show_id, 'accepted', true);
END;
$$;

GRANT EXECUTE ON FUNCTION accept_show_invitation(TEXT) TO authenticated;

-- 8. RPC: Get invitation email by token (anon) for sign-up prefill; returns only email if token valid
CREATE OR REPLACE FUNCTION get_show_invitation_email_by_token(p_token TEXT)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object('email', email)
  FROM show_invitations
  WHERE token = p_token AND status = 'pending';
$$;

GRANT EXECUTE ON FUNCTION get_show_invitation_email_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_show_invitation_email_by_token(TEXT) TO authenticated;

-- 9. Trigger: create venue notification when any section set to PENDING_APPROVAL (promoter edited)
CREATE OR REPLACE FUNCTION notify_venue_on_advance_pending()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.production_approval_status = 'PENDING_APPROVAL' AND (OLD.production_approval_status IS NULL OR OLD.production_approval_status != 'PENDING_APPROVAL'))
     OR (NEW.hospitality_approval_status = 'PENDING_APPROVAL' AND (OLD.hospitality_approval_status IS NULL OR OLD.hospitality_approval_status != 'PENDING_APPROVAL'))
     OR (NEW.schedule_approval_status = 'PENDING_APPROVAL' AND (OLD.schedule_approval_status IS NULL OR OLD.schedule_approval_status != 'PENDING_APPROVAL')) THEN
    INSERT INTO venue_notifications (venue_id, show_id, type, title, body)
    VALUES (NEW.venue_id, NEW.id, 'advance_updated', 'Advance updated', 'A promoter has updated the advance for "' || NEW.name || '". Review and approve when ready.');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_venue_advance_pending ON shows;
CREATE TRIGGER trigger_notify_venue_advance_pending
  AFTER UPDATE ON shows
  FOR EACH ROW
  WHEN (
    (OLD.production_approval_status IS DISTINCT FROM NEW.production_approval_status AND NEW.production_approval_status = 'PENDING_APPROVAL')
    OR (OLD.hospitality_approval_status IS DISTINCT FROM NEW.hospitality_approval_status AND NEW.hospitality_approval_status = 'PENDING_APPROVAL')
    OR (OLD.schedule_approval_status IS DISTINCT FROM NEW.schedule_approval_status AND NEW.schedule_approval_status = 'PENDING_APPROVAL')
  )
  EXECUTE FUNCTION notify_venue_on_advance_pending();
