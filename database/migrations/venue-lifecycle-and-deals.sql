-- ============================================================================
-- Venue Lifecycle & Deals (Phase 0 – Data Model Foundation)
-- Run after: venues-and-shows-schema.sql, venue-corporate-hierarchy.sql
-- ============================================================================
-- Adds: show lifecycle (hold, on_sale, completed, etc.), offers, offer
-- templates, inbound submissions, settlement/financial columns on shows.
-- ============================================================================

-- ============================================================================
-- 1. OFFERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES stages(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  artist_name TEXT NOT NULL,
  proposed_date DATE NOT NULL,
  deal_structure TEXT,
  line_items JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired')),
  show_id UUID,
  sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offers_venue_id ON offers(venue_id);
CREATE INDEX IF NOT EXISTS idx_offers_stage_id ON offers(stage_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_proposed_date ON offers(proposed_date);
CREATE INDEX IF NOT EXISTS idx_offers_show_id ON offers(show_id);

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Offers: same access as shows (venue owner + venue_manager + group_admin)
CREATE POLICY "Users can view offers for own venues"
  ON offers FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = offers.venue_id AND v.owner_id = auth.uid())
  );
CREATE POLICY "Venue managers can view offers for their venue"
  ON offers FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = offers.venue_id AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid()))
  );
CREATE POLICY "Group admins can view offers for their group venues"
  ON offers FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = offers.venue_id AND v.group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = v.group_id AND vr.user_id = auth.uid()))
  );

CREATE POLICY "Users can insert offers for own venues"
  ON offers FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM venues v WHERE v.id = offers.venue_id AND v.owner_id = auth.uid()));
CREATE POLICY "Venue managers can insert offers"
  ON offers FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = offers.venue_id AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid() AND vr.role = 'venue_manager'))
  );
CREATE POLICY "Group admins can insert offers"
  ON offers FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = offers.venue_id AND v.group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = v.group_id AND vr.user_id = auth.uid() AND vr.role = 'group_admin'))
  );

CREATE POLICY "Users can update offers for own venues"
  ON offers FOR UPDATE
  USING (EXISTS (SELECT 1 FROM venues v WHERE v.id = offers.venue_id AND v.owner_id = auth.uid()));
CREATE POLICY "Venue managers can update offers"
  ON offers FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = offers.venue_id AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid() AND vr.role = 'venue_manager'))
  );
CREATE POLICY "Group admins can update offers"
  ON offers FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = offers.venue_id AND v.group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = v.group_id AND vr.user_id = auth.uid() AND vr.role = 'group_admin'))
  );

CREATE POLICY "Users can delete offers for own venues"
  ON offers FOR DELETE
  USING (EXISTS (SELECT 1 FROM venues v WHERE v.id = offers.venue_id AND v.owner_id = auth.uid()));
CREATE POLICY "Venue managers can delete offers"
  ON offers FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = offers.venue_id AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid() AND vr.role = 'venue_manager'))
  );
CREATE POLICY "Group admins can delete offers"
  ON offers FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = offers.venue_id AND v.group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = v.group_id AND vr.user_id = auth.uid() AND vr.role = 'group_admin'))
  );

DROP TRIGGER IF EXISTS offers_updated_at ON offers;
CREATE TRIGGER offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE offers IS 'Booking offers; link to show on accept (show_id set when accepted)';

-- ============================================================================
-- 2. OFFER_TEMPLATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS offer_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  venue_group_id UUID REFERENCES venue_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  deal_structure TEXT,
  line_items_template JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT offer_templates_venue_or_group CHECK (
    (venue_id IS NOT NULL AND venue_group_id IS NULL) OR (venue_id IS NULL AND venue_group_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_offer_templates_venue_id ON offer_templates(venue_id);
CREATE INDEX IF NOT EXISTS idx_offer_templates_venue_group_id ON offer_templates(venue_group_id);

ALTER TABLE offer_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view offer_templates for own venues or groups"
  ON offer_templates FOR SELECT
  USING (
    (venue_id IS NOT NULL AND EXISTS (SELECT 1 FROM venues v WHERE v.id = offer_templates.venue_id AND v.owner_id = auth.uid()))
    OR (venue_group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_groups vg WHERE vg.id = offer_templates.venue_group_id AND vg.owner_id = auth.uid()))
    OR (venue_id IS NOT NULL AND EXISTS (SELECT 1 FROM venues v WHERE v.id = offer_templates.venue_id AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid())))
    OR (venue_group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = offer_templates.venue_group_id AND vr.user_id = auth.uid()))
  );
CREATE POLICY "Users can manage offer_templates for own venues or groups"
  ON offer_templates FOR ALL
  USING (
    (venue_id IS NOT NULL AND EXISTS (SELECT 1 FROM venues v WHERE v.id = offer_templates.venue_id AND v.owner_id = auth.uid()))
    OR (venue_group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_groups vg WHERE vg.id = offer_templates.venue_group_id AND vg.owner_id = auth.uid()))
  )
  WITH CHECK (
    (venue_id IS NOT NULL AND EXISTS (SELECT 1 FROM venues v WHERE v.id = offer_templates.venue_id AND v.owner_id = auth.uid()))
    OR (venue_group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_groups vg WHERE vg.id = offer_templates.venue_group_id AND vg.owner_id = auth.uid()))
  );

DROP TRIGGER IF EXISTS offer_templates_updated_at ON offer_templates;
CREATE TRIGGER offer_templates_updated_at
  BEFORE UPDATE ON offer_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE offer_templates IS 'Templates for offers (deal structure, line items) per venue or group';

-- ============================================================================
-- 3. INBOUND_SUBMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inbound_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  group_id UUID REFERENCES venue_groups(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  artist_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  requested_dates JSONB DEFAULT '[]'::jsonb,
  message TEXT,
  source TEXT DEFAULT 'form',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'converted', 'rejected')),
  tags TEXT[] DEFAULT '{}',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT inbound_submissions_venue_or_group CHECK (
    (venue_id IS NOT NULL AND group_id IS NULL) OR (venue_id IS NULL AND group_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_inbound_submissions_venue_id ON inbound_submissions(venue_id);
CREATE INDEX IF NOT EXISTS idx_inbound_submissions_group_id ON inbound_submissions(group_id);
CREATE INDEX IF NOT EXISTS idx_inbound_submissions_status ON inbound_submissions(status);
CREATE INDEX IF NOT EXISTS idx_inbound_submissions_submitted_at ON inbound_submissions(submitted_at);

ALTER TABLE inbound_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inbound for own venues or groups"
  ON inbound_submissions FOR SELECT
  USING (
    (venue_id IS NOT NULL AND EXISTS (SELECT 1 FROM venues v WHERE v.id = inbound_submissions.venue_id AND v.owner_id = auth.uid()))
    OR (group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_groups vg WHERE vg.id = inbound_submissions.group_id AND vg.owner_id = auth.uid()))
    OR (venue_id IS NOT NULL AND EXISTS (SELECT 1 FROM venues v WHERE v.id = inbound_submissions.venue_id AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid())))
    OR (group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = inbound_submissions.group_id AND vr.user_id = auth.uid()))
  );
CREATE POLICY "Users can insert inbound for own venues or groups"
  ON inbound_submissions FOR INSERT
  WITH CHECK (
    (venue_id IS NOT NULL AND EXISTS (SELECT 1 FROM venues v WHERE v.id = inbound_submissions.venue_id AND v.owner_id = auth.uid()))
    OR (group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_groups vg WHERE vg.id = inbound_submissions.group_id AND vg.owner_id = auth.uid()))
  );
-- Allow public insert for form submissions (anon can submit to a venue/group by slug or token; for now restrict to authenticated or add separate policy later)
-- For Phase 0 we require authenticated; Phase 2 can add a policy for anon insert when form is public.
CREATE POLICY "Venue managers and group admins can update inbound"
  ON inbound_submissions FOR UPDATE
  USING (
    (venue_id IS NOT NULL AND EXISTS (SELECT 1 FROM venues v WHERE v.id = inbound_submissions.venue_id AND (v.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid()))))
    OR (group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_groups vg WHERE vg.id = inbound_submissions.group_id AND (vg.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = vg.id AND vr.user_id = auth.uid()))))
  );
CREATE POLICY "Users can delete inbound for own venues or groups"
  ON inbound_submissions FOR DELETE
  USING (
    (venue_id IS NOT NULL AND EXISTS (SELECT 1 FROM venues v WHERE v.id = inbound_submissions.venue_id AND v.owner_id = auth.uid()))
    OR (group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_groups vg WHERE vg.id = inbound_submissions.group_id AND vg.owner_id = auth.uid()))
  );

DROP TRIGGER IF EXISTS inbound_submissions_updated_at ON inbound_submissions;
CREATE TRIGGER inbound_submissions_updated_at
  BEFORE UPDATE ON inbound_submissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE inbound_submissions IS 'Inbound booking requests (form/link); tag, filter, convert to hold/offer';

-- ============================================================================
-- 4. SHOWS: add offer_id (FK to offers), extend status, hold fields, settlement
-- ============================================================================
DO $$
BEGIN
  -- Extend status enum: add hold, on_sale, cancelled, completed (keep draft, confirmed, pending-approval)
  ALTER TABLE shows DROP CONSTRAINT IF EXISTS shows_status_check;
  ALTER TABLE shows ADD CONSTRAINT shows_status_check CHECK (status IN (
    'draft', 'hold', 'confirmed', 'pending-approval', 'on_sale', 'cancelled', 'completed'
  ));

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shows' AND column_name = 'hold_rank') THEN
    ALTER TABLE shows ADD COLUMN hold_rank INTEGER;
    COMMENT ON COLUMN shows.hold_rank IS 'Rank for ranked holds; lower = higher priority; used with hold_auto_promote';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shows' AND column_name = 'hold_auto_promote') THEN
    ALTER TABLE shows ADD COLUMN hold_auto_promote BOOLEAN DEFAULT false;
    COMMENT ON COLUMN shows.hold_auto_promote IS 'When true, removing this hold can auto-promote next hold by rank';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shows' AND column_name = 'offer_id') THEN
    ALTER TABLE shows ADD COLUMN offer_id UUID REFERENCES offers(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_shows_offer_id ON shows(offer_id);
    COMMENT ON COLUMN shows.offer_id IS 'Set when show created from accepted offer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shows' AND column_name = 'guarantee') THEN
    ALTER TABLE shows ADD COLUMN guarantee NUMERIC(12,2);
    COMMENT ON COLUMN shows.guarantee IS 'Artist guarantee amount for settlement';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shows' AND column_name = 'door_split_pct') THEN
    ALTER TABLE shows ADD COLUMN door_split_pct NUMERIC(5,2);
    COMMENT ON COLUMN shows.door_split_pct IS 'Artist share of door (e.g. 80 = 80% to artist)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shows' AND column_name = 'ticket_sales_count') THEN
    ALTER TABLE shows ADD COLUMN ticket_sales_count INTEGER;
    COMMENT ON COLUMN shows.ticket_sales_count IS 'Actual ticket count for settlement';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shows' AND column_name = 'ticket_revenue') THEN
    ALTER TABLE shows ADD COLUMN ticket_revenue NUMERIC(12,2);
    COMMENT ON COLUMN shows.ticket_revenue IS 'Actual ticket revenue for settlement';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shows' AND column_name = 'expenses') THEN
    ALTER TABLE shows ADD COLUMN expenses JSONB DEFAULT '[]'::jsonb;
    COMMENT ON COLUMN shows.expenses IS 'Line-item expenses for settlement';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shows' AND column_name = 'settlement_notes') THEN
    ALTER TABLE shows ADD COLUMN settlement_notes TEXT;
    COMMENT ON COLUMN shows.settlement_notes IS 'Notes when finalizing settlement';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shows' AND column_name = 'settlement_finalized_at') THEN
    ALTER TABLE shows ADD COLUMN settlement_finalized_at TIMESTAMPTZ;
    COMMENT ON COLUMN shows.settlement_finalized_at IS 'When settlement was finalized';
  END IF;
END $$;

-- Backfill: existing shows keep current status (draft/confirmed/pending-approval); no change needed.

-- Add FK from offers.show_id to shows (optional; allows bidirectional link)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'offers_show_id_fkey') THEN
    ALTER TABLE offers ADD CONSTRAINT offers_show_id_fkey FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_shows_venue_date_status ON shows(venue_id, date, status);
CREATE INDEX IF NOT EXISTS idx_shows_stage_date ON shows(stage_id, date) WHERE stage_id IS NOT NULL;

-- ============================================================================
-- 5. VENUE_ASSETS (optional Phase 0 – central storage for riders, contracts, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS venue_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  show_id UUID REFERENCES shows(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('rider', 'contract', 'poster', 'flyer', 'other')),
  storage_path TEXT,
  url TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venue_assets_venue_id ON venue_assets(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_assets_show_id ON venue_assets(show_id);
CREATE INDEX IF NOT EXISTS idx_venue_assets_type ON venue_assets(type);

ALTER TABLE venue_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view venue_assets for own venues"
  ON venue_assets FOR SELECT
  USING (EXISTS (SELECT 1 FROM venues v WHERE v.id = venue_assets.venue_id AND v.owner_id = auth.uid()));
CREATE POLICY "Venue managers and group admins can view venue_assets"
  ON venue_assets FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = venue_assets.venue_id AND (EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid()) OR (v.group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = v.group_id AND vr.user_id = auth.uid()))))
  );
CREATE POLICY "Users can manage venue_assets for own venues"
  ON venue_assets FOR ALL
  USING (EXISTS (SELECT 1 FROM venues v WHERE v.id = venue_assets.venue_id AND v.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM venues v WHERE v.id = venue_assets.venue_id AND v.owner_id = auth.uid()));
CREATE POLICY "Venue managers and group admins can manage venue_assets"
  ON venue_assets FOR ALL
  USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = venue_assets.venue_id AND (EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid() AND vr.role = 'venue_manager') OR (v.group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = v.group_id AND vr.user_id = auth.uid() AND vr.role = 'group_admin'))))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = venue_assets.venue_id AND (EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'venue' AND vr.entity_id = v.id AND vr.user_id = auth.uid()) OR (v.group_id IS NOT NULL AND EXISTS (SELECT 1 FROM venue_roles vr WHERE vr.entity_type = 'group' AND vr.entity_id = v.group_id AND vr.user_id = auth.uid()))))
  );

COMMENT ON TABLE venue_assets IS 'Riders, contracts, posters, flyers per venue/show; role-based access';
