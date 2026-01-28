-- Migration: Communication Webhooks (Slack/Discord/Telegram/WhatsApp) + delivery queue
-- Sends "New Submission" pings when a track hits the Inbox.
-- Run this script in Supabase SQL Editor.

-- ============================================================================
-- 1. Tables
-- ============================================================================
CREATE TABLE IF NOT EXISTS communication_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('slack', 'discord', 'telegram', 'whatsapp')),
  url TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_communication_webhooks_org ON communication_webhooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_communication_webhooks_platform ON communication_webhooks(platform);

CREATE TABLE IF NOT EXISTS communication_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_webhook_id UUID NOT NULL REFERENCES communication_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  response_status INTEGER,
  response_body TEXT,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  next_retry_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communication_deliveries_webhook_id ON communication_deliveries(communication_webhook_id);
CREATE INDEX IF NOT EXISTS idx_communication_deliveries_status ON communication_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_communication_deliveries_next_retry_at ON communication_deliveries(next_retry_at) WHERE status = 'pending';

-- updated_at trigger (reuse if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_communication_webhooks_updated_at ON communication_webhooks;
    CREATE TRIGGER update_communication_webhooks_updated_at
      BEFORE UPDATE ON communication_webhooks
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- 2. RLS
-- ============================================================================
ALTER TABLE communication_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_deliveries ENABLE ROW LEVEL SECURITY;

-- View: any member of the org
DROP POLICY IF EXISTS "Members can view communication webhooks" ON communication_webhooks;
CREATE POLICY "Members can view communication webhooks" ON communication_webhooks
  FOR SELECT
  USING (organization_id = ANY(get_user_organization_ids()));

-- Manage: Owners/Managers
DROP POLICY IF EXISTS "Owners and Managers can manage communication webhooks" ON communication_webhooks;
CREATE POLICY "Owners and Managers can manage communication webhooks" ON communication_webhooks
  FOR ALL
  USING (
    organization_id = ANY(get_user_organization_ids())
    AND EXISTS (
      SELECT 1
      FROM memberships m
      JOIN staff_members sm ON sm.id = m.user_id
      WHERE sm.auth_user_id = auth.uid()
        AND m.organization_id = communication_webhooks.organization_id
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
        AND m.organization_id = communication_webhooks.organization_id
        AND m.active = true
        AND m.role IN ('Owner', 'Manager')
    )
  );

-- Deliveries: members can view status (read-only)
DROP POLICY IF EXISTS "Members can view communication deliveries" ON communication_deliveries;
CREATE POLICY "Members can view communication deliveries" ON communication_deliveries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM communication_webhooks cw
      WHERE cw.id = communication_deliveries.communication_webhook_id
        AND cw.organization_id = ANY(get_user_organization_ids())
    )
  );

-- ============================================================================
-- 3. Trigger: queue on new submission hitting inbox
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
BEGIN
  IF NEW.organization_id IS NULL THEN
    RETURN NEW;
  END IF;

  new_status := COALESCE(NEW.status, NEW."column", 'inbox');
  IF new_status <> 'inbox' THEN
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

DROP TRIGGER IF EXISTS trg_tracks_comm_new_submission ON tracks;
CREATE TRIGGER trg_tracks_comm_new_submission
AFTER INSERT ON tracks
FOR EACH ROW
EXECUTE FUNCTION queue_communication_webhooks_on_new_submission();

