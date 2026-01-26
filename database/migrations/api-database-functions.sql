-- Database Functions for API and Webhook Support
-- Run this in Supabase SQL Editor

-- Function to increment API call count
CREATE OR REPLACE FUNCTION increment_api_calls(org_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO organization_usage (organization_id, api_calls_count, updated_at)
  VALUES (org_id, 1, NOW())
  ON CONFLICT (organization_id) DO UPDATE
  SET 
    api_calls_count = organization_usage.api_calls_count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment webhook failure count
CREATE OR REPLACE FUNCTION increment_webhook_failure_count(webhook_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE webhooks
  SET 
    failure_count = failure_count + 1,
    updated_at = NOW()
  WHERE id = webhook_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset API call count (for monthly reset)
CREATE OR REPLACE FUNCTION reset_monthly_api_calls()
RETURNS void AS $$
BEGIN
  UPDATE organization_usage
  SET 
    api_calls_count = 0,
    updated_at = NOW()
  WHERE updated_at < date_trunc('month', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get webhook delivery stats
CREATE OR REPLACE FUNCTION get_webhook_stats(webhook_id UUID)
RETURNS TABLE (
  total_deliveries BIGINT,
  successful_deliveries BIGINT,
  failed_deliveries BIGINT,
  pending_deliveries BIGINT,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_deliveries,
    COUNT(*) FILTER (WHERE status = 'success')::BIGINT as successful_deliveries,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_deliveries,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_deliveries,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE status = 'success')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0
    END as success_rate
  FROM webhook_deliveries
  WHERE webhook_deliveries.webhook_id = get_webhook_stats.webhook_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
