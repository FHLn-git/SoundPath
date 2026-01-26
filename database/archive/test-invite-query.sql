-- ============================================================================
-- Test Invite Query - Run this as the user to see what they can see
-- ============================================================================
-- This simulates what the Launchpad query does
-- Replace 'USER_EMAIL_HERE' with the actual email address

-- First, check what email the current user has
SELECT 
  id,
  email,
  LOWER(TRIM(email)) as email_normalized
FROM auth.users
WHERE id = auth.uid();

-- Then check what invites exist for that email (case-insensitive)
SELECT 
  i.id,
  i.email,
  LOWER(TRIM(i.email)) as email_normalized,
  i.organization_id,
  o.name as organization_name,
  i.role,
  i.accepted_at,
  i.expires_at,
  i.created_at,
  CASE 
    WHEN i.accepted_at IS NOT NULL THEN 'Accepted'
    WHEN i.expires_at < NOW() THEN 'Expired'
    ELSE 'Pending'
  END as status,
  -- Check if email matches (case-insensitive)
  CASE 
    WHEN LOWER(TRIM(i.email)) = LOWER(TRIM((SELECT email FROM auth.users WHERE id = auth.uid()))) 
    THEN '✅ Email matches - should be visible'
    ELSE '❌ Email does not match'
  END as visibility_check
FROM invites i
LEFT JOIN organizations o ON o.id = i.organization_id
WHERE LOWER(TRIM(i.email)) = LOWER(TRIM((SELECT email FROM auth.users WHERE id = auth.uid())))
  AND i.accepted_at IS NULL
  AND i.expires_at > NOW()
ORDER BY i.created_at DESC;

-- Test the RLS policy directly
SELECT 
  'RLS Policy Test' as test_name,
  COUNT(*) as visible_invites
FROM invites
WHERE accepted_at IS NULL
  AND expires_at > NOW();
