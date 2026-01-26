-- Fix check_usage_limit to handle 'past_due' subscriptions correctly
-- Past due subscriptions should still use their paid plan limits, not free tier
-- Only truly inactive subscriptions (canceled, unpaid) should fall back to free tier

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
  -- Only exclude 'canceled', 'unpaid', and 'incomplete' as truly inactive
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
