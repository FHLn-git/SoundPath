-- ============================================================================
-- SoundPath SaaS Schema - Billing, Subscriptions, Usage, and Admin Features
-- Run this script in Supabase SQL Editor to enable full SaaS functionality
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. SUBSCRIPTION PLANS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY, -- 'free', 'starter', 'pro', 'enterprise'
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC(10, 2) NOT NULL DEFAULT 0,
  price_yearly NUMERIC(10, 2),
  currency TEXT DEFAULT 'USD',
  interval TEXT DEFAULT 'month' CHECK (interval IN ('month', 'year')),
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  paddle_plan_id TEXT,
  features JSONB DEFAULT '{}'::jsonb, -- Feature flags
  limits JSONB DEFAULT '{
    "max_tracks": 100,
    "max_staff": 3,
    "max_storage_mb": 1000,
    "max_api_calls_per_month": 10000,
    "has_analytics": false,
    "has_api_access": false,
    "has_webhooks": false,
    "has_sso": false,
    "has_priority_support": false,
    "has_custom_branding": false
  }'::jsonb,
  trial_days INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plans
INSERT INTO plans (id, name, description, price_monthly, price_yearly, interval, features, limits, trial_days, sort_order) VALUES
  ('free', 'Free', 'Perfect for small labels getting started', 0, 0, 'month', 
   '{"has_basic_tracking": true}'::jsonb,
   '{"max_tracks": 50, "max_staff": 2, "max_storage_mb": 500, "max_api_calls_per_month": 0, "has_analytics": false, "has_api_access": false, "has_webhooks": false, "has_sso": false, "has_priority_support": false, "has_custom_branding": false}'::jsonb,
   0, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO plans (id, name, description, price_monthly, price_yearly, interval, features, limits, trial_days, sort_order) VALUES
  ('starter', 'Starter', 'For growing labels', 29.95, 249.95, 'month',
   '{"has_basic_tracking": true, "has_analytics": true}'::jsonb,
   '{"max_tracks": 500, "max_staff": 10, "max_storage_mb": 5000, "max_api_calls_per_month": 50000, "has_analytics": true, "has_api_access": true, "has_webhooks": false, "has_sso": false, "has_priority_support": false, "has_custom_branding": false}'::jsonb,
   14, 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO plans (id, name, description, price_monthly, price_yearly, interval, features, limits, trial_days, sort_order) VALUES
  ('pro', 'Pro', 'For established labels', 99.95, 999.95, 'month',
   '{"has_basic_tracking": true, "has_analytics": true, "has_api_access": true, "has_webhooks": true, "has_custom_branding": true}'::jsonb,
   '{"max_tracks": 5000, "max_staff": 50, "max_storage_mb": 50000, "max_api_calls_per_month": 500000, "has_analytics": true, "has_api_access": true, "has_webhooks": true, "has_sso": false, "has_priority_support": true, "has_custom_branding": true}'::jsonb,
   14, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO plans (id, name, description, price_monthly, price_yearly, interval, features, limits, trial_days, sort_order) VALUES
  ('enterprise', 'Enterprise', 'For large labels and agencies', 299, 2990, 'month',
   '{"has_basic_tracking": true, "has_analytics": true, "has_api_access": true, "has_webhooks": true, "has_sso": true, "has_custom_branding": true, "has_white_label": true}'::jsonb,
   '{"max_tracks": 999999, "max_staff": 999, "max_storage_mb": 999999, "max_api_calls_per_month": 9999999, "has_analytics": true, "has_api_access": true, "has_webhooks": true, "has_sso": true, "has_priority_support": true, "has_custom_branding": true}'::jsonb,
   30, 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO plans (id, name, description, price_monthly, price_yearly, interval, features, limits, trial_days, sort_order, active) VALUES
  ('agent', 'Agent', 'For A&R agents working independently', 14.95, 99.95, 'month',
   '{"has_basic_tracking": true, "has_analytics": true, "has_personal_inbox": true, "has_network": true}'::jsonb,
   '{"max_tracks": 200, "max_staff": 1, "max_storage_mb": 2000, "max_api_calls_per_month": 10000, "has_analytics": true, "has_api_access": false, "has_webhooks": false, "has_sso": false, "has_priority_support": false, "has_custom_branding": false, "is_agent_plan": true}'::jsonb,
   14, 0.5, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. SUBSCRIPTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  paddle_subscription_id TEXT,
  paddle_customer_id TEXT,
  billing_interval TEXT DEFAULT 'month' CHECK (billing_interval IN ('month', 'year')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id) -- One active subscription per organization
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);

-- ============================================================================
-- 3. PAYMENT METHODS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT,
  paddle_payment_method_id TEXT,
  type TEXT CHECK (type IN ('card', 'bank_account', 'paypal')),
  last4 TEXT,
  brand TEXT, -- visa, mastercard, etc.
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_organization_id ON payment_methods(organization_id);

-- ============================================================================
-- 4. INVOICES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  stripe_invoice_id TEXT UNIQUE,
  paddle_invoice_id TEXT UNIQUE,
  pdf_url TEXT,
  hosted_invoice_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- ============================================================================
-- 5. ORGANIZATION USAGE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_usage (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  tracks_count INTEGER DEFAULT 0,
  staff_count INTEGER DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  api_calls_count INTEGER DEFAULT 0,
  api_calls_reset_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 month',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. API KEYS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT UNIQUE NOT NULL, -- Hashed API key
  key_prefix TEXT NOT NULL, -- First 8 chars for display (e.g., "sk_live_ab")
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT REFERENCES staff_members(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_api_keys_organization_id ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);

-- ============================================================================
-- 7. WEBHOOKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL, -- ['track.created', 'track.updated', etc.]
  secret TEXT NOT NULL, -- For signature verification
  active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_organization_id ON webhooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active) WHERE active = true;

-- ============================================================================
-- 8. WEBHOOK DELIVERIES TABLE (for retry logic)
-- ============================================================================
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  response_status INTEGER,
  response_body TEXT,
  attempt_number INTEGER DEFAULT 1,
  next_retry_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next_retry_at ON webhook_deliveries(next_retry_at) WHERE status = 'failed';

-- ============================================================================
-- 9. EMAIL QUEUE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT,
  text TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON email_queue(created_at);

-- ============================================================================
-- 10. AUDIT LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id TEXT REFERENCES staff_members(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'track.created', 'subscription.updated', etc.
  resource_type TEXT, -- 'track', 'subscription', 'organization', etc.
  resource_id TEXT,
  changes JSONB, -- Before/after changes
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- 11. FEATURE FLAGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  organization_ids UUID[], -- Specific orgs to enable for
  plan_ids TEXT[], -- Plans that have this feature
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default feature flags
INSERT INTO feature_flags (key, name, description, enabled, plan_ids) VALUES
  ('advanced_analytics', 'Advanced Analytics', 'Enable advanced analytics dashboard', false, ARRAY['pro', 'enterprise']),
  ('api_access', 'API Access', 'Enable REST API access', false, ARRAY['starter', 'pro', 'enterprise']),
  ('webhooks', 'Webhooks', 'Enable webhook notifications', false, ARRAY['pro', 'enterprise']),
  ('sso', 'Single Sign-On', 'Enable SSO authentication', false, ARRAY['enterprise']),
  ('custom_branding', 'Custom Branding', 'Enable custom branding', false, ARRAY['pro', 'enterprise']),
  ('white_label', 'White Label', 'Enable white label features', false, ARRAY['enterprise'])
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 12. HELPER FUNCTIONS
-- ============================================================================

-- Get organization's current subscription
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
    AND s.status IN ('trialing', 'active')
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get organization usage
CREATE OR REPLACE FUNCTION get_organization_usage(org_id UUID)
RETURNS TABLE (
  tracks_count INTEGER,
  staff_count INTEGER,
  storage_bytes BIGINT,
  api_calls_count INTEGER,
  api_calls_reset_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ou.tracks_count,
    ou.staff_count,
    ou.storage_bytes,
    ou.api_calls_count,
    ou.api_calls_reset_at
  FROM organization_usage ou
  WHERE ou.organization_id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if organization has feature access
CREATE OR REPLACE FUNCTION has_feature_access(org_id UUID, feature_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  org_plan_id TEXT;
  feature_enabled BOOLEAN;
  feature_plan_ids TEXT[];
BEGIN
  -- Get organization's plan
  SELECT plan_id INTO org_plan_id
  FROM subscriptions
  WHERE organization_id = org_id
    AND status IN ('trialing', 'active')
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

-- Check if organization is within usage limits
CREATE OR REPLACE FUNCTION check_usage_limit(org_id UUID, limit_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  org_plan_id TEXT;
  plan_limits JSONB;
  current_usage INTEGER;
  max_limit INTEGER;
BEGIN
  -- Get organization's plan and limits
  SELECT s.plan_id, p.limits INTO org_plan_id, plan_limits
  FROM subscriptions s
  JOIN plans p ON p.id = s.plan_id
  WHERE s.organization_id = org_id
    AND s.status IN ('trialing', 'active')
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF org_plan_id IS NULL THEN
    -- No active subscription, use free plan limits
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
  max_limit := (plan_limits->>limit_type)::INTEGER;

  -- Check if within limit (null means unlimited)
  RETURN max_limit IS NULL OR current_usage < max_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 12. TRIGGERS FOR USAGE TRACKING
-- ============================================================================

-- Function to update tracks count
CREATE OR REPLACE FUNCTION update_tracks_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO organization_usage (organization_id, tracks_count)
    VALUES (NEW.organization_id, 1)
    ON CONFLICT (organization_id) DO UPDATE
    SET tracks_count = organization_usage.tracks_count + 1,
        updated_at = NOW();
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE organization_usage
    SET tracks_count = GREATEST(0, tracks_count - 1),
        updated_at = NOW()
    WHERE organization_id = OLD.organization_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for tracks
DROP TRIGGER IF EXISTS trigger_update_tracks_count ON tracks;
CREATE TRIGGER trigger_update_tracks_count
  AFTER INSERT OR DELETE ON tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_tracks_count();

-- Function to update staff count
CREATE OR REPLACE FUNCTION update_staff_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Only count active memberships
    IF NEW.active = true THEN
      INSERT INTO organization_usage (organization_id, staff_count)
      VALUES (NEW.organization_id, 1)
      ON CONFLICT (organization_id) DO UPDATE
      SET staff_count = organization_usage.staff_count + 1,
          updated_at = NOW();
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Only decrement if the deleted membership was active
    IF OLD.active = true THEN
      UPDATE organization_usage
      SET staff_count = GREATEST(0, staff_count - 1),
          updated_at = NOW()
      WHERE organization_id = OLD.organization_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes (active -> inactive or inactive -> active)
    IF OLD.active = true AND NEW.active = false THEN
      -- Membership deactivated, decrement count
      UPDATE organization_usage
      SET staff_count = GREATEST(0, staff_count - 1),
          updated_at = NOW()
      WHERE organization_id = NEW.organization_id;
    ELSIF OLD.active = false AND NEW.active = true THEN
      -- Membership activated, increment count
      INSERT INTO organization_usage (organization_id, staff_count)
      VALUES (NEW.organization_id, 1)
      ON CONFLICT (organization_id) DO UPDATE
      SET staff_count = organization_usage.staff_count + 1,
          updated_at = NOW();
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for memberships (staff count)
DROP TRIGGER IF EXISTS trigger_update_staff_count ON memberships;
CREATE TRIGGER trigger_update_staff_count
  AFTER INSERT OR UPDATE OR DELETE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_count();

-- ============================================================================
-- 14. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Plans: Everyone can read
CREATE POLICY "Anyone can view plans" ON plans
  FOR SELECT
  USING (true);

-- Subscriptions: Organizations can view their own
CREATE POLICY "Organizations can view their own subscriptions" ON subscriptions
  FOR SELECT
  USING (organization_id = get_user_organization_id());

-- SystemAdmin can view all subscriptions
CREATE POLICY "SystemAdmin can view all subscriptions" ON subscriptions
  FOR SELECT
  USING (is_system_admin());

-- Payment methods: Organizations can view their own
CREATE POLICY "Organizations can view their own payment methods" ON payment_methods
  FOR SELECT
  USING (organization_id = get_user_organization_id());

-- Invoices: Organizations can view their own
CREATE POLICY "Organizations can view their own invoices" ON invoices
  FOR SELECT
  USING (organization_id = get_user_organization_id());

-- Usage: Organizations can view their own
CREATE POLICY "Organizations can view their own usage" ON organization_usage
  FOR SELECT
  USING (organization_id = get_user_organization_id());

-- API keys: Organizations can manage their own
CREATE POLICY "Organizations can manage their own API keys" ON api_keys
  FOR ALL
  USING (organization_id = get_user_organization_id());

-- Webhooks: Organizations can manage their own
CREATE POLICY "Organizations can manage their own webhooks" ON webhooks
  FOR ALL
  USING (organization_id = get_user_organization_id());

-- Audit logs: Organizations can view their own
CREATE POLICY "Organizations can view their own audit logs" ON audit_logs
  FOR SELECT
  USING (organization_id = get_user_organization_id() OR organization_id IS NULL);

-- Feature flags: Everyone can read
CREATE POLICY "Anyone can view feature flags" ON feature_flags
  FOR SELECT
  USING (true);

-- ============================================================================
-- 14. INITIALIZE USAGE FOR EXISTING ORGANIZATIONS
-- ============================================================================

-- Initialize usage counts for existing organizations
INSERT INTO organization_usage (organization_id, tracks_count, staff_count)
SELECT 
  o.id,
  COALESCE((SELECT COUNT(*) FROM tracks WHERE organization_id = o.id), 0),
  COALESCE((SELECT COUNT(*) FROM memberships WHERE organization_id = o.id AND active = true), 0)
FROM organizations o
ON CONFLICT (organization_id) DO NOTHING;

-- ============================================================================
-- 16. SET DEFAULT FREE PLAN FOR EXISTING ORGANIZATIONS
-- ============================================================================

-- Create free subscriptions for organizations without subscriptions
INSERT INTO subscriptions (organization_id, plan_id, status, current_period_start, current_period_end)
SELECT 
  o.id,
  'free',
  'active',
  NOW(),
  NOW() + INTERVAL '1 year'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions s WHERE s.organization_id = o.id
)
ON CONFLICT (organization_id) DO NOTHING;

COMMENT ON TABLE plans IS 'Subscription plans with pricing and feature limits';
COMMENT ON TABLE subscriptions IS 'Organization subscriptions to plans';
COMMENT ON TABLE payment_methods IS 'Stored payment methods for organizations';
COMMENT ON TABLE invoices IS 'Billing invoices';
COMMENT ON TABLE organization_usage IS 'Real-time usage tracking per organization';
COMMENT ON TABLE api_keys IS 'API keys for programmatic access';
COMMENT ON TABLE webhooks IS 'Webhook endpoints for event notifications';
COMMENT ON TABLE audit_logs IS 'Audit trail for all actions';
COMMENT ON TABLE feature_flags IS 'Feature flags for gradual rollouts';
