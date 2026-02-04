-- Migration: global_roles on staff_members (Music Industry OS)
-- A user can hold multiple global roles across apps: e.g. label_manager + venue_owner.
-- Run in Supabase SQL Editor.

-- Add global_roles to staff_members (profile-level; supports Label, Venue, Artist apps)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_members') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_members' AND column_name = 'global_roles') THEN
      ALTER TABLE public.staff_members
        ADD COLUMN global_roles TEXT[] DEFAULT ARRAY['label_manager']::TEXT[];
      COMMENT ON COLUMN public.staff_members.global_roles IS 'OS-level roles: label_manager, venue_owner, artist, etc. A user can have multiple (e.g. label + venue).';
    END IF;
  END IF;
END $$;

-- Optional: index for role-based filtering (e.g. "all venue_owners")
CREATE INDEX IF NOT EXISTS idx_staff_members_global_roles
  ON public.staff_members USING GIN (global_roles)
  WHERE global_roles IS NOT NULL AND array_length(global_roles, 1) > 0;
