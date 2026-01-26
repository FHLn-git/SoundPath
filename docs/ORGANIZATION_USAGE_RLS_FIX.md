# Fix: organization_usage RLS Policy Error

## Problem

When creating a new label (organization), users get this error:
```
new row violates row-level security policy for table "organization_usage"
```

## Root Cause

1. **Trigger Functions Not SECURITY DEFINER**: The trigger functions `update_tracks_count()` and `update_staff_count()` that automatically update `organization_usage` are not marked as `SECURITY DEFINER`, so they run with the user's permissions and are subject to RLS policies.

2. **Missing INSERT/UPDATE Policies**: The RLS policy on `organization_usage` only allows SELECT, not INSERT or UPDATE. When a new organization is created:
   - Organization is created
   - Membership is created (triggers `update_staff_count()`)
   - Trigger tries to INSERT into `organization_usage`
   - RLS blocks the INSERT because there's no INSERT policy

3. **Timing Issue**: Even if policies existed, when the membership trigger fires immediately after creating the organization, the user's session might not yet reflect the new membership, causing policy checks to fail.

## Solution

The fix (`fix-organization-usage-rls.sql`) does three things:

### 1. Make Trigger Functions SECURITY DEFINER
- `update_tracks_count()` - Now runs with function owner privileges, bypassing RLS
- `update_staff_count()` - Now runs with function owner privileges, bypassing RLS

This ensures triggers can always insert/update `organization_usage` regardless of RLS policies.

### 2. Add INSERT/UPDATE Policies
- Added INSERT policy for `organization_usage` (for completeness, though SECURITY DEFINER functions bypass RLS)
- Added UPDATE policy for `organization_usage` (for completeness)
- Updated SELECT policy to use memberships table (Agent-Centric approach)

### 3. Initialize Missing Records
- Creates `organization_usage` records for any existing organizations that don't have one yet

## How to Apply

1. Run `fix-organization-usage-rls.sql` in Supabase SQL Editor
2. Test by creating a new organization
3. Verify that `organization_usage` record is created automatically

## Technical Details

### Before Fix
```sql
-- Trigger function runs with user permissions
CREATE FUNCTION update_staff_count() ... 
-- No SECURITY DEFINER, so subject to RLS

-- RLS policy only allows SELECT
CREATE POLICY "Organizations can view their own usage" 
  FOR SELECT ONLY
```

### After Fix
```sql
-- Trigger function runs with function owner privileges
CREATE FUNCTION update_staff_count() ... 
SECURITY DEFINER  -- Bypasses RLS

-- RLS policies allow SELECT, INSERT, UPDATE
CREATE POLICY "Organizations can view their own usage" FOR SELECT ...
CREATE POLICY "Organizations can insert their own usage" FOR INSERT ...
CREATE POLICY "Organizations can update their own usage" FOR UPDATE ...
```

## Why SECURITY DEFINER?

SECURITY DEFINER functions run with the privileges of the function owner (usually `postgres` role), which bypasses RLS. This is safe for trigger functions that need to maintain system state (like usage counts) because:

1. The function logic is controlled (can't be modified by users)
2. It only operates on data related to the trigger event
3. It's necessary for system integrity (usage tracking)

## Testing

After applying the fix:
1. ✅ Create a new organization - should succeed
2. ✅ Check `organization_usage` table - should have a record for the new org
3. ✅ Add a track to the organization - `tracks_count` should increment
4. ✅ Add a staff member - `staff_count` should increment

## Related Files

- `saas-schema.sql` - Original schema with trigger definitions
- `fix-organization-usage-rls.sql` - This fix
- `src/pages/Launchpad.jsx` - Where organizations are created
