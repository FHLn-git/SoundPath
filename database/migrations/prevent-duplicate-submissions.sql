-- Migration: Prevent duplicate submissions by link
-- Blocks inserting the same SoundCloud/Spotify/Dropbox link more than once.
-- Works across all ingestion paths (public form, widget ingest, email bridge, etc).
--
-- Run this script in Supabase SQL Editor.

-- Normalize a submission link for dedupe checks.
-- Note: keep IMMUTABLE so it can be used in indexes.
CREATE OR REPLACE FUNCTION normalize_submission_link(url TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  WITH cleaned AS (
    SELECT
      CASE
        WHEN url IS NULL OR btrim(url) = '' THEN NULL
        ELSE
          regexp_replace(
            regexp_replace(
              regexp_replace(lower(btrim(url)), '#.*$', ''),
              '\\?.*$', ''
            ),
            '/+$', ''
          )
      END AS v
  )
  SELECT NULLIF(v, '') FROM cleaned
$$;

-- NOTE: We do NOT mutate existing track rows here. Different deployments may have
-- NOT NULL constraints on `tracks.sc_link`, and real-world data may contain
-- legacy/null/junk values. Instead, we make the index predicate only apply when
-- the *normalized* link is non-null.

-- 1) Label inbox (org-wide inbox): unique by (organization_id, normalized link)
-- Only applies when this track is NOT routed to a specific recipient agent.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tracks') THEN
    DROP INDEX IF EXISTS uniq_tracks_org_normalized_sc_link;
    CREATE UNIQUE INDEX uniq_tracks_org_normalized_sc_link
      ON tracks (organization_id, normalize_submission_link(sc_link))
      WHERE organization_id IS NOT NULL
        AND recipient_user_id IS NULL
        AND sc_link IS NOT NULL
        AND btrim(sc_link) <> ''
        AND normalize_submission_link(sc_link) IS NOT NULL;
  END IF;
END $$;

-- 2) Agent/personal inbox: unique by (recipient_user_id, normalized link)
-- Applies regardless of org_id so the same link can be sent to multiple agents.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tracks') THEN
    DROP INDEX IF EXISTS uniq_tracks_recipient_normalized_sc_link;
    CREATE UNIQUE INDEX uniq_tracks_recipient_normalized_sc_link
      ON tracks (recipient_user_id, normalize_submission_link(sc_link))
      WHERE recipient_user_id IS NOT NULL
        AND sc_link IS NOT NULL
        AND btrim(sc_link) <> ''
        AND normalize_submission_link(sc_link) IS NOT NULL;
  END IF;
END $$;

