-- ============================================================================
-- Update Stripe Price IDs for All Plans
-- Replace the placeholder price IDs below with your actual Stripe Price IDs
-- Price IDs should start with 'price_' (not 'prod_')
-- ============================================================================

-- Update Agent Plan Price IDs
UPDATE plans 
SET 
  stripe_price_id_monthly = 'price_1StPsf9KaoPSiGpYKrU5WuAc',
  stripe_price_id_yearly = 'price_1StPuI9KaoPSiGpYfrCcWNqN'
WHERE id = 'agent';

-- Update Starter Plan Price IDs
UPDATE plans 
SET 
  stripe_price_id_monthly = 'price_1StOq89KaoPSiGpYmGwnH212',
  stripe_price_id_yearly = 'price_1StOyc9KaoPSiGpYZRX8dVus'
WHERE id = 'starter';

-- Update Pro Plan Price IDs
UPDATE plans 
SET 
  stripe_price_id_monthly = 'price_1StP2L9KaoPSiGpYt4l4qSMH',
  stripe_price_id_yearly = 'price_1StP3f9KaoPSiGpYwZzwuxyE'
WHERE id = 'pro';

-- Update Free Plan Price IDs
-- Using $0 price ID for free tier (allows users to "subscribe" to free plan if needed)
UPDATE plans 
SET 
  stripe_price_id_monthly = 'price_1Stbbu9KaoPSiGpYPZzWwx13',  -- Free tier $0 price ID
  stripe_price_id_yearly = NULL  -- Free tier doesn't need yearly
WHERE id = 'free';

-- Update Enterprise Plan Price IDs
-- Enterprise plans are custom per client, so no default price IDs needed
-- Leave as NULL - custom pricing handled separately
UPDATE plans 
SET 
  stripe_price_id_monthly = NULL,  -- Custom pricing per client
  stripe_price_id_yearly = NULL     -- Custom pricing per client
WHERE id = 'enterprise';

-- Verify all price IDs are updated correctly
SELECT 
  id, 
  name, 
  price_monthly, 
  price_yearly, 
  stripe_price_id_monthly,
  stripe_price_id_yearly,
  CASE 
    -- Invalid format check
    WHEN stripe_price_id_monthly IS NOT NULL AND stripe_price_id_monthly NOT LIKE 'price_%' THEN '❌ Invalid monthly price ID'
    WHEN stripe_price_id_yearly IS NOT NULL AND stripe_price_id_yearly NOT LIKE 'price_%' THEN '❌ Invalid yearly price ID'
    -- Missing price ID warnings (only for paid plans)
    WHEN id NOT IN ('free', 'enterprise') AND stripe_price_id_monthly IS NULL THEN '⚠️ Missing monthly price ID'
    WHEN id NOT IN ('free', 'enterprise') AND stripe_price_id_yearly IS NULL THEN '⚠️ Missing yearly price ID'
    -- Free tier: only needs monthly (yearly is optional)
    WHEN id = 'free' AND stripe_price_id_monthly IS NULL THEN '⚠️ Free tier should have monthly price ID'
    -- Enterprise: NULL is acceptable (custom pricing)
    WHEN id = 'enterprise' THEN '✅ Valid (custom pricing)'
    -- All other cases are valid
    ELSE '✅ Valid'
  END as validation_status
FROM plans 
WHERE active = true
ORDER BY sort_order;
