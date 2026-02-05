-- ============================================================================
-- Venues: structured address fields for reporting (Global Pulse, etc.)
-- Run after venues-and-shows-schema.sql. Safe to run on existing DB.
-- ============================================================================

-- Add structured address columns (keep address for backward compatibility / display line)
ALTER TABLE venues ADD COLUMN IF NOT EXISTS address_street_1 TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS address_street_2 TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS address_state_region TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS address_postal_code TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS address_country TEXT;

-- Indexes for Global Pulse / reporting (filter by location)
CREATE INDEX IF NOT EXISTS idx_venues_address_country ON venues(address_country);
CREATE INDEX IF NOT EXISTS idx_venues_address_state_region ON venues(address_state_region);
CREATE INDEX IF NOT EXISTS idx_venues_address_city ON venues(address_city);

COMMENT ON COLUMN venues.address_street_1 IS 'Street address line 1';
COMMENT ON COLUMN venues.address_street_2 IS 'Street address line 2 (optional)';
COMMENT ON COLUMN venues.address_city IS 'City';
COMMENT ON COLUMN venues.address_state_region IS 'State / province / region';
COMMENT ON COLUMN venues.address_postal_code IS 'ZIP / postal code';
COMMENT ON COLUMN venues.address_country IS 'Country (ISO or full name)';
