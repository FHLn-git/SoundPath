-- Fix subscription-related functions to handle 'past_due' subscriptions correctly
-- Past due subscriptions should still be treated as active for feature access and limits
-- Only truly inactive subscriptions (canceled, unpaid, incomplete) should be excluded

-- 1. Fix get_organization_subscription to include 'past_due' status
CREATE OR REPLACE FUNCTION get_organization_subscription(org_id UUID)
RETURNS TABLE (
  subscription_id UUID,
  plan_id TEXT,
  plan_name TEXT,
  status TEXT,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  limits JSONB,
  features JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as subscription_id,
    s.plan_id,
    p.name as plan_name,
    s.status,
    s.current_period_end,
    s.trial_end,
    p.limits,
    p.features
  FROM subscriptions s
  JOIN plans p ON p.id = s.plan_id
  WHERE s.organization_id = org_id
    -- Include 'past_due' as active since users should still have paid plan access
    AND s.status IN ('trialing', 'active', 'past_due')
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix has_feature_access to include 'past_due' status
CREATE OR REPLACE FUNCTION has_feature_access(org_id UUID, feature_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  org_plan_id TEXT;
  feature_enabled BOOLEAN;
  feature_plan_ids TEXT[];
BEGIN
  -- Get organization's plan
  -- Include 'past_due' as active since users should still have paid plan access
  SELECT plan_id INTO org_plan_id
  FROM subscriptions
  WHERE organization_id = org_id
    AND status IN ('trialing', 'active', 'past_due')
  ORDER BY created_at DESC
  LIMIT 1;

  -- Get feature flag
  SELECT enabled, plan_ids INTO feature_enabled, feature_plan_ids
  FROM feature_flags
  WHERE key = feature_key;

  -- Check if feature is enabled and org's plan has access
  RETURN feature_enabled AND (org_plan_id = ANY(feature_plan_ids) OR array_length(feature_plan_ids, 1) IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix check_usage_limit to include 'past_due' status (already done in fix-check-usage-limit-past-due.sql, but included here for completeness)
CREATE OR REPLACE FUNCTION check_usage_limit(org_id UUID, limit_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  org_plan_id TEXT;
  plan_limits JSONB;
  current_usage INTEGER;
  max_limit INTEGER;
BEGIN
  -- Get organization's plan and limits
  -- Include 'past_due' in active statuses since they should still have paid plan access
  SELECT s.plan_id, p.limits INTO org_plan_id, plan_limits
  FROM subscriptions s
  JOIN plans p ON p.id = s.plan_id
  WHERE s.organization_id = org_id
    AND s.status IN ('trialing', 'active', 'past_due')
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF org_plan_id IS NULL THEN
    -- No active subscription (or only canceled/unpaid subscriptions), use free plan limits
    SELECT limits INTO plan_limits FROM plans WHERE id = 'free';
  END IF;

  -- Get current usage
  SELECT 
    CASE limit_type
      WHEN 'tracks' THEN tracks_count
      WHEN 'staff' THEN staff_count
      WHEN 'api_calls' THEN api_calls_count
      ELSE 0
    END
  INTO current_usage
  FROM organization_usage
  WHERE organization_id = org_id;

  -- Get limit from plan
  -- Handle both 'max_tracks' and 'tracks' key formats
  max_limit := COALESCE(
    (plan_limits->>limit_type)::INTEGER,
    (plan_limits->>('max_' || limit_type))::INTEGER
  );

  -- Check if within limit
  -- -1 means unlimited, NULL also means unlimited
  IF max_limit IS NULL OR max_limit = -1 THEN
    RETURN true;
  END IF;

  RETURN current_usage < max_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
