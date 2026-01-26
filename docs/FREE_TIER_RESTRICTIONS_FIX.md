# Free Tier Restrictions Fix

## Problem
Free tier restrictions were spilling over into paid tiers, causing paid users to be incorrectly restricted during:
1. Plan loading (when `plan` is null)
2. Past due subscriptions (treated as inactive)
3. Feature access checks (falling back to free tier incorrectly)

## Fixes Applied

### 1. Frontend: `useUsageLimits.js` ✅
**Issue**: When `plan` is null (during loading), functions returned `false`, blocking paid users.

**Fix**: Modified `canAddTrack()`, `canAddStaff()`, and `canMakeAPICall()` to fall back to database `checkLimit()` when plan is null, instead of immediately returning false.

```javascript
// Before: if (!plan) return false
// After: Falls back to checkLimit() which queries database directly
```

### 2. Frontend: UI Components ✅
**Issue**: When `plan` is null, components might incorrectly restrict access.

**Fix**: Updated `Sidebar.jsx`, `ArtistDirectory.jsx`, and `StaffAdmin.jsx` to allow access when `plan === null` (loading state), only restricting when explicitly `plan.id === 'free'`.

```javascript
// Before: const access = !isFreeTier
// After: const access = plan === null || !isFreeTier
```

### 3. Database: `check_usage_limit()` ✅
**Issue**: Only checked for 'trialing' and 'active' status, excluding 'past_due' subscriptions which should still have paid plan limits.

**Fix**: Updated to include 'past_due' in active statuses. Past due subscriptions should still use their paid plan limits, not free tier.

**File**: `fix-check-usage-limit-past-due.sql` (also included in `fix-subscription-functions-past-due.sql`)

### 4. Database: `get_organization_subscription()` ✅
**Issue**: Only returned subscriptions with 'trialing' or 'active' status, causing 'past_due' subscriptions to be treated as non-existent.

**Fix**: Updated to include 'past_due' status so the function returns the subscription even when payment is past due.

**File**: `fix-subscription-functions-past-due.sql`

### 5. Database: `has_feature_access()` ✅
**Issue**: Only checked for 'trialing' and 'active' status, excluding 'past_due' subscriptions from feature access.

**Fix**: Updated to include 'past_due' status.

**File**: `fix-subscription-functions-past-due.sql`

## SQL Scripts to Run

Run these SQL scripts in Supabase SQL Editor in order:

1. **`fix-subscription-functions-past-due.sql`** - Fixes all three database functions:
   - `get_organization_subscription()`
   - `has_feature_access()`
   - `check_usage_limit()`

   (Note: `fix-check-usage-limit-past-due.sql` is redundant if you run the above)

## Testing Checklist

After applying fixes, verify:

- [ ] Paid tier users can access features during plan loading (when plan is null)
- [ ] Past due subscriptions still have paid plan limits and features
- [ ] Free tier users are correctly restricted
- [ ] Track/staff limits work correctly for paid tiers
- [ ] Feature access (API, Webhooks, etc.) works for paid tiers
- [ ] UI components (Sidebar, Artist Directory, Staff Admin) show correct access for paid users

## Key Principle

**Default to allowing access for paid users, only restrict when explicitly free tier.**

- When `plan === null` (loading): Allow access (paid users shouldn't be blocked during loading)
- When `plan.id === 'free'`: Restrict access
- When subscription status is 'past_due': Treat as active (still has paid plan benefits)
