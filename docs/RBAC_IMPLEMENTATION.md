# RBAC Implementation Summary

## Overview
Role-Based Access Control (RBAC) has been fully implemented for SoundPath with Supabase Auth integration.

## What Was Implemented

### 1. Database Schema (`rbac-schema.sql`)
- Added `organization_id` to `staff_members`, `tracks`, `artists`, and `votes` tables
- Added `auth_user_id` to link staff members to Supabase Auth users
- Added `role` column with values: 'Owner', 'Manager', 'Scout'
- Added `bio` and `last_active_at` fields to staff_members
- Created `organizations` table
- Implemented Row-Level Security (RLS) policies to ensure users only see their organization's data
- Added trigger to update `last_active_at` when staff interact with tracks

### 2. Authentication System
- **AuthContext** (`src/context/AuthContext.jsx`): Manages authentication state, sign in/out, and staff profile loading
- **Login Component** (`src/components/Login.jsx`): Login form with email/password authentication
- **App Integration**: App.jsx now requires authentication before showing the main app

### 3. Role-Based Permissions
- **Workflow Permissions**:
  - All roles can reject/remove demos or advance from Inbox to Second Listen
  - Only 'Owner' and 'Manager' can advance tracks beyond Second Listen (to The Office, Contracting, Upcoming)
  - Scouts see Advance buttons hidden once tracks leave Second Listen phase
- **UI Updates**: TrackRow component now checks `canAdvanceBeyondSecondListen()` before showing Advance buttons

### 4. Profile Page Refactor (`src/pages/StaffAdmin.jsx`)
- **All Roles**: 
  - Personal staff reports (Activity Status, Avg Energy, Voting Rate, Tracks Advanced)
  - Scrollable list of tracks they advanced (with resizable columns)
  - Close Eye list
  - Profile settings (Name, Bio) with save functionality
  - Logout button
- **Managers**: 
  - Team Overview section (placeholder for team member list with activity status)
- **Owners**: 
  - Company Health dashboard
  - Global Productivity Metrics (placeholder)
  - Release Impact metrics (placeholder for Spotify/Instagram data)
  - Total Earnings calculation

### 5. Sidebar Updates
- Shows current user's name, role, and organization name
- Displays connection status indicator

### 6. AppContext Updates
- Now uses authenticated user from AuthContext
- Automatically includes `organization_id` when creating tracks, artists, and votes
- RLS policies in Supabase automatically filter data by organization

## Setup Instructions

### Step 1: Run Database Schema
1. Open your Supabase SQL Editor
2. Run the `rbac-schema.sql` file to add RBAC support to your database

### Step 2: Create Auth Users
You need to create Supabase Auth users for each staff member and link them to the `staff_members` table.

**Option A: Using Supabase Dashboard**
1. Go to Authentication > Users in Supabase Dashboard
2. Create users with email/password
3. Note their user IDs
4. Update `staff_members` table to set `auth_user_id` for each staff member:
   ```sql
   UPDATE staff_members 
   SET auth_user_id = 'user-uuid-from-auth' 
   WHERE id = 'staff1';
   ```

**Option B: Using SQL (for testing)**
You can create auth users programmatically, but it's recommended to use the Supabase Dashboard for production.

### Step 3: Set Organization IDs
Ensure all existing data has an `organization_id`:
```sql
-- The schema script should have set default organization IDs
-- Verify with:
SELECT COUNT(*) FROM tracks WHERE organization_id IS NULL;
SELECT COUNT(*) FROM artists WHERE organization_id IS NULL;
```

### Step 4: Test Authentication
1. Start your app: `npm run dev`
2. You should see the Login page
3. Sign in with a staff member's email/password
4. Verify that:
   - You see only your organization's data
   - Role-based permissions work correctly
   - Profile page shows appropriate sections for your role

## Role Definitions

- **Owner**: Full access, sees Company Health dashboard, Global Productivity Metrics
- **Manager**: Can advance tracks beyond Second Listen, sees Team Overview
- **Scout**: Limited to Inbox and Second Listen phases, cannot advance beyond Second Listen

## Security Notes

- All RLS policies are enforced at the database level
- Users can only see data from their own organization
- Role-based UI permissions are enforced in the frontend, but database RLS provides the real security
- Make sure to set up proper Supabase Auth email verification in production

## Next Steps (Optional Enhancements)

1. **Team Overview for Managers**: Implement actual query to fetch all Scouts in the organization with their activity status
2. **Global Productivity Metrics**: Aggregate staff efficiency metrics across the organization
3. **Release Impact Metrics**: Integrate with Spotify/Instagram APIs for real metrics
4. **Email Verification**: Enable email verification in Supabase Auth settings
5. **Password Reset**: Add password reset functionality
6. **Activity Tracking**: Implement real-time activity tracking for "Logged In/Logged Out" status
