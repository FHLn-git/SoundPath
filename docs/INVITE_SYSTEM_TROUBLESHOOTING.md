# Invite System Troubleshooting Guide

## Problem
Invite notifications are not appearing in Launchpad for existing users.

## Comprehensive Fix Steps

### Step 1: Fix Infinite Recursion (CRITICAL - Run First!)
**If you see error: "infinite recursion detected in policy for relation 'memberships'"**

Run `fix-memberships-rls-recursion.sql` in Supabase SQL Editor FIRST. This will:
- Create SECURITY DEFINER helper functions to avoid RLS recursion
- Fix all memberships RLS policies to use helper functions
- Fix all invite RLS policies to use helper functions
- This must be run before the comprehensive invite fix

### Step 2: Run the Comprehensive RLS Fix
Run `comprehensive-invite-fix.sql` in Supabase SQL Editor. This will:
- Drop all existing invite policies (to avoid conflicts)
- Create case-insensitive RLS policy for users to view their invites
- Create all necessary policies for Owners/Managers using helper functions
- Verify policies were created correctly

### Step 2: Check Browser Console
When the existing user logs in and views Launchpad, open browser console (F12) and look for:
- `🔍 Loading invites for email: [email]` - Shows the email being queried
- `🔍 Step 1: Testing RLS access...` - Tests if RLS is working
- `🔍 Step 2: Querying invites with email filter...` - Shows the actual query
- `📋 Final invite query result:` - Shows what was found

### Step 3: Verify Invite Exists in Database
Run `test-invite-query.sql` in Supabase SQL Editor (replace `USER_EMAIL_HERE` with the actual email) to:
- Check if the invite exists
- Verify email matches (case-insensitive)
- Check if invite is pending (not accepted, not expired)

### Step 4: Test RLS Policy Directly
Run this query in Supabase SQL Editor as the user:
```sql
-- This should return invites if RLS is working
SELECT * FROM invites 
WHERE accepted_at IS NULL 
  AND expires_at > NOW();
```

If this returns 0 rows but you know invites exist, the RLS policy is blocking access.

## Common Issues and Solutions

### Issue 1: RLS Policy Not Case-Insensitive
**Symptom**: Query returns 0 results even though invite exists
**Solution**: Run `comprehensive-invite-fix.sql` which creates a case-insensitive policy

### Issue 3: Multiple Conflicting Policies
**Symptom**: Unpredictable behavior, sometimes works, sometimes doesn't
**Solution**: The comprehensive fix script drops all policies first, then recreates them

### Issue 3: Foreign Key Relationship Error
**Symptom**: Query fails with relationship error
**Solution**: The code now fetches inviter info separately if the join fails

### Issue 5: Email Case Mismatch
**Symptom**: Invite exists but email doesn't match exactly
**Solution**: 
- Invites are stored with `email.toLowerCase().trim()`
- Query uses `userEmail.toLowerCase().trim()`
- RLS policy uses `LOWER(TRIM())` comparison
- All should match now

### Issue 5: Invite Already Accepted or Expired
**Symptom**: Invite exists but doesn't show
**Solution**: Check `accepted_at` is NULL and `expires_at` is in the future

## Debugging Checklist

- [ ] **If you see recursion error**: Run `fix-memberships-rls-recursion.sql` FIRST
- [ ] Run `comprehensive-invite-fix.sql`
- [ ] Check browser console for detailed logs
- [ ] Verify invite exists: `SELECT * FROM invites WHERE email = 'user@example.com'`
- [ ] Verify invite is pending: `accepted_at IS NULL AND expires_at > NOW()`
- [ ] Test RLS policy: Run test query as the user
- [ ] Check email matches exactly (case-insensitive)
- [ ] Verify real-time subscription is working (check console for subscription status)

## Expected Console Output (Success)

```
🔍 Loading invites for email: user@example.com
🔍 Auth user email (raw): User@Example.com
🔍 Step 1: Testing RLS access...
🔍 RLS test result: { canAccess: true, foundAny: true }
🔍 Step 2: Querying invites with email filter...
📋 Final invite query result: {
  userEmail: "user@example.com",
  invitesFound: 1,
  invites: [{ id: "...", email: "user@example.com", org: "Label Name", ... }]
}
✅ Found 1 pending invite(s) for user@example.com
```

## Expected Console Output (Failure)

```
🔍 Loading invites for email: user@example.com
🔍 Step 1: Testing RLS access...
🔍 RLS test result: { canAccess: false, error: "permission denied" }
❌ Error loading pending invites: { code: "42501", message: "..." }
⚠️ RLS policy might be blocking invite access
```

If you see RLS errors, run `comprehensive-invite-fix.sql` again.

## Manual Test Query

Run this in Supabase SQL Editor as the user to test visibility:

```sql
-- Test if user can see their invites
SELECT 
  i.*,
  o.name as organization_name,
  CASE 
    WHEN i.accepted_at IS NOT NULL THEN 'Accepted'
    WHEN i.expires_at < NOW() THEN 'Expired'
    ELSE 'Pending'
  END as status
FROM invites i
JOIN organizations o ON o.id = i.organization_id
WHERE LOWER(TRIM(i.email)) = LOWER(TRIM((SELECT email FROM auth.users WHERE id = auth.uid())))
  AND i.accepted_at IS NULL
  AND i.expires_at > NOW();
```

If this returns results but the app doesn't show them, there's a code issue.
If this returns 0 results but you know invites exist, there's an RLS issue.
