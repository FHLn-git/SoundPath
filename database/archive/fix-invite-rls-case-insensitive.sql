-- ============================================================================
-- Fix Invite RLS Policy to be Case-Insensitive
-- ============================================================================
-- Problem: RLS policy compares emails case-sensitively, but invites are stored
-- with lowercase emails while auth.users might have mixed case emails.
--
-- Solution: Update RLS policy to use case-insensitive comparison
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view their invites" ON invites;

-- Create case-insensitive policy
CREATE POLICY "Users can view their invites" ON invites
  FOR SELECT
  USING (
    LOWER(TRIM(email)) = LOWER(TRIM((SELECT email FROM auth.users WHERE id = auth.uid())))
  );

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'invites'
  AND policyname = 'Users can view their invites';
