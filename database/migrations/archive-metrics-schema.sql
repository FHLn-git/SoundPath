-- Archive Metrics Schema
-- Stores historical metrics and statistics when organizations are deleted
-- Run this in Supabase SQL Editor

-- Table to archive organization metrics before deletion
CREATE TABLE IF NOT EXISTS archived_organization_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  organization_name TEXT NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_by TEXT REFERENCES staff_members(id) ON DELETE SET NULL,
  
  -- Snapshot of organization data
  total_tracks INTEGER DEFAULT 0,
  total_artists INTEGER DEFAULT 0,
  total_staff INTEGER DEFAULT 0,
  total_submissions INTEGER DEFAULT 0,
  
  -- Subscription information
  subscription_plan_id TEXT,
  subscription_status TEXT,
  subscription_created_at TIMESTAMPTZ,
  subscription_canceled_at TIMESTAMPTZ,
  total_revenue NUMERIC(10, 2) DEFAULT 0,
  
  -- Usage metrics
  tracks_count INTEGER DEFAULT 0,
  staff_count INTEGER DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  api_calls_count INTEGER DEFAULT 0,
  
  -- Company health metrics
  company_health_score NUMERIC(5, 2),
  daily_demos INTEGER DEFAULT 0,
  fatigued_staff_count INTEGER DEFAULT 0,
  total_staff_count INTEGER DEFAULT 0,
  
  -- Staff metrics snapshot (JSONB for flexibility)
  staff_metrics_snapshot JSONB DEFAULT '[]'::jsonb,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying archived metrics
CREATE INDEX IF NOT EXISTS idx_archived_org_metrics_org_id ON archived_organization_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_archived_org_metrics_deleted_at ON archived_organization_metrics(deleted_at DESC);

-- Function to archive organization metrics before deletion
CREATE OR REPLACE FUNCTION archive_organization_metrics(p_organization_id UUID, p_deleted_by TEXT)
RETURNS UUID AS $$
DECLARE
  v_archive_id UUID;
  v_org_name TEXT;
  v_total_tracks INTEGER;
  v_total_artists INTEGER;
  v_total_staff INTEGER;
  v_total_revenue NUMERIC(10, 2);
  v_subscription_data RECORD;
  v_usage_data RECORD;
  v_staff_metrics JSONB;
BEGIN
  -- Get organization name
  SELECT name INTO v_org_name
  FROM organizations
  WHERE id = p_organization_id;
  
  IF v_org_name IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;
  
  -- Count tracks
  SELECT COUNT(*) INTO v_total_tracks
  FROM tracks
  WHERE organization_id = p_organization_id;
  
  -- Count artists (approximate - artists might be shared)
  SELECT COUNT(DISTINCT artist_id) INTO v_total_artists
  FROM tracks
  WHERE organization_id = p_organization_id AND artist_id IS NOT NULL;
  
  -- Count active staff
  SELECT COUNT(*) INTO v_total_staff
  FROM memberships
  WHERE organization_id = p_organization_id AND active = true;
  
  -- Get subscription data
  SELECT 
    plan_id,
    status,
    created_at,
    canceled_at
  INTO v_subscription_data
  FROM subscriptions
  WHERE organization_id = p_organization_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Get usage data
  SELECT 
    tracks_count,
    staff_count,
    storage_bytes,
    api_calls_count
  INTO v_usage_data
  FROM organization_usage
  WHERE organization_id = p_organization_id;
  
  -- Get staff metrics snapshot
  SELECT jsonb_agg(
    jsonb_build_object(
      'staff_id', sm.id,
      'name', sm.name,
      'role', m.role,
      'weekly_listens', COALESCE((SELECT COUNT(*) FROM votes WHERE staff_member_id = sm.id), 0),
      'created_at', sm.created_at
    )
  ) INTO v_staff_metrics
  FROM staff_members sm
  JOIN memberships m ON m.user_id = sm.id
  WHERE m.organization_id = p_organization_id
    AND m.active = true;
  
  -- Calculate total revenue (sum of all invoices)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_revenue
  FROM invoices
  WHERE organization_id = p_organization_id AND status = 'paid';
  
  IF v_total_revenue IS NULL THEN
    v_total_revenue := 0;
  END IF;
  
  -- Insert archived metrics
  INSERT INTO archived_organization_metrics (
    organization_id,
    organization_name,
    deleted_by,
    total_tracks,
    total_artists,
    total_staff,
    subscription_plan_id,
    subscription_status,
    subscription_created_at,
    subscription_canceled_at,
    total_revenue,
    tracks_count,
    staff_count,
    storage_bytes,
    api_calls_count,
    staff_metrics_snapshot
  ) VALUES (
    p_organization_id,
    v_org_name,
    p_deleted_by,
    v_total_tracks,
    v_total_artists,
    v_total_staff,
    v_subscription_data.plan_id,
    v_subscription_data.status,
    v_subscription_data.created_at,
    v_subscription_data.canceled_at,
    v_total_revenue,
    COALESCE(v_usage_data.tracks_count, 0),
    COALESCE(v_usage_data.staff_count, 0),
    COALESCE(v_usage_data.storage_bytes, 0),
    COALESCE(v_usage_data.api_calls_count, 0),
    COALESCE(v_staff_metrics, '[]'::jsonb)
  ) RETURNING id INTO v_archive_id;
  
  RETURN v_archive_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on archived metrics (SystemAdmin only)
ALTER TABLE archived_organization_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists, then create it
DROP POLICY IF EXISTS "SystemAdmin can view archived metrics" ON archived_organization_metrics;
CREATE POLICY "SystemAdmin can view archived metrics" ON archived_organization_metrics
  FOR SELECT
  USING (is_system_admin());

COMMENT ON TABLE archived_organization_metrics IS 'Archived metrics and statistics for deleted organizations';
COMMENT ON FUNCTION archive_organization_metrics IS 'Archives organization metrics before deletion';
