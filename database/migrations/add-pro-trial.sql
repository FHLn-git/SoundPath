-- ============================================================================
-- 7-Day Pro Trial for New Registrations (Personal tier)
-- ============================================================================
-- Goals:
-- - On new auth.users signup: initialize personal tier as Pro trial
--   - staff_members.tier = 'pro'
--   - staff_members.user_status = 'trialing'
--   - staff_members.trial_ends_at = now() + 7 days
-- - Provide an RPC to enforce expiry (downgrade to free if no subscription)
-- - Store paid tier separately during trial (paid_tier) so trial stays "pro"
--
-- Notes:
-- - This project uses `public.staff_members` as the user profile table for personal tier.
-- - "Active subscription" for personal tier is determined by `staff_members.subscription_id` (Stripe subscription id).
-- ============================================================================

-- 1) Add trial columns to staff_members (safe to run multiple times)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_members') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'staff_members' AND column_name = 'user_status'
    ) THEN
      ALTER TABLE public.staff_members
        ADD COLUMN user_status TEXT DEFAULT 'active'
        CHECK (user_status IN ('trialing', 'active', 'free'));
      COMMENT ON COLUMN public.staff_members.user_status IS 'Personal account status: trialing, active, free';
      UPDATE public.staff_members SET user_status = 'active' WHERE user_status IS NULL;
      CREATE INDEX IF NOT EXISTS idx_staff_members_user_status ON public.staff_members(user_status);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'staff_members' AND column_name = 'trial_ends_at'
    ) THEN
      ALTER TABLE public.staff_members ADD COLUMN trial_ends_at TIMESTAMPTZ;
      COMMENT ON COLUMN public.staff_members.trial_ends_at IS 'When the personal Pro trial ends (UTC)';
      CREATE INDEX IF NOT EXISTS idx_staff_members_trial_ends_at ON public.staff_members(trial_ends_at);
    END IF;

    -- During trial, tier stays 'pro'. Store the purchased plan (agent/starter/pro) separately.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'staff_members' AND column_name = 'paid_tier'
    ) THEN
      ALTER TABLE public.staff_members
        ADD COLUMN paid_tier TEXT
        CHECK (paid_tier IS NULL OR paid_tier IN ('agent', 'starter', 'pro'));
      COMMENT ON COLUMN public.staff_members.paid_tier IS 'Paid tier selected via Stripe (applied when trial ends)';
      CREATE INDEX IF NOT EXISTS idx_staff_members_paid_tier ON public.staff_members(paid_tier);
    END IF;
  END IF;
END $$;

-- 2) Trigger: initialize Pro trial on auth.users insert
-- Creates a staff_members row if one does not already exist for the auth user.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user_pro_trial()
RETURNS TRIGGER AS $$
DECLARE
  v_staff_id TEXT;
  v_name TEXT;
BEGIN
  -- If staff profile already exists, don't overwrite it.
  IF EXISTS (SELECT 1 FROM public.staff_members WHERE auth_user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_name := COALESCE(NULLIF((NEW.raw_user_meta_data->>'name')::text, ''), 'User');
  v_staff_id := 'staff_' || substring(NEW.id::text, 1, 8) || '_' || (extract(epoch from now())::bigint)::text;

  INSERT INTO public.staff_members (
    id,
    name,
    role,
    auth_user_id,
    tier,
    user_status,
    trial_ends_at,
    subscription_id,
    paid_tier
  ) VALUES (
    v_staff_id,
    v_name,
    'Scout',
    NEW.id,
    'pro',
    'trialing',
    now() + interval '7 days',
    NULL,
    NULL
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists (safe re-create)
DROP TRIGGER IF EXISTS on_auth_user_created_pro_trial ON auth.users;
CREATE TRIGGER on_auth_user_created_pro_trial
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user_pro_trial();

-- 3) RPC: enforce trial expiry / apply paid tier when trial ends
CREATE OR REPLACE FUNCTION public.enforce_personal_trial_status()
RETURNS JSONB AS $$
DECLARE
  v_staff public.staff_members%ROWTYPE;
  v_now TIMESTAMPTZ := now();
  v_has_sub BOOLEAN := false;
  v_downgraded BOOLEAN := false;
  v_activated BOOLEAN := false;
  v_target_tier TEXT := NULL;
BEGIN
  SELECT * INTO v_staff
  FROM public.staff_members
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_staff.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'staff_profile_missing');
  END IF;

  v_has_sub := NULLIF(v_staff.subscription_id, '') IS NOT NULL;

  -- If trial is active, do nothing.
  IF v_staff.user_status = 'trialing'
     AND v_staff.trial_ends_at IS NOT NULL
     AND v_now <= v_staff.trial_ends_at THEN
    RETURN jsonb_build_object(
      'ok', true,
      'status', v_staff.user_status,
      'tier', v_staff.tier,
      'trial_ends_at', v_staff.trial_ends_at,
      'has_active_subscription', v_has_sub,
      'downgraded', false,
      'activated', false
    );
  END IF;

  -- Trial expired: if they have a subscription, activate the paid tier; otherwise downgrade to free.
  IF v_staff.user_status = 'trialing'
     AND v_staff.trial_ends_at IS NOT NULL
     AND v_now > v_staff.trial_ends_at THEN
    IF v_has_sub THEN
      v_target_tier := COALESCE(NULLIF(v_staff.paid_tier, ''), 'pro');
      UPDATE public.staff_members
      SET
        tier = v_target_tier,
        user_status = 'active',
        trial_ends_at = NULL
      WHERE id = v_staff.id;
      v_activated := true;
    ELSE
      UPDATE public.staff_members
      SET
        tier = 'free',
        user_status = 'free'
      WHERE id = v_staff.id;
      v_downgraded := true;
    END IF;
  END IF;

  -- Return fresh values
  SELECT * INTO v_staff
  FROM public.staff_members
  WHERE id = v_staff.id;

  RETURN jsonb_build_object(
    'ok', true,
    'status', v_staff.user_status,
    'tier', v_staff.tier,
    'trial_ends_at', v_staff.trial_ends_at,
    'has_active_subscription', (NULLIF(v_staff.subscription_id, '') IS NOT NULL),
    'downgraded', v_downgraded,
    'activated', v_activated
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.enforce_personal_trial_status() TO authenticated;

