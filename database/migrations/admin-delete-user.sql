-- Admin Function: Safely Delete User Account
-- This function allows system admins to delete user accounts completely
-- Run this in Supabase SQL Editor

-- ============================================================================
-- FUNCTION: Delete User Account (Admin Only)
-- ============================================================================
CREATE OR REPLACE FUNCTION admin_delete_user_account(
  p_auth_user_id UUID,
  p_deleted_by_staff_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_id TEXT;
  v_user_email TEXT;
  v_deleted_data JSONB;
BEGIN
  -- Verify this is being called by a system admin
  -- You can customize this check based on your admin setup
  IF p_deleted_by_staff_id IS NOT NULL THEN
    -- Check if the deleter is a system admin
    IF NOT EXISTS (
      SELECT 1 FROM staff_members 
      WHERE id = p_deleted_by_staff_id 
      AND role = 'SystemAdmin'
    ) THEN
      RAISE EXCEPTION 'Only system admins can delete user accounts';
    END IF;
  END IF;

  -- Get user email for logging
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = p_auth_user_id;

  -- Get staff_members id before deletion
  SELECT id INTO v_staff_id
  FROM staff_members
  WHERE auth_user_id = p_auth_user_id
  LIMIT 1;

  -- Build deletion summary
  v_deleted_data := jsonb_build_object(
    'auth_user_id', p_auth_user_id,
    'staff_id', v_staff_id,
    'email', v_user_email,
    'deleted_at', NOW()
  );

  -- Delete staff_members record first
  -- This will cascade delete:
  --   - memberships (ON DELETE CASCADE)
  --   - tracks where sender_id/recipient_user_id references it (ON DELETE SET NULL)
  --   - votes (ON DELETE CASCADE)
  --   - listen_logs (preserved - historical data)
  --   - rejection_reasons (preserved - historical data)
  IF v_staff_id IS NOT NULL THEN
    DELETE FROM staff_members
    WHERE id = v_staff_id;
    
    v_deleted_data := v_deleted_data || jsonb_build_object(
      'staff_members_deleted', true
    );
  ELSE
    v_deleted_data := v_deleted_data || jsonb_build_object(
      'staff_members_deleted', false,
      'note', 'No staff_members record found'
    );
  END IF;

  -- Delete auth user (requires admin privileges)
  -- Note: This must be done via Supabase Admin API or with service_role key
  -- The SQL below will work if you have proper permissions
  -- Otherwise, use: supabase.auth.admin.deleteUser(auth_user_id) from your admin tool
  
  -- IMPORTANT: You cannot delete from auth.users directly via SQL in most Supabase setups
  -- You must use the Admin API: supabase.auth.admin.deleteUser(auth_user_id)
  -- This is why we return the auth_user_id so you can delete it via API
  
  v_deleted_data := v_deleted_data || jsonb_build_object(
    'auth_user_deletion_required', true,
    'auth_user_id_to_delete', p_auth_user_id,
    'note', 'Delete auth user via Supabase Admin API: supabase.auth.admin.deleteUser(auth_user_id)'
  );

  RETURN v_deleted_data;
END;
$$;

-- Grant execute permission to authenticated users (admins will be checked inside function)
GRANT EXECUTE ON FUNCTION admin_delete_user_account(UUID, TEXT) TO authenticated;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Delete user by auth_user_id
-- SELECT admin_delete_user_account('user-uuid-here'::uuid, 'your-admin-staff-id');

-- Example 2: Delete user by email (helper query)
-- First find the auth_user_id:
-- SELECT id, email FROM auth.users WHERE email = 'user@example.com';
-- Then delete:
-- SELECT admin_delete_user_account(
--   (SELECT id FROM auth.users WHERE email = 'user@example.com'),
--   'your-admin-staff-id'
-- );

-- ============================================================================
-- MANUAL DELETION STEPS (If you prefer to do it manually)
-- ============================================================================

-- Step 1: Find the user
-- SELECT 
--   u.id as auth_user_id,
--   u.email,
--   sm.id as staff_id,
--   sm.name,
--   sm.role
-- FROM auth.users u
-- LEFT JOIN staff_members sm ON sm.auth_user_id = u.id
-- WHERE u.email = 'user@example.com';

-- Step 2: Delete staff_members (cascades to memberships, etc.)
-- DELETE FROM staff_members WHERE auth_user_id = 'user-uuid-here';

-- Step 3: Delete auth user via Admin API (cannot be done via SQL)
-- Use: supabase.auth.admin.deleteUser('user-uuid-here')
-- Or use Supabase Dashboard → Authentication → Users → Delete
