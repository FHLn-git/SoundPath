# Invite Notification Fix

## Problem
When an invite is sent to an existing user, the Launchpad notification does not appear.

## Root Causes

1. **Case Sensitivity Issue**: The RLS policy compares emails case-sensitively, but invites are stored with lowercase emails while `auth.users` emails might have mixed case.

2. **Missing Explicit Email Filter**: The query was relying solely on RLS, which might not filter correctly in all cases.

3. **Real-time Subscription**: The subscription might not be triggering correctly for new invites.

## Solutions Applied

### 1. Fixed RLS Policy (Case-Insensitive)
Run `fix-invite-rls-case-insensitive.sql` in Supabase SQL Editor to update the RLS policy to use case-insensitive email comparison.

### 2. Improved Query Logic
- Added explicit `.eq('email', userEmail)` filter in the query
- Added comprehensive logging to debug issues
- Added loading state management

### 3. Enhanced Real-time Subscription
- Improved subscription setup with better error handling
- Added logging for subscription status
- Removed filter that might have been blocking updates

### 4. Better Error Handling
- Added specific RLS error detection and logging
- Added detailed error information in console
- Added helpful error messages

## Files Modified

1. `src/pages/Launchpad.jsx`:
   - Added `loadPendingInvites` function with explicit email filtering
   - Added comprehensive logging
   - Improved real-time subscription
   - Added loading state

2. `fix-invite-rls-case-insensitive.sql`:
   - New SQL script to fix RLS policy case sensitivity

3. `debug-invite-visibility.sql`:
   - Diagnostic script to check invite visibility

## How to Fix

### Step 1: Run the RLS Fix
Run `fix-invite-rls-case-insensitive.sql` in Supabase SQL Editor. This updates the RLS policy to be case-insensitive.

### Step 2: Check Browser Console
When the existing user logs in and views Launchpad, check the browser console (F12) for:
- `🔍 Loading invites for email: [email]` - Shows the email being queried
- `✅ Found X pending invite(s)` - Shows if invites were found
- Any RLS errors (code 42501)

### Step 3: Debug if Still Not Working
Run `debug-invite-visibility.sql` in Supabase SQL Editor (replace `USER_EMAIL_HERE` with the actual email) to:
- Check if the invite exists
- Verify RLS policy is configured
- Check for case sensitivity issues

## Expected Behavior After Fix

1. **When invite is sent**: Email is sent to the user (both new and existing users)
2. **When existing user logs in**: 
   - Invite appears in Launchpad notification banner
   - Real-time subscription updates when new invites arrive
   - User can accept/dismiss invites directly from Launchpad
3. **After accepting**: 
   - Invite disappears from notification
   - New label appears in memberships
   - Page refreshes to show new label

## Testing Checklist

- [ ] Run `fix-invite-rls-case-insensitive.sql`
- [ ] Send invite to existing user
- [ ] Existing user logs in and views Launchpad
- [ ] Check browser console for invite loading logs
- [ ] Verify invite notification appears
- [ ] Test accepting invite
- [ ] Verify new label appears in memberships
- [ ] Test real-time updates (send another invite while user is on Launchpad)

## Common Issues

1. **RLS Policy Not Updated**: Make sure you ran the SQL fix script
2. **Email Case Mismatch**: The fix script handles this, but verify emails match
3. **Invite Already Accepted**: Check `accepted_at` is NULL in database
4. **Invite Expired**: Check `expires_at` is in the future
5. **Real-time Not Working**: Check browser console for subscription errors

## Debugging Commands

```sql
-- Check if invite exists for email
SELECT * FROM invites 
WHERE LOWER(email) = LOWER('user@example.com')
  AND accepted_at IS NULL
  AND expires_at > NOW();

-- Check RLS policy
SELECT * FROM pg_policies 
WHERE tablename = 'invites' 
  AND policyname = 'Users can view their invites';
```
