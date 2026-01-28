-- Migration: Notification Preferences (overburden control)
-- Adds org-level notification preferences to gate high-frequency alerts.
-- Run this script in Supabase SQL Editor.

-- ============================================================================
-- 1. Organization notification preferences (org-level)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_notification_preferences (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{
    "comm": { "new_submission": false },
    "browser": { "high_priority_pitches": false }
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- updated_at trigger (reuse if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_org_notification_preferences_updated_at ON organization_notification_preferences;
    CREATE TRIGGER update_org_notification_preferences_updated_at
      BEFORE UPDATE ON organization_notification_preferences
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE organization_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Members can view
DROP POLICY IF EXISTS "Members can view org notification preferences" ON organization_notification_preferences;
CREATE POLICY "Members can view org notification preferences" ON organization_notification_preferences
  FOR SELECT
  USING (organization_id = ANY(get_user_organization_ids()));

-- Owners/Managers can manage
DROP POLICY IF EXISTS "Owners and Managers can manage org notification preferences" ON organization_notification_preferences;
CREATE POLICY "Owners and Managers can manage org notification preferences" ON organization_notification_preferences
  FOR ALL
  USING (
    organization_id = ANY(get_user_organization_ids())
    AND EXISTS (
      SELECT 1
      FROM memberships m
      JOIN staff_members sm ON sm.id = m.user_id
      WHERE sm.auth_user_id = auth.uid()
        AND m.organization_id = organization_notification_preferences.organization_id
        AND m.active = true
        AND m.role IN ('Owner', 'Manager')
    )
  )
  WITH CHECK (
    organization_id = ANY(get_user_organization_ids())
    AND EXISTS (
      SELECT 1
      FROM memberships m
      JOIN staff_members sm ON sm.id = m.user_id
      WHERE sm.auth_user_id = auth.uid()
        AND m.organization_id = organization_notification_preferences.organization_id
        AND m.active = true
        AND m.role IN ('Owner', 'Manager')
    )
  );

-- Helper RPC: ensure row exists and return prefs
CREATE OR REPLACE FUNCTION get_org_notification_preferences(org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefs JSONB;
BEGIN
  INSERT INTO organization_notification_preferences (organization_id)
  VALUES (org_id)
  ON CONFLICT (organization_id) DO NOTHING;

  SELECT preferences INTO prefs
  FROM organization_notification_preferences
  WHERE organization_id = org_id;

  RETURN COALESCE(prefs, '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION get_org_notification_preferences(UUID) TO authenticated;

-- ============================================================================
-- 2. Gate communication webhook queueing by org prefs (new_submission)
-- ============================================================================
CREATE OR REPLACE FUNCTION queue_communication_webhooks_on_new_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_status TEXT;
  cw RECORD;
  prefs JSONB;
  comm_enabled BOOLEAN;
BEGIN
  IF NEW.organization_id IS NULL THEN
    RETURN NEW;
  END IF;

  new_status := COALESCE(NEW.status, NEW."column", 'inbox');
  IF new_status <> 'inbox' THEN
    RETURN NEW;
  END IF;

  SELECT preferences INTO prefs
  FROM organization_notification_preferences
  WHERE organization_id = NEW.organization_id;

  comm_enabled := COALESCE((prefs->'comm'->>'new_submission')::boolean, false);
  IF comm_enabled IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  FOR cw IN
    SELECT id
    FROM communication_webhooks
    WHERE organization_id = NEW.organization_id
      AND active = true
  LOOP
    INSERT INTO communication_deliveries (
      communication_webhook_id,
      event_type,
      payload,
      status,
      attempt_number,
      next_retry_at
    )
    VALUES (
      cw.id,
      'new_submission',
      jsonb_build_object(
        'track', to_jsonb(NEW),
        'organization_id', NEW.organization_id
      ),
      'pending',
      1,
      NOW()
    );
  END LOOP;

  RETURN NEW;
END;
$$;

