-- API access is Pro and Enterprise only. Remove from Starter plan.
-- Run after saas-schema or on existing DBs that had Starter with API access.

UPDATE plans
SET
  features = jsonb_set(
    COALESCE(features, '{}'::jsonb),
    '{has_api_access}',
    'false'::jsonb
  ),
  limits = jsonb_set(
    COALESCE(limits, '{}'::jsonb),
    '{has_api_access}',
    'false'::jsonb
  ),
  updated_at = NOW()
WHERE id = 'starter';
