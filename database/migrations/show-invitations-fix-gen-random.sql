-- ============================================================================
-- Fix create_show_invitation: use md5() instead of gen_random_bytes (no pgcrypto)
-- Run once if you get "function gen_random_bytes(integer) does not exist"
-- ============================================================================

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
