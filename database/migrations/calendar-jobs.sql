-- Migration: Calendar Automation Job Queue
-- Enqueues jobs from track changes; processed by Edge Function worker.
-- Run this script in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS calendar_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
  job_type TEXT NOT NULL CHECK (job_type IN ('follow_up_reminder', 'label_master_release')),
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  attempt_number INTEGER NOT NULL DEFAULT 1,
  next_retry_at TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_jobs_org ON calendar_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_calendar_jobs_status ON calendar_jobs(status);
CREATE INDEX IF NOT EXISTS idx_calendar_jobs_next_retry_at ON calendar_jobs(next_retry_at) WHERE status = 'pending';

-- updated_at trigger (reuse if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_calendar_jobs_updated_at ON calendar_jobs;
    CREATE TRIGGER update_calendar_jobs_updated_at
      BEFORE UPDATE ON calendar_jobs
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE calendar_jobs ENABLE ROW LEVEL SECURITY;

-- Members can view jobs
DROP POLICY IF EXISTS "Members can view calendar jobs" ON calendar_jobs;
CREATE POLICY "Members can view calendar jobs" ON calendar_jobs
  FOR SELECT
  USING (organization_id = ANY(get_user_organization_ids()));

-- No direct writes from clients (processed by service role); do not add INSERT/UPDATE policies.

-- Trigger: enqueue calendar jobs based on track changes (best-effort)
CREATE OR REPLACE FUNCTION queue_calendar_jobs_from_track_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_google BOOLEAN;
  has_microsoft BOOLEAN;
BEGIN
  IF NEW.organization_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine which providers are connected (active)
  SELECT EXISTS (
    SELECT 1 FROM oauth_connections
    WHERE organization_id = NEW.organization_id
      AND provider = 'google'
      AND active = true
  ) INTO has_google;

  SELECT EXISTS (
    SELECT 1 FROM oauth_connections
    WHERE organization_id = NEW.organization_id
      AND provider = 'microsoft'
      AND active = true
  ) INTO has_microsoft;

  -- 1) Follow Up -> reminder 2 days out
  IF (COALESCE(OLD.status, OLD."column") IS DISTINCT FROM COALESCE(NEW.status, NEW."column"))
     AND LOWER(COALESCE(NEW.status, NEW."column", '')) = 'follow up' THEN
    IF has_google THEN
      INSERT INTO calendar_jobs (organization_id, provider, job_type, payload)
      VALUES (
        NEW.organization_id,
        'google',
        'follow_up_reminder',
        jsonb_build_object('track', to_jsonb(NEW))
      );
    END IF;
    IF has_microsoft THEN
      INSERT INTO calendar_jobs (organization_id, provider, job_type, payload)
      VALUES (
        NEW.organization_id,
        'microsoft',
        'follow_up_reminder',
        jsonb_build_object('track', to_jsonb(NEW))
      );
    END IF;
  END IF;

  -- 2) Release Date set for signed artist -> add to label master calendar
  IF (OLD.release_date IS DISTINCT FROM NEW.release_date)
     AND NEW.release_date IS NOT NULL
     AND COALESCE(NEW.contract_signed, false) = true THEN
    IF has_google THEN
      INSERT INTO calendar_jobs (organization_id, provider, job_type, payload)
      VALUES (
        NEW.organization_id,
        'google',
        'label_master_release',
        jsonb_build_object('track', to_jsonb(NEW))
      );
    END IF;
    IF has_microsoft THEN
      INSERT INTO calendar_jobs (organization_id, provider, job_type, payload)
      VALUES (
        NEW.organization_id,
        'microsoft',
        'label_master_release',
        jsonb_build_object('track', to_jsonb(NEW))
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tracks_calendar_jobs ON tracks;
CREATE TRIGGER trg_tracks_calendar_jobs
AFTER UPDATE ON tracks
FOR EACH ROW
EXECUTE FUNCTION queue_calendar_jobs_from_track_update();

