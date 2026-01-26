-- ============================================================================
-- Agent Networking & Quad-Inbox Schema
-- ============================================================================
-- This migration adds:
-- 1. Connections table for Agent-to-Agent relationships
-- 2. Source field to tracks (to identify public form submissions)
-- 3. is_close_eye field to tracks (for Global Close Watch)
-- 4. peer_to_peer field to tracks (to tag network-sent tracks)
-- 5. crate field to tracks (to identify which crate: 'submissions', 'network', 'crate_a', 'crate_b')
-- ============================================================================

-- CONNECTIONS TABLE (Agent-to-Agent relationships)
-- ============================================================================
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id TEXT NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, recipient_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_connections_requester_id ON connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_connections_recipient_id ON connections(recipient_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);

-- Add new columns to tracks table
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tracks') THEN
    -- Add source field (to identify public form submissions)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'source') THEN
      ALTER TABLE tracks ADD COLUMN source TEXT DEFAULT 'manual';
      -- Set existing tracks from public form as 'public_form' if they have recipient_user_id
      UPDATE tracks SET source = 'public_form' 
      WHERE recipient_user_id IS NOT NULL AND organization_id IS NULL;
    END IF;

    -- Add is_close_eye field (for Global Close Watch)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'is_close_eye') THEN
      ALTER TABLE tracks ADD COLUMN is_close_eye BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add peer_to_peer field (to tag network-sent tracks)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'peer_to_peer') THEN
      ALTER TABLE tracks ADD COLUMN peer_to_peer BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add crate field (to identify which crate)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'crate') THEN
      ALTER TABLE tracks ADD COLUMN crate TEXT;
      -- Set default crate based on source and recipient
      UPDATE tracks SET crate = 'submissions' 
      WHERE source = 'public_form' AND recipient_user_id IS NOT NULL AND organization_id IS NULL;
    END IF;

    -- Add sender_id field (to track who sent the track in peer-to-peer)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'sender_id') THEN
      ALTER TABLE tracks ADD COLUMN sender_id TEXT REFERENCES staff_members(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Indexes for new fields
CREATE INDEX IF NOT EXISTS idx_tracks_source ON tracks(source);
CREATE INDEX IF NOT EXISTS idx_tracks_is_close_eye ON tracks(is_close_eye);
CREATE INDEX IF NOT EXISTS idx_tracks_peer_to_peer ON tracks(peer_to_peer);
CREATE INDEX IF NOT EXISTS idx_tracks_crate ON tracks(crate);
CREATE INDEX IF NOT EXISTS idx_tracks_sender_id ON tracks(sender_id);

-- RLS Policies for connections table
-- ============================================================================
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- Users can view connections where they are requester or recipient
CREATE POLICY "Users can view their connections"
  ON connections FOR SELECT
  USING (
    requester_id = (SELECT id FROM staff_members WHERE auth_user_id = auth.uid())
    OR recipient_id = (SELECT id FROM staff_members WHERE auth_user_id = auth.uid())
  );

-- Users can create connections (as requester)
CREATE POLICY "Users can create connections"
  ON connections FOR INSERT
  WITH CHECK (
    requester_id = (SELECT id FROM staff_members WHERE auth_user_id = auth.uid())
  );

-- Users can update connections where they are recipient (to accept/reject)
CREATE POLICY "Users can update connections they received"
  ON connections FOR UPDATE
  USING (
    recipient_id = (SELECT id FROM staff_members WHERE auth_user_id = auth.uid())
  );

-- Function to create a connection request
-- ============================================================================
CREATE OR REPLACE FUNCTION create_connection_request(
  recipient_staff_id TEXT
)
RETURNS UUID AS $$
DECLARE
  current_staff_id TEXT;
  connection_id UUID;
BEGIN
  -- Get current user's staff_id
  SELECT id INTO current_staff_id
  FROM staff_members
  WHERE auth_user_id = auth.uid();

  IF current_staff_id IS NULL THEN
    RAISE EXCEPTION 'User not found in staff_members';
  END IF;

  IF current_staff_id = recipient_staff_id THEN
    RAISE EXCEPTION 'Cannot connect to yourself';
  END IF;

  -- Check if connection already exists
  SELECT id INTO connection_id
  FROM connections
  WHERE (requester_id = current_staff_id AND recipient_id = recipient_staff_id)
     OR (requester_id = recipient_staff_id AND recipient_id = current_staff_id);

  IF connection_id IS NOT NULL THEN
    RAISE EXCEPTION 'Connection already exists';
  END IF;

  -- Create connection request
  INSERT INTO connections (requester_id, recipient_id, status)
  VALUES (current_staff_id, recipient_staff_id, 'pending')
  RETURNING id INTO connection_id;

  RETURN connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_connection_request(TEXT) TO authenticated;

-- Function to accept a connection request
-- ============================================================================
CREATE OR REPLACE FUNCTION accept_connection_request(
  connection_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  current_staff_id TEXT;
BEGIN
  -- Get current user's staff_id
  SELECT id INTO current_staff_id
  FROM staff_members
  WHERE auth_user_id = auth.uid();

  IF current_staff_id IS NULL THEN
    RAISE EXCEPTION 'User not found in staff_members';
  END IF;

  -- Update connection status
  UPDATE connections
  SET status = 'accepted', updated_at = NOW()
  WHERE id = connection_id_param
    AND recipient_id = current_staff_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Connection request not found or already processed';
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION accept_connection_request(UUID) TO authenticated;

-- Function to send track to peer (creates copy in recipient's Network box)
-- ============================================================================
CREATE OR REPLACE FUNCTION send_track_to_peer(
  track_id_param UUID,
  recipient_staff_id TEXT
)
RETURNS UUID AS $$
DECLARE
  current_staff_id TEXT;
  original_track RECORD;
  new_track_id UUID;
BEGIN
  -- Get current user's staff_id
  SELECT id INTO current_staff_id
  FROM staff_members
  WHERE auth_user_id = auth.uid();

  IF current_staff_id IS NULL THEN
    RAISE EXCEPTION 'User not found in staff_members';
  END IF;

  -- Verify connection exists and is accepted
  IF NOT EXISTS (
    SELECT 1 FROM connections
    WHERE status = 'accepted'
      AND ((requester_id = current_staff_id AND recipient_id = recipient_staff_id)
           OR (requester_id = recipient_staff_id AND recipient_id = current_staff_id))
  ) THEN
    RAISE EXCEPTION 'No active connection with recipient';
  END IF;

  -- Get original track
  SELECT * INTO original_track
  FROM tracks
  WHERE id = track_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Track not found';
  END IF;

  -- Create copy in recipient's Network box
  INSERT INTO tracks (
    artist_id,
    artist_name,
    title,
    sc_link,
    genre,
    bpm,
    energy,
    status,
    "column",
    votes,
    organization_id,
    recipient_user_id,
    crate,
    source,
    peer_to_peer,
    sender_id,
    created_at
  ) VALUES (
    original_track.artist_id,
    original_track.artist_name,
    original_track.title,
    original_track.sc_link,
    original_track.genre,
    original_track.bpm,
    original_track.energy,
    'inbox',
    'inbox',
    0,
    NULL, -- organization_id is null for personal inbox
    recipient_staff_id,
    'network',
    'peer_to_peer',
    TRUE,
    current_staff_id,
    NOW()
  )
  RETURNING id INTO new_track_id;

  RETURN new_track_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION send_track_to_peer(UUID, TEXT) TO authenticated;
