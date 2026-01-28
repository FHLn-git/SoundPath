-- Migration: Push Notification Jobs + High Priority flag
-- Enqueues Web Push notifications when a track is marked high_priority.
-- Run this script in Supabase SQL Editor.

-- 1) Add high_priority flag to tracks if missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tracks') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'tracks' AND column_name = 'high_priority'
    ) THEN
      ALTER TABLE tracks ADD COLUMN high_priority BOOLEAN NOT NULL DEFAULT false;
      CREATE INDEX IF NOT EXISTS idx_tracks_high_priority ON tracks(high_priority) WHERE high_priority = true;
    END IF;
  END IF;
END $$;

-- 2) Push notification job queue
CREATE TABLE IF NOT EXISTS push_notification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  attempt_number INTEGER NOT NULL DEFAULT 1,
  next_retry_at TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_notification_jobs_status ON push_notification_jobs(status);
CREATE INDEX IF NOT EXISTS idx_push_notification_jobs_next_retry_at ON push_notification_jobs(next_retry_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_push_notification_jobs_auth_user_id ON push_notification_jobs(auth_user_id);

ALTER TABLE push_notification_jobs ENABLE ROW LEVEL SECURITY;

-- No client policies: internal use only.

-- 3) Trigger: enqueue on high_priority flip for personal inbox recipient
CREATE OR REPLACE FUNCTION queue_push_on_high_priority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_auth UUID;
  msg_title TEXT;
  msg_body TEXT;
BEGIN
  -- Only when a track becomes high_priority
  IF COALESCE(OLD.high_priority, false) = false AND COALESCE(NEW.high_priority, false) = true THEN
    -- Only for personal recipient (Agent workflow)
    IF NEW.recipient_user_id IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT auth_user_id INTO recipient_auth
    FROM staff_members
    WHERE id = NEW.recipient_user_id
    LIMIT 1;

    IF recipient_auth IS NULL THEN
      RETURN NEW;
    END IF;

    msg_title := 'High Priority Pitch';
    msg_body := COALESCE(NEW.artist_name, 'Artist') || ' — ' || COALESCE(NEW.title, 'Track');

    INSERT INTO push_notification_jobs (auth_user_id, title, body, url)
    VALUES (
      recipient_auth,
      msg_title,
      msg_body,
      '/personal/pitched'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tracks_push_high_priority ON tracks;
CREATE TRIGGER trg_tracks_push_high_priority
AFTER UPDATE ON tracks
FOR EACH ROW
EXECUTE FUNCTION queue_push_on_high_priority();

