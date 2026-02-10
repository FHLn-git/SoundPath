-- ============================================================================
-- Phase 6: Assets & Integrations (Venue)
-- Run after: venue-lifecycle-and-deals.sql, venue-corporate-hierarchy
-- ============================================================================
-- Adds: confidential flag on venue_assets; venue_integrations table;
-- Storage bucket and RLS for venue-assets (riders, contracts, posters).
-- Designed for ecosystem reuse: Sign/Splits consume show/offer context;
-- integrations pattern can be extended to Label/Artist later.
-- ============================================================================

-- ============================================================================
-- 1. VENUE_ASSETS: confidential flag (contracts visible only to roles with financial access)
-- ============================================================================
ALTER TABLE venue_assets
  ADD COLUMN IF NOT EXISTS confidential BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN venue_assets.confidential IS 'When true, only roles with financial visibility (e.g. venue_manager, group_admin) see this asset; used for contracts.';

-- ============================================================================
-- 2. VENUE_INTEGRATIONS (calendar sync, ticketing webhook; extensible for ecosystem)
-- ============================================================================
CREATE TABLE IF NOT EXISTS venue_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(venue_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_venue_integrations_venue_id ON venue_integrations(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_integrations_provider ON venue_integrations(provider);

ALTER TABLE venue_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view venue_integrations for own venues"
  ON venue_integrations FOR SELECT
  USING (EXISTS (SELECT 1 FROM venues v WHERE v.id = venue_integrations.venue_id AND v.owner_id = auth.uid()));
CREATE POLICY "Venue managers and group admins can view venue_integrations"
  ON venue_integrations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = venue_integrations.venue_id AND (
      EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid())
      OR (v.group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = v.group_id AND vr.user_id = auth.uid()))
    ))
  );

CREATE POLICY "Users can manage venue_integrations for own venues"
  ON venue_integrations FOR ALL
  USING (EXISTS (SELECT 1 FROM venues v WHERE v.id = venue_integrations.venue_id AND v.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM venues v WHERE v.id = venue_integrations.venue_id AND v.owner_id = auth.uid()));
CREATE POLICY "Venue managers and group admins can manage venue_integrations"
  ON venue_integrations FOR ALL
  USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = venue_integrations.venue_id AND (
      EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid() AND vr.role = 'venue_manager')
      OR (v.group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = v.group_id AND vr.user_id = auth.uid() AND vr.role = 'group_admin'))
    ))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = venue_integrations.venue_id AND (
      EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid())
      OR (v.group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = v.group_id AND vr.user_id = auth.uid()))
    ))
  );

DROP TRIGGER IF EXISTS venue_integrations_updated_at ON venue_integrations;
CREATE TRIGGER venue_integrations_updated_at
  BEFORE UPDATE ON venue_integrations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE venue_integrations IS 'Calendar (ical, google_calendar) and ticketing webhook config per venue; ecosystem-ready for Label/Artist later.';

-- ============================================================================
-- 3. STORAGE BUCKET: venue-assets (private; path = venue_id/asset_id/filename)
-- ============================================================================
-- If this insert fails (e.g. migration role cannot write to storage.buckets),
-- create the bucket manually in Supabase Dashboard: Storage → New bucket →
-- name: venue-assets, Public: off, File size limit: 50MB, Allowed MIME: pdf, image/*.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT gen_random_uuid(), 'venue-assets', false, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'venue-assets');

-- RLS on storage.objects: allow access when path first segment = venue_id and user has venue access.
-- Policies reference bucket by (SELECT id FROM storage.buckets WHERE name = 'venue-assets').
DROP POLICY IF EXISTS "venue_assets_select" ON storage.objects;
DROP POLICY IF EXISTS "venue_assets_insert" ON storage.objects;
DROP POLICY IF EXISTS "venue_assets_update" ON storage.objects;
DROP POLICY IF EXISTS "venue_assets_delete" ON storage.objects;

CREATE POLICY "venue_assets_select" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = (SELECT id FROM storage.buckets WHERE name = 'venue-assets' LIMIT 1)
    AND EXISTS (
      SELECT 1 FROM venues v
      WHERE v.id::text = (storage.foldername(name))[1]
      AND (v.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid())
        OR (v.group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = v.group_id AND vr.user_id = auth.uid()))
      )
    )
  );

CREATE POLICY "venue_assets_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = (SELECT id FROM storage.buckets WHERE name = 'venue-assets' LIMIT 1)
    AND EXISTS (
      SELECT 1 FROM venues v
      WHERE v.id::text = (storage.foldername(name))[1]
      AND (v.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid() AND vr.role = 'venue_manager')
        OR (v.group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = v.group_id AND vr.user_id = auth.uid() AND vr.role = 'group_admin'))
      )
    )
  );

CREATE POLICY "venue_assets_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = (SELECT id FROM storage.buckets WHERE name = 'venue-assets' LIMIT 1)
    AND EXISTS (
      SELECT 1 FROM venues v
      WHERE v.id::text = (storage.foldername(name))[1]
      AND (v.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid())
        OR (v.group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = v.group_id AND vr.user_id = auth.uid()))
      )
    )
  );

CREATE POLICY "venue_assets_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = (SELECT id FROM storage.buckets WHERE name = 'venue-assets' LIMIT 1)
    AND EXISTS (
      SELECT 1 FROM venues v
      WHERE v.id::text = (storage.foldername(name))[1]
      AND (v.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid() AND vr.role = 'venue_manager')
        OR (v.group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = v.group_id AND vr.user_id = auth.uid() AND vr.role = 'group_admin'))
      )
    )
  );
