-- ============================================================================
-- Artist Relations Tracker
-- ============================================================================
-- Adds:
-- - denials table (logs every transition to status='denied')
-- - tracks.listened_at (first listen timestamp; derived from listen_logs)
-- - triggers/backfills
-- - RPCs for scoped stats:
--   * get_label_artist_relations_stats(artist_name, org_id)
--   * get_agent_artist_relations_stats(artist_name)
--
-- Privacy model:
-- - Labels can only see their own organization stats (membership-scoped).
-- - Agents can only see cross-label aggregates for tracks they pitched (tracks.sender_id = agent).
-- ============================================================================

-- 1) TRACK-LEVEL LISTENED TIMESTAMP
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tracks') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'tracks' AND column_name = 'listened_at'
    ) THEN
      ALTER TABLE tracks ADD COLUMN listened_at TIMESTAMPTZ;
      CREATE INDEX IF NOT EXISTS idx_tracks_listened_at ON tracks(listened_at);
    END IF;
  END IF;
END $$;

-- Backfill tracks.listened_at from listen_logs (first listen)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'listen_logs')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'listened_at') THEN
    UPDATE tracks t
    SET listened_at = ll.first_listen
    FROM (
      SELECT track_id, MIN(listened_at) AS first_listen
      FROM listen_logs
      GROUP BY track_id
    ) ll
    WHERE t.id = ll.track_id
      AND t.listened_at IS NULL;
  END IF;
END $$;

-- 2) DENIALS TABLE
CREATE TABLE IF NOT EXISTS denials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NULL REFERENCES artists(id) ON DELETE SET NULL,
  artist_name TEXT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  denied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_denials_org_artist_name ON denials(organization_id, artist_name);
CREATE INDEX IF NOT EXISTS idx_denials_org_artist_id ON denials(organization_id, artist_id);
CREATE INDEX IF NOT EXISTS idx_denials_track_id ON denials(track_id);
CREATE INDEX IF NOT EXISTS idx_denials_denied_at ON denials(denied_at);

-- Backfill denials for historical archived/rejected tracks (best-effort).
-- Note: Older versions used status='archive' for rejection/denial.
INSERT INTO denials (artist_id, artist_name, organization_id, track_id, denied_at)
SELECT
  t.artist_id,
  COALESCE(t.artist_name, t.artist_name, t.artist_name) AS artist_name,
  t.organization_id,
  t.id AS track_id,
  COALESCE(t.updated_at, t.created_at, NOW()) AS denied_at
FROM tracks t
WHERE t.organization_id IS NOT NULL
  AND (t.archived = true OR t.status = 'archive')
  AND NOT EXISTS (
    SELECT 1 FROM denials d WHERE d.track_id = t.id
  );

-- 3) TRIGGERS

-- When a listen log is created, set tracks.listened_at if not already set.
CREATE OR REPLACE FUNCTION set_track_listened_at_from_listen_log()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if the column exists (defensive for partial deployments)
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'tracks' AND column_name = 'listened_at'
  ) THEN
    UPDATE tracks
    SET listened_at = COALESCE(listened_at, NEW.listened_at, NOW())
    WHERE id = NEW.track_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_track_listened_at ON listen_logs;
CREATE TRIGGER trg_set_track_listened_at
  AFTER INSERT ON listen_logs
  FOR EACH ROW
  EXECUTE FUNCTION set_track_listened_at_from_listen_log();

-- Log a denial every time a track transitions to status='denied'
CREATE OR REPLACE FUNCTION log_denial_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    RETURN NEW; -- only label workspaces count
  END IF;

  IF NEW.status = 'denied' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO denials (artist_id, artist_name, organization_id, track_id, denied_at)
    VALUES (
      NEW.artist_id,
      NEW.artist_name,
      NEW.organization_id,
      NEW.id,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_denial_on_tracks_update ON tracks;
CREATE TRIGGER trg_log_denial_on_tracks_update
  AFTER UPDATE OF status ON tracks
  FOR EACH ROW
  EXECUTE FUNCTION log_denial_on_status_change();

-- 4) RLS FOR DENIALS
ALTER TABLE denials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view org denials" ON denials;
DROP POLICY IF EXISTS "Members can insert org denials" ON denials;

CREATE POLICY "Members can view org denials" ON denials
  FOR SELECT
  USING (
    is_system_admin()
    OR organization_id = ANY(get_user_organization_ids())
  );

-- Inserts are needed for the denial trigger to work under authenticated role.
CREATE POLICY "Members can insert org denials" ON denials
  FOR INSERT
  WITH CHECK (
    is_system_admin()
    OR organization_id = ANY(get_user_organization_ids())
  );

-- 5) RPC: Label-scoped stats for an artist (drill-down / Artist Profile)
CREATE OR REPLACE FUNCTION get_label_artist_relations_stats(
  artist_name_param TEXT,
  org_id_param UUID
)
RETURNS TABLE (
  denied_count INTEGER,
  missed_count INTEGER,
  total_submitted INTEGER,
  total_listened INTEGER,
  attention_rate NUMERIC
) AS $$
DECLARE
  current_staff_id TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO current_staff_id
  FROM staff_members
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF current_staff_id IS NULL THEN
    RAISE EXCEPTION 'User not found in staff_members';
  END IF;

  -- Membership guard: only members of this org (or SystemAdmin) can query
  IF NOT (is_system_admin() OR EXISTS (
    SELECT 1
    FROM memberships m
    WHERE m.user_id = current_staff_id
      AND m.organization_id = org_id_param
      AND m.active = true
  )) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH base_tracks AS (
    SELECT t.id, t.organization_id
    FROM tracks t
    WHERE t.organization_id = org_id_param
      AND t.artist_name = artist_name_param
  ),
  listened_tracks AS (
    SELECT DISTINCT ll.track_id
    FROM listen_logs ll
    JOIN base_tracks bt ON bt.id = ll.track_id
    WHERE ll.organization_id = org_id_param
  ),
  denied AS (
    SELECT COUNT(*)::INTEGER AS c
    FROM denials d
    WHERE d.organization_id = org_id_param
      AND d.artist_name = artist_name_param
  ),
  totals AS (
    SELECT
      (SELECT COUNT(*) FROM base_tracks)::INTEGER AS total_submitted,
      (SELECT COUNT(*) FROM listened_tracks)::INTEGER AS total_listened
  ),
  missed AS (
    SELECT COUNT(*)::INTEGER AS c
    FROM tracks t
    WHERE t.organization_id = org_id_param
      AND t.artist_name = artist_name_param
      AND (t.status IN ('denied', 'archive') OR t.archived = true)
      AND NOT EXISTS (
        SELECT 1
        FROM listen_logs ll
        WHERE ll.track_id = t.id
          AND ll.organization_id = org_id_param
      )
  )
  SELECT
    denied.c AS denied_count,
    missed.c AS missed_count,
    totals.total_submitted,
    totals.total_listened,
    CASE
      WHEN totals.total_submitted > 0 THEN
        ROUND((totals.total_listened::NUMERIC / totals.total_submitted::NUMERIC) * 100, 1)
      ELSE 0
    END AS attention_rate
  FROM denied, missed, totals;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_label_artist_relations_stats(TEXT, UUID) TO authenticated;

-- 6) RPC: Agent-scoped network stats (across labels they pitched to)
CREATE OR REPLACE FUNCTION get_agent_artist_relations_stats(
  artist_name_param TEXT
)
RETURNS TABLE (
  denied_count INTEGER,
  missed_count INTEGER
) AS $$
DECLARE
  current_staff_id TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO current_staff_id
  FROM staff_members
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF current_staff_id IS NULL THEN
    RAISE EXCEPTION 'User not found in staff_members';
  END IF;

  RETURN QUERY
  WITH pitched_label_tracks AS (
    SELECT t.id, t.organization_id
    FROM tracks t
    WHERE t.organization_id IS NOT NULL
      AND t.sender_id = current_staff_id
      AND t.artist_name = artist_name_param
  ),
  denied AS (
    SELECT COUNT(*)::INTEGER AS c
    FROM denials d
    JOIN tracks t ON t.id = d.track_id
    WHERE t.sender_id = current_staff_id
      AND t.organization_id IS NOT NULL
      AND t.artist_name = artist_name_param
  ),
  missed AS (
    SELECT COUNT(*)::INTEGER AS c
    FROM tracks t
    WHERE t.organization_id IS NOT NULL
      AND t.sender_id = current_staff_id
      AND t.artist_name = artist_name_param
      AND (t.status IN ('denied', 'archive') OR t.archived = true)
      AND NOT EXISTS (
        SELECT 1
        FROM listen_logs ll
        WHERE ll.track_id = t.id
          AND ll.organization_id = t.organization_id
      )
  )
  SELECT denied.c AS denied_count, missed.c AS missed_count
  FROM denied, missed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_agent_artist_relations_stats(TEXT) TO authenticated;

