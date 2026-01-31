-- Testing Sandbox: metadata flag, exclude test data from trends, purge function
-- Run this single script in Supabase SQL Editor before using scripts/sandbox-seed.js

-- =============================================================================
-- 1. Add metadata JSONB to tracks (test-data flag; excluded from global trends)
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tracks') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'tracks' AND column_name = 'metadata'
    ) THEN
      ALTER TABLE tracks ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
      COMMENT ON COLUMN tracks.metadata IS 'Optional JSON: use is_test_data: true to exclude from app statistics/global trend reports';
      CREATE INDEX IF NOT EXISTS idx_tracks_metadata_test_data ON tracks ((metadata->>'is_test_data')) WHERE (metadata->>'is_test_data') = 'true';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- 2. Exclude test data from get_genre_trends()
-- =============================================================================
CREATE OR REPLACE FUNCTION get_genre_trends()
RETURNS TABLE (
  genre TEXT,
  current_week_count BIGINT,
  previous_week_count BIGINT,
  change_percentage NUMERIC,
  is_hot BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH current_week AS (
    SELECT 
      genre,
      COUNT(*) as count
    FROM tracks
    WHERE created_at >= NOW() - INTERVAL '7 days'
      AND archived = false
      AND COALESCE((metadata->>'is_test_data')::boolean, false) = false
    GROUP BY genre
  ),
  previous_week AS (
    SELECT 
      genre,
      COUNT(*) as count
    FROM tracks
    WHERE created_at >= NOW() - INTERVAL '14 days'
      AND created_at < NOW() - INTERVAL '7 days'
      AND archived = false
      AND COALESCE((metadata->>'is_test_data')::boolean, false) = false
    GROUP BY genre
  )
  SELECT 
    COALESCE(cw.genre, pw.genre) as genre,
    COALESCE(cw.count, 0)::BIGINT as current_week_count,
    COALESCE(pw.count, 0)::BIGINT as previous_week_count,
    CASE 
      WHEN COALESCE(pw.count, 0) > 0 THEN
        ((COALESCE(cw.count, 0)::NUMERIC - COALESCE(pw.count, 0)::NUMERIC) / COALESCE(pw.count, 1)::NUMERIC * 100)
      ELSE 
        CASE WHEN COALESCE(cw.count, 0) > 0 THEN 100 ELSE 0 END
    END as change_percentage,
    CASE 
      WHEN COALESCE(pw.count, 0) > 0 THEN
        ((COALESCE(cw.count, 0)::NUMERIC - COALESCE(pw.count, 0)::NUMERIC) / COALESCE(pw.count, 1)::NUMERIC * 100) > 20
      ELSE false
    END as is_hot
  FROM current_week cw
  FULL OUTER JOIN previous_week pw ON cw.genre = pw.genre
  ORDER BY change_percentage DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_genre_trends() TO authenticated;

-- =============================================================================
-- 3. Purge test sandbox data (tracks, orgs, staff; auth users via Admin API)
-- =============================================================================
CREATE OR REPLACE FUNCTION purge_test_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tracks_deleted INTEGER := 0;
  orgs_deleted INTEGER := 0;
  staff_deleted INTEGER := 0;
  mems_deleted INTEGER := 0;
  sandbox_org_ids UUID[] := ARRAY[]::UUID[];
  sandbox_staff_ids TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- 1) Delete all tracks marked as test data
  WITH deleted AS (
    DELETE FROM tracks
    WHERE (metadata->>'is_test_data') = 'true'
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO tracks_deleted FROM deleted;

  -- 2) Get sandbox org ids (Neon Records, Basement Tapes)
  SELECT ARRAY_AGG(id) INTO sandbox_org_ids
  FROM organizations
  WHERE name IN ('Neon Records', 'Basement Tapes');

  IF sandbox_org_ids IS NOT NULL AND array_length(sandbox_org_ids, 1) > 0 THEN
    -- Delete memberships for those orgs
    WITH deleted AS (
      DELETE FROM memberships
      WHERE organization_id = ANY(sandbox_org_ids)
      RETURNING id
    )
    SELECT mems_deleted + COUNT(*)::INTEGER INTO mems_deleted FROM deleted;

    -- Delete organizations (cascade will clean usage, etc. if applicable)
    WITH deleted AS (
      DELETE FROM organizations
      WHERE id = ANY(sandbox_org_ids)
      RETURNING id
    )
    SELECT COUNT(*)::INTEGER INTO orgs_deleted FROM deleted;
  END IF;

  -- 3) Get staff_members that belong to sandbox auth users (by email)
  SELECT ARRAY_AGG(sm.id) INTO sandbox_staff_ids
  FROM staff_members sm
  JOIN auth.users u ON u.id = sm.auth_user_id
  WHERE u.email IN (
    'free@soundpath.app',
    'starter@soundpath.app',
    'pro@soundpath.app',
    'agent@soundpath.app'
  );

  IF sandbox_staff_ids IS NOT NULL AND array_length(sandbox_staff_ids, 1) > 0 THEN
    -- Delete memberships for those staff
    WITH deleted AS (
      DELETE FROM memberships
      WHERE user_id = ANY(sandbox_staff_ids)
      RETURNING id
    )
    SELECT mems_deleted + COUNT(*)::INTEGER INTO mems_deleted FROM deleted;

    -- Delete staff_members
    WITH deleted AS (
      DELETE FROM staff_members
      WHERE id = ANY(sandbox_staff_ids)
      RETURNING id
    )
    SELECT COUNT(*)::INTEGER INTO staff_deleted FROM deleted;
  END IF;

  RETURN jsonb_build_object(
    'tracks_deleted', tracks_deleted,
    'organizations_deleted', orgs_deleted,
    'staff_deleted', staff_deleted,
    'memberships_deleted', mems_deleted,
    'auth_users_note', 'Delete auth users via Auth Admin API (emails: free@, starter@, pro@, agent@soundpath.app)'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION purge_test_data() TO authenticated;
GRANT EXECUTE ON FUNCTION purge_test_data() TO service_role;

COMMENT ON FUNCTION purge_test_data() IS 'Removes all test sandbox data: tracks with metadata.is_test_data, Neon/Basement orgs, and sandbox staff. Call Auth Admin API to delete the 4 test users.';
