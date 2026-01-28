-- Migration: OAuth Connections for Productivity Suite (Google/Microsoft)
-- Stores tokens encrypted at rest (AES-256 handled in Edge Functions).
-- Run this script in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS oauth_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
  account_email TEXT,
  account_name TEXT,
  scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  token_type TEXT,
  encrypted_access_token TEXT NOT NULL,
  encrypted_refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_oauth_connections_org ON oauth_connections(organization_id);
CREATE INDEX IF NOT EXISTS idx_oauth_connections_provider ON oauth_connections(provider);

-- updated_at trigger (reuse if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_oauth_connections_updated_at ON oauth_connections;
    CREATE TRIGGER update_oauth_connections_updated_at
      BEFORE UPDATE ON oauth_connections
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE oauth_connections ENABLE ROW LEVEL SECURITY;

-- Members can view
DROP POLICY IF EXISTS "Members can view oauth connections" ON oauth_connections;
CREATE POLICY "Members can view oauth connections" ON oauth_connections
  FOR SELECT
  USING (organization_id = ANY(get_user_organization_ids()));

-- Owners/Managers can manage
DROP POLICY IF EXISTS "Owners and Managers can manage oauth connections" ON oauth_connections;
CREATE POLICY "Owners and Managers can manage oauth connections" ON oauth_connections
  FOR ALL
  USING (
    organization_id = ANY(get_user_organization_ids())
    AND EXISTS (
      SELECT 1
      FROM memberships m
      JOIN staff_members sm ON sm.id = m.user_id
      WHERE sm.auth_user_id = auth.uid()
        AND m.organization_id = oauth_connections.organization_id
        AND m.active = true
        AND m.role IN ('Owner', 'Manager')
    )
  )
  WITH CHECK (
    organization_id = ANY(get_user_organization_ids())
    AND EXISTS (
      SELECT 1
      FROM memberships m
      JOIN staff_members sm ON sm.id = m.user_id
      WHERE sm.auth_user_id = auth.uid()
        AND m.organization_id = oauth_connections.organization_id
        AND m.active = true
        AND m.role IN ('Owner', 'Manager')
    )
  );

