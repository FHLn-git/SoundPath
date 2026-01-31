-- =============================================================================
-- NULLABLE ORGANIZATION_ID + PERSONAL WORKSPACE FIXES (run once in Supabase SQL Editor)
-- =============================================================================
-- Fixes:
-- 1. "Database error creating new user" — staff_members.organization_id nullable;
--    signup trigger non-fatal; RLS allows trigger to insert.
-- 2. "null value in column organization_id of relation organization_usage" —
--    tracks trigger skips personal tracks (organization_id IS NULL).
-- Required for: Auth Admin createUser (e.g. sandbox seed) and personal-office tracks.
-- =============================================================================

-- 1. Make staff_members.organization_id nullable (new signups have no org yet)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff_members' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.staff_members ALTER COLUMN organization_id DROP NOT NULL;
  END IF;
END $$;

-- 2. RLS: allow signup trigger to insert staff_members when auth.uid() is null (Auth backend)
DROP POLICY IF EXISTS "Allow trigger to create staff on signup" ON public.staff_members;
CREATE POLICY "Allow trigger to create staff on signup" ON public.staff_members
  FOR INSERT
  WITH CHECK (auth.uid() IS NULL);

-- 3. Signup trigger: create staff_members row on new auth user. Non-fatal so user creation always succeeds.
DROP TRIGGER IF EXISTS on_auth_user_created_pro_trial ON auth.users;
CREATE OR REPLACE FUNCTION public.handle_new_auth_user_pro_trial()
RETURNS TRIGGER AS $$
DECLARE
  v_staff_id TEXT;
  v_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM public.staff_members WHERE auth_user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_name := COALESCE(NULLIF((NEW.raw_user_meta_data->>'name')::text, ''), 'User');
  v_staff_id := 'staff_' || substring(NEW.id::text, 1, 8) || '_' || (extract(epoch from now())::bigint)::text;

  INSERT INTO public.staff_members (
    id, name, role, auth_user_id, organization_id,
    tier, user_status, trial_ends_at, subscription_id, paid_tier
  ) VALUES (
    v_staff_id, v_name, 'Scout', NEW.id, NULL,
    'pro', 'trialing', now() + interval '7 days', NULL, NULL
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_auth_user_pro_trial failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created_pro_trial
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user_pro_trial();

-- 4. Tracks count trigger: skip organization_usage for personal tracks (organization_id IS NULL)
CREATE OR REPLACE FUNCTION update_tracks_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.organization_id IS NULL THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
    INSERT INTO organization_usage (organization_id, tracks_count)
    VALUES (NEW.organization_id, 1)
    ON CONFLICT (organization_id) DO UPDATE
    SET tracks_count = organization_usage.tracks_count + 1,
        updated_at = NOW();
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.organization_id IS NULL THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
    UPDATE organization_usage
    SET tracks_count = GREATEST(0, tracks_count - 1),
        updated_at = NOW()
    WHERE organization_id = OLD.organization_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
