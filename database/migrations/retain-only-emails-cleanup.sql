-- ============================================================================
-- Retain Data for Specific Emails Only (Delete Everything Else)
-- ============================================================================
-- Use this to remove all test/other user data and keep only data associated
-- with up to three specific emails (e.g. you + two friends).
--
-- WHAT IS KEPT (everything tied to those emails and their orgs):
-- - All demos (tracks) in keeper organizations, including artist, votes,
--   listen_logs, status/column, sc_link, energy, notes, etc.
-- - All artists, memberships, invites, subscriptions, api_keys, webhooks,
--   audit_logs, calendar_jobs, oauth_connections, notification prefs, etc.
-- - Staff records and auth users for the keeper emails only.
--
-- BEFORE RUNNING:
-- 1. Replace the three email placeholders below with your keeper emails.
-- 2. Back up your database (Supabase Dashboard → Database → Backups).
-- 3. Run in Supabase SQL Editor as the postgres role.
--
-- AFTER RUNNING (if auth delete fails):
-- If the script cannot delete from auth.users (permission denied), remove the
-- other accounts via Supabase Dashboard → Authentication → Users → Delete,
-- or Admin API: supabase.auth.admin.deleteUser(auth_user_id)
-- ============================================================================

DO $$
DECLARE
  keeper_emails TEXT[] := ARRAY[
    'ethanberdofe@icloud.com',   -- replace with first email
    'keeper2@example.com',       -- replace with second email
    'keeper3@example.com'        -- replace with third email
  ];
  keeper_auth_ids UUID[];
  keeper_staff_ids TEXT[];
  keeper_org_ids UUID[];
BEGIN
  -- Resolve keeper auth user ids from emails
  SELECT ARRAY_AGG(id) INTO keeper_auth_ids
  FROM auth.users
  WHERE LOWER(email) = ANY(SELECT LOWER(unnest) FROM unnest(keeper_emails));

  IF keeper_auth_ids IS NULL OR array_length(keeper_auth_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'No auth.users found for the given keeper emails. Check the email list.';
  END IF;

  -- Resolve keeper staff_members ids (required: keeper emails must have completed signup)
  SELECT COALESCE(ARRAY_AGG(id), ARRAY[]::TEXT[]) INTO keeper_staff_ids
  FROM staff_members
  WHERE auth_user_id = ANY(keeper_auth_ids);

  -- Resolve keeper organization ids (orgs that have at least one keeper user)
  SELECT ARRAY_AGG(DISTINCT org_id) INTO keeper_org_ids
  FROM (
    SELECT organization_id AS org_id FROM staff_members WHERE auth_user_id = ANY(keeper_auth_ids)
    UNION
    SELECT organization_id AS org_id FROM memberships WHERE user_id = ANY(COALESCE(keeper_staff_ids, ARRAY[]::TEXT[]))
  ) sub
  WHERE org_id IS NOT NULL;

  IF keeper_org_ids IS NULL OR array_length(keeper_org_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'No organizations found for keeper users. Ensure the keeper emails have completed signup and have staff_members.';
  END IF;

  -- -------------------------------------------------------------------------
  -- 1. Delete child rows by organization (data in non-keeper orgs)
  -- -------------------------------------------------------------------------
  DELETE FROM listen_logs   WHERE organization_id <> ALL(keeper_org_ids);
  DELETE FROM votes         WHERE organization_id <> ALL(keeper_org_ids);
  DELETE FROM tracks        WHERE organization_id <> ALL(keeper_org_ids);
  DELETE FROM artists       WHERE organization_id <> ALL(keeper_org_ids);
  DELETE FROM invites       WHERE organization_id <> ALL(keeper_org_ids);

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'denials') THEN
    DELETE FROM denials WHERE organization_id <> ALL(keeper_org_ids);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
    DELETE FROM subscriptions WHERE organization_id <> ALL(keeper_org_ids);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_methods') THEN
    DELETE FROM payment_methods WHERE organization_id <> ALL(keeper_org_ids);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    DELETE FROM invoices WHERE organization_id <> ALL(keeper_org_ids);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_usage') THEN
    DELETE FROM organization_usage WHERE organization_id <> ALL(keeper_org_ids);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'api_keys') THEN
    DELETE FROM api_keys WHERE organization_id <> ALL(keeper_org_ids);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'webhooks') THEN
    DELETE FROM webhooks WHERE organization_id <> ALL(keeper_org_ids);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
    DELETE FROM audit_logs WHERE organization_id <> ALL(keeper_org_ids);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calendar_jobs') THEN
    DELETE FROM calendar_jobs WHERE organization_id <> ALL(keeper_org_ids);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'oauth_connections') THEN
    DELETE FROM oauth_connections WHERE organization_id <> ALL(keeper_org_ids);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_notification_preferences') THEN
    DELETE FROM organization_notification_preferences WHERE organization_id <> ALL(keeper_org_ids);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'communication_webhooks') THEN
    DELETE FROM communication_webhooks WHERE organization_id <> ALL(keeper_org_ids);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'error_logs') THEN
    DELETE FROM error_logs WHERE organization_id <> ALL(keeper_org_ids);
  END IF;

  -- -------------------------------------------------------------------------
  -- 2. Remove rows in keeper orgs that belong to non-keeper staff
  -- -------------------------------------------------------------------------
  IF array_length(keeper_staff_ids, 1) > 0 THEN
    DELETE FROM listen_logs WHERE staff_id <> ALL(keeper_staff_ids);
    DELETE FROM votes     WHERE staff_id <> ALL(keeper_staff_ids);
    DELETE FROM memberships WHERE user_id <> ALL(keeper_staff_ids);

    -- Null out invites.invited_by for non-keepers so we can delete staff_members
    UPDATE invites SET invited_by = NULL WHERE invited_by IS NOT NULL AND invited_by <> ALL(keeper_staff_ids);

    -- Optional tables that reference staff_members
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'connections') THEN
      DELETE FROM connections WHERE requester_id <> ALL(keeper_staff_ids) OR recipient_id <> ALL(keeper_staff_ids);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contact_form_submissions') THEN
      DELETE FROM contact_form_submissions WHERE staff_member_id IS NOT NULL AND staff_member_id <> ALL(keeper_staff_ids);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'error_logs') THEN
      UPDATE error_logs SET staff_member_id = NULL, user_id = NULL WHERE staff_member_id IS NOT NULL AND staff_member_id <> ALL(keeper_staff_ids);
    END IF;
  END IF;

  -- -------------------------------------------------------------------------
  -- 3. Delete non-keeper staff_members (cascades to memberships etc.)
  -- -------------------------------------------------------------------------
  DELETE FROM staff_members WHERE auth_user_id <> ALL(keeper_auth_ids);

  -- -------------------------------------------------------------------------
  -- 4. Delete organizations that are not keeper orgs
  -- -------------------------------------------------------------------------
  DELETE FROM organizations WHERE id <> ALL(keeper_org_ids);

  -- -------------------------------------------------------------------------
  -- 5. Optional: auth-scoped tables (remove data for deleted auth users)
  -- -------------------------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'push_subscriptions') THEN
    DELETE FROM push_subscriptions WHERE auth_user_id <> ALL(keeper_auth_ids);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'push_notification_jobs') THEN
    DELETE FROM push_notification_jobs WHERE auth_user_id <> ALL(keeper_auth_ids);
  END IF;

  -- -------------------------------------------------------------------------
  -- 6. Delete other auth accounts (keeper email only remains)
  -- -------------------------------------------------------------------------
  BEGIN
    -- auth.identities references auth.users; delete first if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'identities') THEN
      DELETE FROM auth.identities WHERE user_id <> ALL(keeper_auth_ids);
    END IF;
    DELETE FROM auth.users WHERE id <> ALL(keeper_auth_ids);
    RAISE NOTICE 'Auth accounts deleted. Only the keeper emails remain in Authentication.';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not delete from auth.users (%). Delete other users manually: Dashboard → Authentication → Users.', SQLERRM;
  END;

  RAISE NOTICE 'Cleanup done. Kept data for % auth users and % organizations.', array_length(keeper_auth_ids, 1), array_length(keeper_org_ids, 1);
END;
$$;
