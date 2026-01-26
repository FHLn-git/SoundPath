# RLS Security Implementation Guide

## Overview

Row Level Security (RLS) has been enabled for `email_queue`, `invites`, and `memberships` tables. This document explains the security model and how the app works with RLS.

## Security Model

### Email Queue
- **SystemAdmin Only**: Only SystemAdmin users can view/manage email queue
- **No Direct User Access**: Regular users cannot directly access email_queue
- **Function-Based Access**: Email queuing is done via `queue_email()` SECURITY DEFINER function

### Invites
- **Users**: Can view invites sent to their email address
- **Owners**: Can view, create, and update invites for their organization
- **Managers**: Can view invites for their organization (read-only)
- **SystemAdmin**: Can manage all invites
- **Function-Based Creation**: Invite creation uses `create_invite()` SECURITY DEFINER function

### Memberships
- **Users**: Can view their own memberships
- **Owners**: Can view, create, update, and delete memberships in their organization
- **Managers**: Can view memberships in their organization (read-only)
- **SystemAdmin**: Can manage all memberships
- **Function-Based Operations**: Membership operations use SECURITY DEFINER functions:
  - `create_membership()` - Create new membership
  - `update_membership_role()` - Update role (Owner only)
  - `update_membership_permissions()` - Update permissions (Owner only)
  - `deactivate_membership()` - Remove membership (Owner only)

## Setup Instructions

### Step 1: Run RLS Policies SQL

Execute `rls-policies-email-invites-memberships.sql` in Supabase SQL Editor:

```sql
-- This will:
-- 1. Enable RLS on all three tables
-- 2. Create comprehensive security policies
-- 3. Create SECURITY DEFINER functions for safe operations
```

### Step 2: Verify RLS is Enabled

Run this query to verify:

```sql
SELECT 
  tablename,
  CASE WHEN relrowsecurity THEN '✅ RLS Enabled' ELSE '❌ RLS Disabled' END as rls_status
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public'
  AND t.tablename IN ('email_queue', 'invites', 'memberships');
```

### Step 3: Test the Application

1. **Test as Owner:**
   - Create invite → Should work
   - View invites → Should see all for organization
   - Update membership → Should work
   - Remove staff → Should work

2. **Test as Manager:**
   - View invites → Should see all for organization
   - View memberships → Should see all for organization
   - Create invite → Should fail (Owner only)
   - Update membership → Should fail (Owner only)

3. **Test as Scout:**
   - View invites → Should only see invites to their email
   - View memberships → Should only see their own
   - Create invite → Should fail
   - Update membership → Should fail

## Code Changes Made

### 1. Email Service (`src/lib/emailService.js`)
- Updated to use `queue_email()` function instead of direct insert
- This bypasses RLS safely since function has SECURITY DEFINER

### 2. App Context (`src/context/AppContext.jsx`)
- **addStaff()**: Uses `create_invite()` function
- **updateStaffRole()**: Uses `update_membership_role()` function
- **removeStaff()**: Uses `deactivate_membership()` function
- **updateStaffPermissions()**: Uses `update_membership_permissions()` function
- **getAllStaff()**: Direct query (RLS filters automatically)

### 3. Onboarding (`src/pages/Onboarding.jsx`)
- Uses `create_membership()` function to create owner membership
- This works even though user doesn't have membership yet

### 4. Welcome Page (`src/pages/Welcome.jsx`)
- Uses `create_membership()` function when creating new label

### 5. Launchpad (`src/pages/Launchpad.jsx`)
- Uses `create_membership()` function when creating new label

## Security Features

### ✅ What's Protected

1. **Data Isolation**: Users can only see data for organizations they belong to
2. **Role-Based Access**: Only Owners can manage memberships/invites
3. **Self-Protection**: Users cannot remove themselves
4. **Email Privacy**: Users can only see invites sent to their email
5. **SystemAdmin Override**: SystemAdmin can manage everything (for support)

### ✅ What's Safe

1. **SECURITY DEFINER Functions**: All write operations use functions that:
   - Verify permissions before executing
   - Bypass RLS only when necessary
   - Still enforce business rules

2. **RLS Policies**: All read operations are automatically filtered by RLS
   - No need to manually filter in application code
   - Database enforces security at the lowest level

3. **Audit Trail**: All operations can be logged (via audit_logs table)

## Troubleshooting

### "Permission denied" errors

**Symptom**: Queries to memberships/invites fail with permission error

**Solution**: 
- Check that user has correct role (Owner for management operations)
- Verify RLS policies are correctly applied
- Check that SECURITY DEFINER functions are being used for writes

### "No rows returned" when expecting data

**Symptom**: Query succeeds but returns no rows

**Solution**:
- This is RLS working correctly - user doesn't have permission to see those rows
- Verify user's role and organization membership
- Check RLS policies match your expectations

### Functions not found

**Symptom**: "Function does not exist" error

**Solution**:
- Run `rls-policies-email-invites-memberships.sql` to create functions
- Verify functions exist: `SELECT proname FROM pg_proc WHERE proname LIKE '%membership%' OR proname LIKE '%invite%';`

## Testing Checklist

- [ ] Run RLS policies SQL file
- [ ] Verify RLS is enabled on all three tables
- [ ] Test invite creation as Owner
- [ ] Test invite creation as Manager (should fail)
- [ ] Test viewing invites as different roles
- [ ] Test membership creation during onboarding
- [ ] Test membership updates as Owner
- [ ] Test membership updates as Manager (should fail)
- [ ] Test staff removal as Owner
- [ ] Test email queueing (should work via function)
- [ ] Test SystemAdmin access (should see everything)

## Security Best Practices

1. **Always use functions for writes**: Never directly INSERT/UPDATE/DELETE on RLS-protected tables
2. **Verify permissions in functions**: Functions check permissions before executing
3. **Test with different roles**: Ensure each role can only do what they should
4. **Monitor audit logs**: Track all sensitive operations
5. **Regular security audits**: Review RLS policies periodically

## Next Steps

1. ✅ RLS policies created
2. ✅ Code updated to use SECURITY DEFINER functions
3. ⚠️ **Run the SQL file** in Supabase
4. ⚠️ **Test all operations** with different user roles
5. ⚠️ **Monitor for errors** and adjust policies if needed

---

**Security is now enforced at the database level!** 🛡️
