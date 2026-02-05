-- ============================================================================
-- Venues & Shows schema for ShowCheck (Venue) app – multi-tenant workspaces
-- Links to organizations so a Label and Venue can share a workspace if needed.
-- ============================================================================

-- ============================================================================
-- VENUES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  capacity INTEGER,
  address TEXT,
  contact_info JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venues_owner_id ON venues(owner_id);
CREATE INDEX IF NOT EXISTS idx_venues_organization_id ON venues(organization_id);

-- ============================================================================
-- SHOWS TABLE (events per venue)
-- ============================================================================
CREATE TABLE IF NOT EXISTS shows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  artist_name TEXT,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'pending-approval')),
  contract_status TEXT DEFAULT 'pending' CHECK (contract_status IN ('pending', 'sent', 'signed', 'void')),
  payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending', 'scheduled', 'paid', 'disputed')),
  load_in TIME,
  soundcheck TIME,
  doors TIME,
  curfew TIME,
  load_out TIME,
  selected_items TEXT[] DEFAULT '{}',
  green_room_items JSONB DEFAULT '[]'::jsonb,
  bands JSONB DEFAULT '[]'::jsonb,
  special_requests TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shows_venue_id ON shows(venue_id);
CREATE INDEX IF NOT EXISTS idx_shows_date ON shows(date);
CREATE INDEX IF NOT EXISTS idx_shows_status ON shows(status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;

-- Venues: users can only view/edit venues where owner_id = auth.uid()
CREATE POLICY "Users can view own venues"
  ON venues FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own venues"
  ON venues FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own venues"
  ON venues FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own venues"
  ON venues FOR DELETE
  USING (owner_id = auth.uid());

-- Shows: users can only view/edit shows for venues they own
CREATE POLICY "Users can view shows for own venues"
  ON shows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM venues v
      WHERE v.id = shows.venue_id AND v.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert shows for own venues"
  ON shows FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM venues v
      WHERE v.id = shows.venue_id AND v.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update shows for own venues"
  ON shows FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM venues v
      WHERE v.id = shows.venue_id AND v.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM venues v
      WHERE v.id = shows.venue_id AND v.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete shows for own venues"
  ON shows FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM venues v
      WHERE v.id = shows.venue_id AND v.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS venues_updated_at ON venues;
CREATE TRIGGER venues_updated_at
  BEFORE UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS shows_updated_at ON shows;
CREATE TRIGGER shows_updated_at
  BEFORE UPDATE ON shows
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE venues IS 'Performance spaces; owner_id ties to auth.users for multi-tenant Venue app';
COMMENT ON TABLE shows IS 'Events/shows per venue; used by ShowCheck for calendar and payout tracker';
