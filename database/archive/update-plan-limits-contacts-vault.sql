-- ============================================================================
-- Update Plan Limits: Add Contacts and Vault Limits
-- ============================================================================
-- Free: 50 contacts, 12 vault tracks
-- Agent: 1000 contacts (unlimited "Signed"), unlimited vault
-- Starter: 1000 contacts, 200 vault tracks
-- Pro: 10,000 contacts, unlimited vault
-- Enterprise: unlimited both
-- ============================================================================

-- Update Free Plan
UPDATE plans 
SET 
  limits = jsonb_set(
    jsonb_set(
      limits,
      '{max_contacts}',
      '50'::jsonb
    ),
    '{max_vault_tracks}',
    '12'::jsonb
  )
WHERE id = 'free';

-- Update Agent Plan (1000 contacts, unlimited vault = -1)
UPDATE plans 
SET 
  limits = jsonb_set(
    jsonb_set(
      limits,
      '{max_contacts}',
      '1000'::jsonb
    ),
    '{max_vault_tracks}',
    '-1'::jsonb
  )
WHERE id = 'agent';

-- Update Starter Plan (1000 contacts, 200 vault)
UPDATE plans 
SET 
  limits = jsonb_set(
    jsonb_set(
      limits,
      '{max_contacts}',
      '1000'::jsonb
    ),
    '{max_vault_tracks}',
    '200'::jsonb
  )
WHERE id = 'starter';

-- Update Pro Plan (10,000 contacts, unlimited vault = -1)
UPDATE plans 
SET 
  limits = jsonb_set(
    jsonb_set(
      limits,
      '{max_contacts}',
      '10000'::jsonb
    ),
    '{max_vault_tracks}',
    '-1'::jsonb
  )
WHERE id = 'pro';

-- Enterprise already has unlimited (-1) for everything, but ensure it's set
UPDATE plans 
SET 
  limits = jsonb_set(
    jsonb_set(
      COALESCE(limits, '{}'::jsonb),
      '{max_contacts}',
      '-1'::jsonb
    ),
    '{max_vault_tracks}',
    '-1'::jsonb
  )
WHERE id = 'enterprise';

-- ============================================================================
-- Add new columns to organization_usage table
-- ============================================================================

ALTER TABLE organization_usage 
ADD COLUMN IF NOT EXISTS contacts_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS vault_tracks_count INTEGER DEFAULT 0;

-- ============================================================================
-- Update check_usage_limit function to handle contacts and vault_tracks
-- ============================================================================

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
    AND s.status IN ('trialing', 'active', 'past_due')
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
      WHEN 'contacts' THEN contacts_count
      WHEN 'vault_tracks' THEN vault_tracks_count
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

-- ============================================================================
-- Function to recalculate contacts count for an organization
-- ============================================================================
-- This function counts unique artists (contacts) per organization
-- For Agent plan: Only counts non-signed contacts (signed are unlimited)

CREATE OR REPLACE FUNCTION recalculate_contacts_count(org_id UUID)
RETURNS VOID AS $$
DECLARE
  org_plan_id TEXT;
  contact_count INTEGER;
BEGIN
  -- Get the organization's plan
  SELECT s.plan_id INTO org_plan_id
  FROM subscriptions s
  WHERE s.organization_id = org_id
    AND s.status IN ('trialing', 'active', 'past_due')
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF org_plan_id IS NULL THEN
    SELECT 'free' INTO org_plan_id;
  END IF;

  -- Count unique artists based on plan
  -- Note: tracks table uses artist_id (foreign key), not artist column
  IF org_plan_id = 'agent' THEN
    -- Agent plan: Only count non-signed contacts
    SELECT COUNT(DISTINCT artist_id) INTO contact_count
    FROM tracks
    WHERE organization_id = org_id
      AND (contract_signed = false OR contract_signed IS NULL)
      AND archived = false
      AND artist_id IS NOT NULL;
  ELSE
    -- Other plans: Count all unique artists
    SELECT COUNT(DISTINCT artist_id) INTO contact_count
    FROM tracks
    WHERE organization_id = org_id
      AND archived = false
      AND artist_id IS NOT NULL;
  END IF;

  -- Update organization_usage
  INSERT INTO organization_usage (organization_id, contacts_count)
  VALUES (org_id, contact_count)
  ON CONFLICT (organization_id) DO UPDATE
  SET contacts_count = contact_count,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Trigger function to update contacts count when tracks change
-- ============================================================================

CREATE OR REPLACE FUNCTION update_contacts_count_trigger()
RETURNS TRIGGER AS $$
DECLARE
  org_id_val UUID;
  should_recalculate BOOLEAN := false;
BEGIN
  -- Determine organization ID and if recalculation is needed
  IF TG_OP = 'INSERT' THEN
    IF NEW.organization_id IS NOT NULL THEN
      org_id_val := NEW.organization_id;
      should_recalculate := true;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only recalculate if relevant fields changed
    IF (
      OLD.organization_id IS DISTINCT FROM NEW.organization_id OR
      OLD.artist_id IS DISTINCT FROM NEW.artist_id OR
      OLD.contract_signed IS DISTINCT FROM NEW.contract_signed OR
      OLD.archived IS DISTINCT FROM NEW.archived
    ) THEN
      org_id_val := COALESCE(NEW.organization_id, OLD.organization_id);
      should_recalculate := true;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.organization_id IS NOT NULL THEN
      org_id_val := OLD.organization_id;
      should_recalculate := true;
    END IF;
  END IF;

  -- Recalculate contacts count if needed
  IF should_recalculate AND org_id_val IS NOT NULL THEN
    PERFORM recalculate_contacts_count(org_id_val);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for contacts count
DROP TRIGGER IF EXISTS trigger_update_contacts_count ON tracks;
CREATE TRIGGER trigger_update_contacts_count
  AFTER INSERT OR UPDATE OR DELETE ON tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_contacts_count_trigger();

-- ============================================================================
-- Function to update vault tracks count
-- ============================================================================

CREATE OR REPLACE FUNCTION update_vault_tracks_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Only count if status is 'vault'
    IF NEW.status = 'vault' OR NEW.column = 'vault' THEN
      INSERT INTO organization_usage (organization_id, vault_tracks_count)
      VALUES (NEW.organization_id, 1)
      ON CONFLICT (organization_id) DO UPDATE
      SET vault_tracks_count = organization_usage.vault_tracks_count + 1,
          updated_at = NOW();
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Only decrement if status was 'vault'
    IF OLD.status = 'vault' OR OLD.column = 'vault' THEN
      UPDATE organization_usage
      SET vault_tracks_count = GREATEST(0, vault_tracks_count - 1),
          updated_at = NOW()
      WHERE organization_id = OLD.organization_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes: moved to vault (increment), moved from vault (decrement)
    IF (OLD.status != 'vault' AND OLD.column != 'vault') AND (NEW.status = 'vault' OR NEW.column = 'vault') THEN
      -- Moved to vault
      INSERT INTO organization_usage (organization_id, vault_tracks_count)
      VALUES (NEW.organization_id, 1)
      ON CONFLICT (organization_id) DO UPDATE
      SET vault_tracks_count = organization_usage.vault_tracks_count + 1,
          updated_at = NOW();
    ELSIF (OLD.status = 'vault' OR OLD.column = 'vault') AND (NEW.status != 'vault' AND NEW.column != 'vault') THEN
      -- Moved from vault
      UPDATE organization_usage
      SET vault_tracks_count = GREATEST(0, vault_tracks_count - 1),
          updated_at = NOW()
      WHERE organization_id = NEW.organization_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Create triggers for vault tracks
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_vault_tracks_count ON tracks;
CREATE TRIGGER trigger_update_vault_tracks_count
  AFTER INSERT OR UPDATE OR DELETE ON tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_vault_tracks_count();

-- ============================================================================
-- Initialize existing data
-- ============================================================================

-- Initialize contacts_count and vault_tracks_count for existing organizations
-- Use the recalculate function for accurate counts

DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT DISTINCT organization_id FROM tracks WHERE organization_id IS NOT NULL
  LOOP
    PERFORM recalculate_contacts_count(org_record.organization_id);
  END LOOP;
END $$;

-- Initialize vault_tracks_count
UPDATE organization_usage ou
SET vault_tracks_count = COALESCE((
  SELECT COUNT(*)
  FROM tracks t
  WHERE t.organization_id = ou.organization_id
    AND (t.status = 'vault' OR t.column = 'vault')
    AND t.archived = false
), 0)
WHERE vault_tracks_count = 0;

-- ============================================================================
-- Update get_organization_usage function to include new fields
-- ============================================================================

-- Drop existing function first since we're changing the return type
DROP FUNCTION IF EXISTS get_organization_usage(UUID);

CREATE OR REPLACE FUNCTION get_organization_usage(org_id UUID)
RETURNS TABLE (
  tracks_count INTEGER,
  staff_count INTEGER,
  storage_bytes BIGINT,
  api_calls_count INTEGER,
  contacts_count INTEGER,
  vault_tracks_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ou.tracks_count, 0),
    COALESCE(ou.staff_count, 0),
    COALESCE(ou.storage_bytes, 0),
    COALESCE(ou.api_calls_count, 0),
    COALESCE(ou.contacts_count, 0),
    COALESCE(ou.vault_tracks_count, 0)
  FROM organization_usage ou
  WHERE ou.organization_id = org_id;
  
  -- If no record exists, return zeros
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, 0::BIGINT, 0, 0, 0;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
