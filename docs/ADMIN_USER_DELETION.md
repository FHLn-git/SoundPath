# Admin User Deletion Guide

## ⚠️ Important: Don't Just Delete SQL Rows!

**You cannot simply delete rows from SQL tables.** User accounts have multiple components that must be deleted in the correct order:

1. **`auth.users`** - Supabase authentication record (requires Admin API)
2. **`staff_members`** - User profile record
3. **Related data** - Memberships, tracks, votes, etc. (handled by CASCADE)

---

## Safe Deletion Methods

### Method 1: Using the Admin Function (Recommended)

A SQL function has been created to safely delete user accounts:

1. **Run the migration:**
   - Execute `database/migrations/admin-delete-user.sql` in Supabase SQL Editor

2. **Delete a user:**
   ```sql
   -- Find the user's auth_user_id first
   SELECT id, email FROM auth.users WHERE email = 'user@example.com';
   
   -- Delete the user (replace with actual IDs)
   SELECT admin_delete_user_account(
     'auth-user-uuid-here'::uuid,
     'your-admin-staff-id'  -- Your system admin staff_members.id
   );
   ```

3. **Complete auth user deletion:**
   - The function will delete `staff_members` and related data
   - You still need to delete the `auth.users` record via:
     - **Supabase Dashboard**: Authentication → Users → Find user → Delete
     - **Admin API**: `supabase.auth.admin.deleteUser(auth_user_id)`

---

### Method 2: Manual SQL Deletion

If you prefer manual control:

#### Step 1: Find the User

```sql
SELECT 
  u.id as auth_user_id,
  u.email,
  sm.id as staff_id,
  sm.name,
  sm.role,
  (SELECT COUNT(*) FROM memberships WHERE user_id = sm.id) as membership_count
FROM auth.users u
LEFT JOIN staff_members sm ON sm.auth_user_id = u.id
WHERE u.email = 'user@example.com';
```

#### Step 2: Delete Staff Members Record

```sql
-- This will cascade delete:
-- - memberships (ON DELETE CASCADE)
-- - votes (ON DELETE CASCADE)
-- - tracks (sender_id/recipient_user_id set to NULL)
-- Historical data (listen_logs, rejection_reasons) is preserved

DELETE FROM staff_members 
WHERE auth_user_id = 'auth-user-uuid-here';
```

#### Step 3: Delete Auth User

**⚠️ Cannot be done via SQL directly!** You must use:

**Option A: Supabase Dashboard**
1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Search for the user by email
3. Click the user → Click **Delete** button
4. Confirm deletion

**Option B: Admin API** (if you have admin access)
```javascript
// In your admin tool or script
const { data, error } = await supabase.auth.admin.deleteUser('auth-user-uuid-here');
```

---

### Method 3: Add Admin UI (Future Enhancement)

You could add a user management section to `AdminDashboard.jsx`:

```javascript
// Example function to add to AdminDashboard
const deleteUser = async (authUserId, staffId) => {
  // 1. Delete staff_members via RPC
  const { data, error } = await supabase.rpc('admin_delete_user_account', {
    p_auth_user_id: authUserId,
    p_deleted_by_staff_id: staffProfile.id
  });
  
  // 2. Delete auth user via Admin API
  const { error: authError } = await supabase.auth.admin.deleteUser(authUserId);
  
  if (error || authError) {
    // Handle error
  }
};
```

---

## What Gets Deleted (CASCADE Behavior)

When you delete a `staff_members` record:

### ✅ Automatically Deleted (CASCADE):
- **memberships** - All organization memberships
- **votes** - All votes cast by the user
- **agent_connections** - Network connections (ON DELETE CASCADE)

### ✅ Set to NULL (ON DELETE SET NULL):
- **tracks.sender_id** - Tracks sent by user (track remains)
- **tracks.recipient_user_id** - Tracks assigned to user (track remains)
- **tracks.created_by** - Tracks created by user (track remains)
- **organizations.owner_id** - If user was org owner (org remains, owner_id = NULL)

### ✅ Preserved (Historical Data):
- **listen_logs** - Listening history (preserved for analytics)
- **rejection_reasons** - Rejection history (preserved for records)
- **error_logs** - Error logs (preserved for debugging)

---

## Safety Checklist

Before deleting a user account:

- [ ] Verify you have the correct user (check email, name, staff_id)
- [ ] Check if user owns any organizations (may need to transfer ownership first)
- [ ] Check if user has active subscriptions (may need to cancel first)
- [ ] Backup important data if needed (export user's tracks, votes, etc.)
- [ ] Delete `staff_members` record first
- [ ] Delete `auth.users` record via Dashboard or Admin API
- [ ] Verify deletion (check that user can no longer log in)

---

## Troubleshooting

### "Permission denied" Error

**Cause:** RLS policies blocking deletion

**Fix:** The `admin_delete_user_account` function uses `SECURITY DEFINER` to bypass RLS. Make sure you're calling it correctly.

### "Cannot delete auth user" Error

**Cause:** Trying to delete from `auth.users` via SQL

**Fix:** Use Supabase Dashboard or Admin API. SQL deletion of `auth.users` is restricted.

### "Foreign key constraint" Error

**Cause:** Trying to delete `auth.users` before `staff_members`

**Fix:** Delete in this order:
1. `staff_members` (cascades to related data)
2. `auth.users` (via Dashboard/API)

### User Still Appears After Deletion

**Cause:** Only deleted `staff_members`, not `auth.users`

**Fix:** Complete the deletion by removing the `auth.users` record via Dashboard.

---

## Quick Reference

**Find User:**
```sql
SELECT u.id, u.email, sm.id as staff_id 
FROM auth.users u 
LEFT JOIN staff_members sm ON sm.auth_user_id = u.id 
WHERE u.email = 'user@example.com';
```

**Delete Staff Record:**
```sql
DELETE FROM staff_members WHERE auth_user_id = 'uuid-here';
```

**Delete Auth User:**
- Supabase Dashboard → Authentication → Users → Delete
- OR Admin API: `supabase.auth.admin.deleteUser(uuid)`

---

## Summary

**✅ DO:**
- Use the `admin_delete_user_account()` function
- Delete `staff_members` first, then `auth.users`
- Use Supabase Dashboard or Admin API for `auth.users` deletion
- Verify deletion completed successfully

**❌ DON'T:**
- Just delete rows from SQL tables without understanding relationships
- Delete `auth.users` before `staff_members`
- Delete via SQL without proper permissions
- Skip verification steps

---

## Already Deleted? Check for Orphaned Data

If you already deleted the `auth.users` record from the Dashboard, run this to check for leftover data:

**Run:** `database/migrations/find-orphaned-user-data.sql` in Supabase SQL Editor

This will show you:
- Any orphaned `staff_members` records
- Any orphaned `memberships`
- Any orphaned `votes`
- Tracks with orphaned user references

**To clean up orphaned data:**
1. Review what was found
2. Uncomment the cleanup queries at the bottom of the file
3. Run them one at a time to clean up

**Note:** If the CASCADE worked properly, you shouldn't find any orphaned data. But it's good to verify!
