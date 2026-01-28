-- Migration: Trigger webhook deliveries from DB track changes
-- Ensures webhooks fire for app-created rows (not only API endpoint writes).
-- Run this script in Supabase SQL Editor.

-- ============================================================================
-- Helper: enqueue deliveries for an org + event
-- ============================================================================
CREATE OR REPLACE FUNCTION enqueue_webhooks_for_event(
  org_id UUID,
  event_type TEXT,
  payload JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wh RECORD;
BEGIN
  IF org_id IS NULL THEN
    RETURN;
  END IF;

  FOR wh IN
    SELECT id
    FROM webhooks
    WHERE organization_id = org_id
      AND active = true
      AND events @> ARRAY[event_type]
  LOOP
    INSERT INTO webhook_deliveries (
      webhook_id,
      event_type,
      payload,
      status,
      attempt_number,
      next_retry_at
    )
    VALUES (
      wh.id,
      event_type,
      payload,
      'pending',
      1,
      NOW()
    );
  END LOOP;
END;
$$;

-- ============================================================================
-- Tracks: after insert -> track.created (only if it lands in inbox)
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_track_created_webhooks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_status TEXT;
BEGIN
  IF NEW.organization_id IS NULL THEN
    RETURN NEW;
  END IF;

  new_status := COALESCE(NEW.status, NEW."column", 'inbox');
  IF new_status <> 'inbox' THEN
    RETURN NEW;
  END IF;

  PERFORM enqueue_webhooks_for_event(
    NEW.organization_id,
    'track.created',
    jsonb_build_object(
      'track', to_jsonb(NEW),
      'source', COALESCE(NEW.source, 'unknown')
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tracks_webhooks_created ON tracks;
CREATE TRIGGER trg_tracks_webhooks_created
AFTER INSERT ON tracks
FOR EACH ROW
EXECUTE FUNCTION trigger_track_created_webhooks();

-- ============================================================================
-- Tracks: after update -> track.updated (+ track.moved when status/column changes)
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_track_updated_webhooks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_status TEXT;
  new_status TEXT;
BEGIN
  IF NEW.organization_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM enqueue_webhooks_for_event(
    NEW.organization_id,
    'track.updated',
    jsonb_build_object(
      'before', to_jsonb(OLD),
      'after', to_jsonb(NEW)
    )
  );

  old_status := COALESCE(OLD.status, OLD."column", 'inbox');
  new_status := COALESCE(NEW.status, NEW."column", 'inbox');
  IF old_status IS DISTINCT FROM new_status THEN
    PERFORM enqueue_webhooks_for_event(
      NEW.organization_id,
      'track.moved',
      jsonb_build_object(
        'from', old_status,
        'to', new_status,
        'track', to_jsonb(NEW)
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tracks_webhooks_updated ON tracks;
CREATE TRIGGER trg_tracks_webhooks_updated
AFTER UPDATE ON tracks
FOR EACH ROW
EXECUTE FUNCTION trigger_track_updated_webhooks();

-- ============================================================================
-- Tracks: after delete -> track.deleted
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_track_deleted_webhooks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.organization_id IS NULL THEN
    RETURN OLD;
  END IF;

  PERFORM enqueue_webhooks_for_event(
    OLD.organization_id,
    'track.deleted',
    jsonb_build_object(
      'id', OLD.id,
      'track', to_jsonb(OLD)
    )
  );

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_tracks_webhooks_deleted ON tracks;
CREATE TRIGGER trg_tracks_webhooks_deleted
AFTER DELETE ON tracks
FOR EACH ROW
EXECUTE FUNCTION trigger_track_deleted_webhooks();

