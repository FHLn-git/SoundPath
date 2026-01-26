# Troubleshooting Guide

## Stuck on Loading Screen

If the app is stuck on the "Loading SoundPath..." screen, follow these steps:

### Step 1: Check Browser Console
1. Open browser DevTools (F12)
2. Go to the Console tab
3. Look for error messages (red text)
4. Common errors:
   - `Supabase credentials not found` → Missing .env file
   - `Error loading staff profile` → Auth user not linked to staff member
   - `RLS policy violation` → Row-Level Security blocking access

### Step 2: Verify .env File
1. Check if `.env` file exists in project root (same folder as `package.json`)
2. Verify it contains:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```
3. **Important**: Restart dev server after creating/editing .env file
   ```bash
   # Stop server (Ctrl+C), then:
   npm run dev
   ```

### Step 3: Check Database Setup
1. Go to Supabase Dashboard > SQL Editor
2. Verify `master-schema.sql` has been run
3. Check if tables exist:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('staff_members', 'tracks', 'artists', 'votes');
   ```

### Step 4: Verify Auth User Setup
1. Go to Supabase Dashboard > Authentication > Users
2. Check if you have at least one user created
3. Copy the User ID (UUID)
4. Run this SQL to link user to staff:
   ```sql
   UPDATE staff_members 
   SET auth_user_id = 'YOUR-USER-ID-HERE'::uuid 
   WHERE id = 'staff1';
   ```
5. Verify the link:
   ```sql
   SELECT id, name, role, auth_user_id 
   FROM staff_members 
   WHERE auth_user_id IS NOT NULL;
   ```

### Step 5: Check RLS Policies
If RLS is blocking access, temporarily disable it for testing:
```sql
-- Temporarily disable RLS (FOR TESTING ONLY)
ALTER TABLE staff_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE tracks DISABLE ROW LEVEL SECURITY;
ALTER TABLE artists DISABLE ROW LEVEL SECURITY;
ALTER TABLE votes DISABLE ROW LEVEL SECURITY;
```

**⚠️ Re-enable RLS after testing:**
```sql
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
```

### Step 6: Use Diagnostics Component
After 10 seconds, the app will show a diagnostics panel that checks:
- ✅ Supabase client configuration
- ✅ Environment variables
- ✅ Database connection
- ✅ Auth system
- ✅ Staff members table

This will help identify the exact issue.

## Common Issues

### Issue: "Supabase not configured"
**Solution**: Create `.env` file with your Supabase credentials

### Issue: "Error loading staff profile"
**Solution**: Link your auth user to a staff member (see Step 4)

### Issue: "No rows returned" or "RLS policy violation"
**Solution**: 
1. Check if staff member has `organization_id` set
2. Verify RLS policies are correct
3. Temporarily disable RLS for testing (see Step 5)

### Issue: Infinite loading with no errors
**Solution**: 
1. Check browser console for hidden errors
2. Verify Supabase URL is correct (should start with `https://`)
3. Check if your Supabase project is active (not paused)

## Quick Test

Run this in Supabase SQL Editor to verify everything is set up:

```sql
-- Check staff members
SELECT id, name, role, auth_user_id, organization_id 
FROM staff_members;

-- Check if default organization exists
SELECT * FROM organizations WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('staff_members', 'tracks', 'artists', 'votes');
```

## Still Stuck?

1. Check the browser console (F12) for specific error messages
2. Look at the Network tab to see if API calls are failing
3. Verify your Supabase project is not paused
4. Check Supabase Dashboard > Settings > API for correct URL and keys
