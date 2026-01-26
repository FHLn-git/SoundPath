-- ============================================================================
-- Complete Billing Setup - Agent Tier + Updated Prices
-- Run this ONE file in Supabase SQL Editor to set up everything
-- ============================================================================
-- 
-- BEFORE RUNNING:
-- 1. Get your Stripe Price IDs for Agent tier (monthly and yearly)
-- 2. Replace 'YOUR_AGENT_MONTHLY_PRICE_ID' and 'YOUR_AGENT_YEARLY_PRICE_ID' below
--    OR leave them as NULL and update them later using the UPDATE statements at the bottom
-- ============================================================================

-- Step 1: Add/Update Agent Tier
INSERT INTO plans (
  id, 
  name, 
  description, 
  price_monthly, 
  price_yearly, 
  interval, 
  stripe_price_id_monthly,
  stripe_price_id_yearly,
  features, 
  limits, 
  trial_days, 
  sort_order, 
  active
) VALUES
  (
    'agent', 
    'Agent', 
    'For A&R agents working independently', 
    14.95, 
    99.95, 
    'month',
    'prod_Tr88rcvYm4w38W',  -- Agent Monthly Stripe Price ID
    'prod_Tr8Acu7j3Wm01c',  -- Agent Yearly Stripe Price ID
    '{"has_basic_tracking": true, "has_analytics": true, "has_personal_inbox": true, "has_network": true}'::jsonb,
    '{"max_tracks": 200, "max_staff": 1, "max_storage_mb": 2000, "max_api_calls_per_month": 10000, "has_analytics": true, "has_api_access": false, "has_webhooks": false, "has_sso": false, "has_priority_support": false, "has_custom_branding": false, "is_agent_plan": true}'::jsonb,
    14, 
    0.5, 
    true
  )
ON CONFLICT (id) DO UPDATE
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  stripe_price_id_monthly = COALESCE(EXCLUDED.stripe_price_id_monthly, plans.stripe_price_id_monthly),
  stripe_price_id_yearly = COALESCE(EXCLUDED.stripe_price_id_yearly, plans.stripe_price_id_yearly),
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  trial_days = EXCLUDED.trial_days,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active;

-- Step 2: Update Starter Plan Prices
UPDATE plans 
SET 
  price_monthly = 29.95,
  price_yearly = 249.95
WHERE id = 'starter';

-- Step 3: Update Pro Plan Prices
UPDATE plans 
SET 
  price_monthly = 99.95,
  price_yearly = 999.95
WHERE id = 'pro';

-- Step 4: Verify all plans are set up correctly
SELECT 
  id, 
  name, 
  price_monthly, 
  price_yearly, 
  stripe_price_id_monthly,
  stripe_price_id_yearly,
  active, 
  sort_order 
FROM plans 
ORDER BY sort_order;

-- ============================================================================
-- OPTIONAL: Add Stripe Price IDs for Agent Tier
-- ============================================================================
-- If you didn't add the Stripe Price IDs above, run these UPDATE statements
-- with your actual Stripe Price IDs (they start with 'price_'):
--
-- UPDATE plans 
-- SET stripe_price_id_monthly = 'price_YOUR_ACTUAL_MONTHLY_ID'
-- WHERE id = 'agent';
--
-- UPDATE plans 
-- SET stripe_price_id_yearly = 'price_YOUR_ACTUAL_YEARLY_ID'
-- WHERE id = 'agent';
