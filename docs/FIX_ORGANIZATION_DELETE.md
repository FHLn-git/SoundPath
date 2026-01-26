# Fix: Organization Delete Not Working

## Problem

When attempting to delete a label/organization, the deletion appears to succeed in the UI, but the organization still appears in the launchpad and can still be accessed. Users can still click on the deleted organization and access its dashboard.

## Root Cause

The `organizations` table has Row Level Security (RLS) enabled, but there is **no DELETE policy** defined. This means:

1. When the code attempts to delete an organization: `supabase.from('organizations').delete().eq('id', activeOrgId)`
2. RLS blocks the deletion because no policy allows it
3. The deletion silently fails (or returns an error that's not properly handled)
4. The organization remains in the database
5. The `get_user_memberships()` function still returns it because it still exists
6. The launchpad continues to show it

## Solution

### 1. Add DELETE RLS Policy

Run `fix-organization-delete-rls.sql` in the Supabase SQL Editor. This script:

- Ensures the `is_owner_of_org()` helper function exists
- Creates a DELETE policy that allows owners to delete their organizations
- Verifies the policy was created successfully

### 2. Improved Error Handling

Updated `src/pages/StaffAdmin.jsx` to:

- Provide more specific error messages when deletion fails
- Verify that the deletion actually succeeded by checking the returned data
- Better handle permission errors

## How It Works

1. **Owner clicks "Delete Label"** → Goes through 3-step confirmation
2. **Metrics are archived** → `archive_organization_metrics()` function runs
3. **Organization is deleted** → Now allowed by RLS policy
4. **CASCADE deletes related data**:
   - Memberships (via `ON DELETE CASCADE` on `organization_id`)
   - Tracks, artists, votes, etc. (via their foreign keys)
5. **Memberships are reloaded** → `loadMemberships()` no longer returns the deleted org
6. **Launchpad updates** → Deleted organization no longer appears

## Testing

After running the SQL fix:

1. Create a test organization (or use an existing one where you're the owner)
2. Go to Staff Admin settings
3. Click "Delete Label"
4. Complete all 3 confirmation steps
5. Verify:
   - ✅ Success message appears
   - ✅ Redirected to launchpad
   - ✅ Deleted organization no longer appears in launchpad
   - ✅ Cannot access the organization's dashboard

## Database Schema

The `memberships` table already has the correct foreign key constraint:

```sql
organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
```

This ensures that when an organization is deleted, all memberships are automatically deleted as well.

## Related Files

- `fix-organization-delete-rls.sql` - SQL script to add DELETE policy
- `src/pages/StaffAdmin.jsx` - Delete label function (improved error handling)
- `universal-profiles-schema.sql` - Memberships table schema with CASCADE
- `fix-memberships-rls-recursion.sql` - Contains `is_owner_of_org()` helper function
