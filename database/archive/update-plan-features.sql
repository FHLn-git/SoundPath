-- ============================================================================
-- Update Plan Features and Limits
-- Run this in Supabase SQL Editor to update all plan features and limits
-- ============================================================================

-- Update Free Plan (sort_order: 1 - first)
UPDATE plans 
SET 
  description = 'Perfect for small labels getting started',
  features = '{"has_basic_tracking": true, "has_limited_statistics": true}'::jsonb,
  limits = '{"max_tracks": 10, "max_staff": 1, "max_storage_mb": 500, "max_api_calls_per_month": 0, "has_analytics": false, "has_api_access": false, "has_webhooks": false, "has_sso": false, "has_priority_support": false, "has_custom_branding": false, "has_limited_statistics": true}'::jsonb,
  sort_order = 1
WHERE id = 'free';

-- Update Agent Plan (sort_order: 2 - second)
UPDATE plans 
SET 
  description = 'For A&R agents working independently',
  features = '{"has_basic_tracking": true, "has_basic_analytics": true, "has_personal_inbox": true, "has_network": true}'::jsonb,
  limits = '{"max_tracks": 100, "max_staff": 1, "max_storage_mb": 2000, "max_api_calls_per_month": 10000, "has_analytics": false, "has_basic_analytics": true, "has_api_access": false, "has_webhooks": false, "has_sso": false, "has_priority_support": false, "has_custom_branding": false, "is_agent_plan": true}'::jsonb,
  sort_order = 2
WHERE id = 'agent';

-- Update Starter Plan (sort_order: 3 - third)
UPDATE plans 
SET 
  description = 'For growing labels',
  features = '{"has_basic_tracking": true, "has_analytics": true, "has_personal_inbox": true, "has_network": true}'::jsonb,
  limits = '{"max_tracks": 100, "max_staff": 5, "max_storage_mb": 5000, "max_api_calls_per_month": 50000, "has_analytics": true, "has_api_access": false, "has_webhooks": false, "has_sso": false, "has_priority_support": false, "has_custom_branding": false}'::jsonb,
  sort_order = 3
WHERE id = 'starter';

-- Update Pro Plan (sort_order: 4 - fourth)
UPDATE plans 
SET 
  description = 'For established labels',
  features = '{"has_basic_tracking": true, "has_analytics": true, "has_api_access": true, "has_webhooks": true, "has_custom_branding": true, "has_global_trend_reports": true, "has_personal_inbox": true, "has_network": true}'::jsonb,
  limits = '{"max_tracks": 1000, "max_staff": 15, "max_storage_mb": 50000, "max_api_calls_per_month": 500000, "has_analytics": true, "has_api_access": true, "has_webhooks": true, "has_sso": false, "has_priority_support": true, "has_custom_branding": true, "has_global_trend_reports": true}'::jsonb,
  sort_order = 4
WHERE id = 'pro';

-- Update Enterprise Plan (only change the display text, limits stay unlimited)
-- The "Unlimited Tracks and Seats" text is handled in the frontend
UPDATE plans 
SET 
  description = 'For large labels and agencies',
  features = '{"has_basic_tracking": true, "has_analytics": true, "has_api_access": true, "has_webhooks": true, "has_sso": true, "has_custom_branding": true, "has_white_label": true, "has_global_trend_reports": true, "has_personal_inbox": true, "has_network": true}'::jsonb,
  limits = '{"max_tracks": -1, "max_staff": -1, "max_storage_mb": 999999, "max_api_calls_per_month": 9999999, "has_analytics": true, "has_api_access": true, "has_webhooks": true, "has_sso": true, "has_priority_support": true, "has_custom_branding": true, "has_white_label": true, "has_global_trend_reports": true}'::jsonb
WHERE id = 'enterprise';
