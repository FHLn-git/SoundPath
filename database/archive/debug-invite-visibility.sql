-- ============================================================================
-- Debug Invite Visibility
-- ============================================================================
-- Run this to check if invites are visible to users
-- Replace 'USER_EMAIL_HERE' with the actual email address

-- 1. Check if invite exists
SELECT 
  i.id,
  i.email,
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
  END as status
FROM invites i
JOIN organizations o ON o.id = i.organization_id
WHERE i.email = 'USER_EMAIL_HERE' -- Replace with actual email
ORDER BY i.created_at DESC;

-- 2. Check RLS policy exists
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'invites'
  AND policyname = 'Users can view their invites';

-- 3. Test if user can see their invite (simulate RLS check)
-- This shows what the RLS policy would return for a specific user
-- Replace 'USER_EMAIL_HERE' with the actual email
SELECT 
  i.*,
  CASE 
    WHEN i.email = 'USER_EMAIL_HERE' THEN '✅ Email matches - should be visible'
    ELSE '❌ Email does not match - will be filtered by RLS'
  END as visibility_check
FROM invites i
WHERE i.email = 'USER_EMAIL_HERE' -- Replace with actual email
  AND i.accepted_at IS NULL
  AND i.expires_at > NOW();

-- 4. Check if there are any invites with case sensitivity issues
SELECT 
  email,
  LOWER(email) as email_lower,
  COUNT(*) as count
FROM invites
WHERE LOWER(email) = LOWER('USER_EMAIL_HERE') -- Replace with actual email
GROUP BY email, LOWER(email);
