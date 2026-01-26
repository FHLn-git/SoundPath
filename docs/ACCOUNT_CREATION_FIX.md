# Account Creation & Login Redirect Fixes

## Issues Fixed

### 1. ✅ Account Creation Not Showing in Supabase
**Problem**: Accounts were created but staff_members records weren't being created properly.

**Fix**:
- Added retry logic with exponential backoff for staff_members creation
- Added automatic staff_members creation if missing during login
- Better error handling to ensure staff_members is always created

### 2. ✅ "User Already Exists" Error
**Problem**: App was showing "user already exists" even when account wasn't visible in Supabase.

**Fix**:
- Added proper check for existing users before signup
- Handles email confirmation pending state
- Better error messages distinguishing between confirmed and unconfirmed accounts

### 3. ✅ Login Redirect Not Working
**Problem**: "Success! Redirecting..." message appeared but no redirect happened.

**Fix**:
- Redirect now works even if staffProfile loading fails
- Added timeout fallback to redirect after 3 seconds
- Creates minimal staff profile if one doesn't exist
- Ensures user can always access welcome page

## Required SQL Fix

**CRITICAL**: Run `fix-account-creation-rls.sql` in Supabase SQL Editor to:
1. Allow users to create their own staff_members record during signup
2. Fix existing accounts that are missing staff_members records

## How It Works Now

### Account Creation Flow:
1. User fills out signup form
2. Check if email already exists (handles confirmation pending)
3. Create auth user in Supabase
4. Create staff_members record (with retry logic)
5. Redirect to login page with success message

### Login Flow:
1. User signs in
2. Load staff_members record (or create if missing)
3. Load memberships
4. Redirect to:
   - `/welcome` if no memberships
   - `/launchpad` if has memberships
   - Fallback redirect after 3 seconds if profile loading fails

## Testing Checklist

- [ ] Run `fix-account-creation-rls.sql` in Supabase
- [ ] Create a new account via `/signup`
- [ ] Verify account appears in Supabase (auth.users AND staff_members)
- [ ] Try creating account with same email (should show proper error)
- [ ] Sign in with new account
- [ ] Verify redirect happens (should go to `/welcome` or `/launchpad`)
- [ ] Check browser console for any errors

## Troubleshooting

### "User already exists" but can't see in Supabase
- Check if email confirmation is required in Supabase settings
- Check `auth.users` table (not just staff_members)
- User might be in "unconfirmed" state

### Redirect not happening
- Check browser console for errors
- Wait 3 seconds - fallback redirect should trigger
- Check if `user` is set in AuthContext

### Staff profile not loading
- Check RLS policies are correct
- Run `fix-account-creation-rls.sql`
- Check browser console for specific error messages

## Code Changes

### `src/context/AuthContext.jsx`
- Enhanced `signUp()` with retry logic and better error handling
- Enhanced `loadStaffProfile()` with auto-creation of missing records
- Better error messages and logging

### `src/pages/Landing.jsx`
- Fixed redirect logic to work even if staffProfile fails to load
- Added timeout fallback for redirects

### `src/pages/SignUp.jsx`
- Better error handling for partial success cases
- Improved user feedback

---

**All fixes are in place!** Run the SQL file and test account creation/login flow.
