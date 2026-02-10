-- ============================================================================
-- Phase 4: Advances – templates and shareable advance page
-- Run after: venue-lifecycle-and-deals.sql
-- ============================================================================
-- Adds: advance_templates (venue-level default sections), optional
-- advance_page_slug on shows, and get_advance_for_show(show_id) for public
-- read-only advance page (no auth; slug/ID is the secret).
-- ============================================================================

-- 1. Advance templates (venue-level default sections for advance content)
CREATE TABLE IF NOT EXISTS advance_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default',
  sections JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advance_templates_venue_id ON advance_templates(venue_id);
ALTER TABLE advance_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view advance_templates for own venues"
  ON advance_templates FOR SELECT
  USING (EXISTS (SELECT 1 FROM venues v WHERE v.id = advance_templates.venue_id AND v.owner_id = auth.uid()));

CREATE POLICY "Venue managers can view advance_templates"
  ON advance_templates FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = advance_templates.venue_id
      AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid()))
  );

CREATE POLICY "Users can manage advance_templates for own venues"
  ON advance_templates FOR ALL
  USING (EXISTS (SELECT 1 FROM venues v WHERE v.id = advance_templates.venue_id AND v.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM venues v WHERE v.id = advance_templates.venue_id AND v.owner_id = auth.uid()));

CREATE POLICY "Venue managers can manage advance_templates"
  ON advance_templates FOR ALL
  USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = advance_templates.venue_id
      AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = advance_templates.venue_id
      AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid()))
  );

DROP TRIGGER IF EXISTS advance_templates_updated_at ON advance_templates;
CREATE TRIGGER advance_templates_updated_at
  BEFORE UPDATE ON advance_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE advance_templates IS 'Default advance content (run of show blocks, rider disclaimer) per venue';

-- 2. Optional slug on shows for prettier advance URLs (can use show_id instead)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shows' AND column_name = 'advance_page_slug') THEN
    ALTER TABLE shows ADD COLUMN advance_page_slug TEXT UNIQUE;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_shows_advance_page_slug ON shows(advance_page_slug) WHERE advance_page_slug IS NOT NULL;
    COMMENT ON COLUMN shows.advance_page_slug IS 'Optional short slug for shareable advance URL (e.g. /advance/abc12)';
  END IF;
END $$;

-- 3. Public read for advance page: SECURITY DEFINER function so anon can fetch one show + venue by id/slug
CREATE OR REPLACE FUNCTION get_advance_for_show(p_show_id UUID)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'show', json_build_object(
      'id', s.id,
      'name', s.name,
      'artist_name', s.artist_name,
      'date', s.date,
      'load_in', s.load_in,
      'soundcheck', s.soundcheck,
      'doors', s.doors,
      'curfew', s.curfew,
      'load_out', s.load_out,
      'bands', s.bands,
      'special_requests', s.special_requests,
      'advance_page_slug', s.advance_page_slug
    ),
    'venue', json_build_object(
      'id', v.id,
      'name', v.name,
      'address_street_1', v.address_street_1,
      'address_street_2', v.address_street_2,
      'address_city', v.address_city,
      'address_state_region', v.address_state_region,
      'address_postal_code', v.address_postal_code,
      'address_country', v.address_country,
      'timezone', v.timezone,
      'contact_info', v.contact_info
    )
  )
  FROM shows s
  JOIN venues v ON v.id = s.venue_id
  WHERE s.id = p_show_id;
$$;

COMMENT ON FUNCTION get_advance_for_show(UUID) IS 'Public advance data for one show (run-of-show, venue contact). Callable by anon; ID/slug is the secret.';

-- Allow anon to call the function (no RLS on function; it only returns one row by id)
GRANT EXECUTE ON FUNCTION get_advance_for_show(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_advance_for_show(UUID) TO authenticated;
