-- Migration: Website ingest domain allowlisting for submission widget
-- Adds organizations.allowed_domains and tightens public org SELECT exposure
-- Run this script in Supabase SQL Editor

-- ============================================================================
-- 1. Add allowed_domains column to organizations
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'organizations' AND column_name = 'allowed_domains'
    ) THEN
      ALTER TABLE organizations
        ADD COLUMN allowed_domains TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
      COMMENT ON COLUMN organizations.allowed_domains IS 'List of allowed embed/ingest domains (hostnames). Used to validate widget ingest Origin/Referer.';
    END IF;
  END IF;
END $$;

-- Optional helper index (useful if querying by contains)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'allowed_domains') THEN
    CREATE INDEX IF NOT EXISTS idx_organizations_allowed_domains_gin
      ON organizations
      USING GIN (allowed_domains);
  END IF;
END $$;

-- ============================================================================
-- 2. Tighten public access to organizations
-- ============================================================================
-- NOTE: Public branding lookups should go through SECURITY DEFINER RPCs
-- like get_organization_by_slug(), which returns minimal fields.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organizations'
      AND policyname = 'Public can view organization by slug'
  ) THEN
    EXECUTE 'DROP POLICY "Public can view organization by slug" ON organizations';
  END IF;
END $$;

