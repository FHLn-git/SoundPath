# Organization ID Nullable Fix

## Problem

The `staff_members` table had `organization_id` set to NOT NULL, but new users signing up don't have an organization yet. This caused the error:

```
ERROR: 23502: null value in column "organization_id" of relation "staff_members" violates not-null constraint
```

## Solution

Made `organization_id` nullable in `staff_members` because:
1. Users can sign up without being part of an organization
2. Organization membership is now handled via the `memberships` table (universal profiles)
3. Users can belong to multiple organizations through memberships

## Changes Made

### 1. SQL Fix (`fix-account-creation-rls.sql`)
- Added step to make `organization_id` nullable
- Updated INSERT statement to explicitly set `organization_id = NULL` for new signups
- Updated RLS policy to allow creating staff_members with NULL organization_id

### 2. Code Updates (`src/context/AuthContext.jsx`)
- Updated `signUp()` to set `organization_id: null` when creating staff_members
- Updated `loadStaffProfile()` auto-creation to set `organization_id: null`

## How It Works Now

1. **New Signup**: User creates account → `staff_members` created with `organization_id = NULL`
2. **Join Organization**: User accepts invite or creates label → `memberships` record created
3. **Multiple Organizations**: User can have multiple `memberships` records for different organizations

## Required Action

Run `fix-account-creation-rls.sql` in Supabase SQL Editor. This will:
1. Make `organization_id` nullable
2. Fix RLS policies
3. Create missing staff_members records for existing users

## Testing

After running the SQL:
1. Create a new account via `/signup`
2. Verify account is created successfully
3. Check `staff_members` table - `organization_id` should be NULL
4. Sign in - should redirect properly
5. Create or join an organization - `memberships` record should be created

---

**The fix is complete!** Run the SQL file and test account creation.
