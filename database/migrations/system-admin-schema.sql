-- Migration: System Admin Role and Global Pulse Dashboard
-- Run this script in Supabase SQL Editor to enable SystemAdmin features

-- ============================================================================
-- 1. ADD SYSTEMADMIN ROLE TO STAFF_MEMBERS
-- ============================================================================
DO $$
BEGIN
  -- Update role constraint to include 'SystemAdmin'
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'check_role_values' AND table_name = 'staff_members') THEN
    ALTER TABLE staff_members DROP CONSTRAINT check_role_values;
  END IF;

  -- Re-add constraint with SystemAdmin
  ALTER TABLE staff_members ADD CONSTRAINT check_role_values 
    CHECK (role IN ('Owner', 'Manager', 'Scout', 'SystemAdmin'));
END $$;

-- ============================================================================
-- 2. FUNCTION TO CHECK IF USER IS SYSTEMADMIN
-- ============================================================================
CREATE OR REPLACE FUNCTION is_system_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM staff_members
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(user_role = 'SystemAdmin', false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_system_admin() TO authenticated;

-- ============================================================================
-- 3. UPDATE RLS POLICIES FOR SYSTEMADMIN BYPASS
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Staff can view their own organization tracks" ON tracks;
DROP POLICY IF EXISTS "Staff can view their own organization artists" ON artists;
DROP POLICY IF EXISTS "Staff can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Staff can view their own organization" ON staff_members;
DROP POLICY IF EXISTS "Staff can view their own organization votes" ON votes;
DROP POLICY IF EXISTS "Staff can view their own organization listen_logs" ON listen_logs;

-- Tracks: Allow SystemAdmin to see all, others see only their organization
CREATE POLICY "Staff can view their own organization tracks" ON tracks
  FOR SELECT
  USING (
    is_system_admin() 
    OR organization_id = get_user_organization_id()
  );

-- Artists: Allow SystemAdmin to see all, others see only their organization
CREATE POLICY "Staff can view their own organization artists" ON artists
  FOR SELECT
  USING (
    is_system_admin() 
    OR organization_id = get_user_organization_id()
  );

-- Organizations: Allow SystemAdmin to see all, others see only their organization
CREATE POLICY "Staff can view their own organization" ON organizations
  FOR SELECT
  USING (
    is_system_admin() 
    OR id = get_user_organization_id()
  );

-- Staff Members: Allow SystemAdmin to see all, others see only their organization
CREATE POLICY "Staff can view their own organization" ON staff_members
  FOR SELECT
  USING (
    is_system_admin() 
    OR organization_id = get_user_organization_id()
    OR auth_user_id = auth.uid()  -- Allow users to see their own record
  );

-- Votes: Allow SystemAdmin to see all, others see only their organization
CREATE POLICY "Staff can view their own organization votes" ON votes
  FOR SELECT
  USING (
    is_system_admin() 
    OR organization_id = get_user_organization_id()
  );

-- Listen Logs: Allow SystemAdmin to see all, others see only their organization
CREATE POLICY "Staff can view their own organization listen_logs" ON listen_logs
  FOR SELECT
  USING (
    is_system_admin() 
    OR organization_id = get_user_organization_id()
  );

-- ============================================================================
-- 4. FUNCTIONS FOR GLOBAL ANALYTICS
-- ============================================================================

-- Get total demos across all organizations for a time period
CREATE OR REPLACE FUNCTION get_global_demo_count(hours_back INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM tracks
    WHERE created_at >= NOW() - (hours_back || ' hours')::INTERVAL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_global_demo_count(INTEGER) TO authenticated;

-- Get genre sign rates across all organizations
CREATE OR REPLACE FUNCTION get_genre_sign_rates()
RETURNS TABLE (
  genre TEXT,
  total_submissions BIGINT,
  total_signed BIGINT,
  sign_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.genre,
    COUNT(*)::BIGINT as total_submissions,
    COUNT(*) FILTER (WHERE t.contract_signed = true)::BIGINT as total_signed,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE t.contract_signed = true)::NUMERIC / COUNT(*)::NUMERIC * 100)
      ELSE 0
    END as sign_rate
  FROM tracks t
  WHERE t.archived = false
  GROUP BY t.genre
  ORDER BY sign_rate DESC, total_submissions DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_genre_sign_rates() TO authenticated;

-- Get global staff efficiency metrics
CREATE OR REPLACE FUNCTION get_global_staff_efficiency()
RETURNS TABLE (
  staff_id TEXT,
  staff_name TEXT,
  organization_name TEXT,
  total_advanced BIGINT,
  total_signed BIGINT,
  hit_rate NUMERIC,
  decision_velocity NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH staff_metrics AS (
    SELECT 
      sm.id as staff_id,
      sm.name as staff_name,
      sm.organization_name,
      COUNT(DISTINCT t.id) FILTER (WHERE t.column IN ('second-listen', 'team-review', 'contracting', 'upcoming')) as total_advanced,
      COUNT(DISTINCT t.id) FILTER (WHERE t.contract_signed = true) as total_signed
    FROM staff_members sm
    LEFT JOIN tracks t ON t.organization_id = sm.organization_id
    WHERE sm.role = 'Scout' AND sm.active = true
    GROUP BY sm.id, sm.name, sm.organization_name
  )
  SELECT 
    sm.staff_id,
    sm.staff_name,
    sm.organization_name,
    sm.total_advanced,
    sm.total_signed,
    CASE 
      WHEN sm.total_advanced > 0 THEN 
        (sm.total_signed::NUMERIC / sm.total_advanced::NUMERIC * 100)
      ELSE 0
    END as hit_rate,
    0::NUMERIC as decision_velocity -- Placeholder, would need to calculate from timestamps
  FROM staff_metrics sm
  WHERE sm.total_advanced > 0
  ORDER BY hit_rate DESC, total_advanced DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_global_staff_efficiency() TO authenticated;

-- Get trend data for genres (week-over-week comparison)
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

-- Get hot artists (watched by multiple labels)
CREATE OR REPLACE FUNCTION get_hot_artists()
RETURNS TABLE (
  artist_name TEXT,
  organization_count BIGINT,
  total_watches BIGINT,
  total_likes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.name as artist_name,
    COUNT(DISTINCT a.organization_id)::BIGINT as organization_count,
    COUNT(DISTINCT t.id) FILTER (WHERE t.watched = true)::BIGINT as total_watches,
    COUNT(DISTINCT v.id) FILTER (WHERE v.vote_type = 1)::BIGINT as total_likes
  FROM artists a
  LEFT JOIN tracks t ON t.artist_id = a.id
  LEFT JOIN votes v ON v.track_id = t.id
  WHERE t.watched = true OR v.vote_type = 1
  GROUP BY a.name
  HAVING COUNT(DISTINCT a.organization_id) > 1
  ORDER BY organization_count DESC, total_watches DESC, total_likes DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_hot_artists() TO authenticated;

-- Get all organizations with performance metrics
CREATE OR REPLACE FUNCTION get_all_organizations_metrics()
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  slug TEXT,
  staff_count BIGINT,
  total_tracks BIGINT,
  signed_tracks BIGINT,
  company_health_score NUMERIC,
  decision_velocity NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id as organization_id,
    o.name as organization_name,
    o.slug,
    COUNT(DISTINCT sm.id)::BIGINT as staff_count,
    COUNT(DISTINCT t.id)::BIGINT as total_tracks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.contract_signed = true)::BIGINT as signed_tracks,
    CASE 
      WHEN COUNT(DISTINCT t.id) > 0 THEN
        (COUNT(DISTINCT t.id) FILTER (WHERE t.contract_signed = true)::NUMERIC / COUNT(DISTINCT t.id)::NUMERIC * 100)
      ELSE 0
    END as company_health_score,
    0::NUMERIC as decision_velocity -- Placeholder
  FROM organizations o
  LEFT JOIN staff_members sm ON sm.organization_id = o.id AND sm.active = true
  LEFT JOIN tracks t ON t.organization_id = o.id AND t.archived = false
  GROUP BY o.id, o.name, o.slug
  ORDER BY o.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_all_organizations_metrics() TO authenticated;

-- ============================================================================
-- VERIFY MIGRATION
-- ============================================================================
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_system_admin')
    THEN '✅ is_system_admin function exists'
    ELSE '❌ is_system_admin function NOT found'
  END as function_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_global_demo_count')
    THEN '✅ get_global_demo_count function exists'
    ELSE '❌ get_global_demo_count function NOT found'
  END as demo_count_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_genre_sign_rates')
    THEN '✅ get_genre_sign_rates function exists'
    ELSE '❌ get_genre_sign_rates function NOT found'
  END as genre_rates_check;
