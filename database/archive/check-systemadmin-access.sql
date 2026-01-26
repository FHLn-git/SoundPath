-- Check if your user has SystemAdmin role
-- Run this in Supabase SQL Editor to see your current role

-- First, find your auth user ID (you'll need to replace this with your email)
SELECT 
  id as auth_user_id,
  email
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE@example.com'; -- Replace with your email

-- Then check your staff_members role
SELECT 
  sm.id,
  sm.name,
  sm.role,
  sm.auth_user_id,
  CASE 
    WHEN sm.role = 'SystemAdmin' THEN '✅ You have SystemAdmin access!'
    ELSE '❌ You do NOT have SystemAdmin access'
  END as access_status
FROM staff_members sm
WHERE sm.auth_user_id = (
  SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE@example.com' -- Replace with your email
);

-- If you need to grant SystemAdmin access to yourself:
-- UPDATE staff_members 
-- SET role = 'SystemAdmin'
-- WHERE auth_user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE@example.com');
