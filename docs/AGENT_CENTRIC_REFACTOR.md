# Agent-Centric Architecture Refactor

## Overview
Refactored the application from an Organization-Centric to an **Agent-Centric** architecture, where users exist as independent Agents who can optionally join or create Labels (organizations).

## Key Changes

### 1. DEFAULT USER STATE ✅
- **User Schema**: Users already have `organization_id` as NULL by default (no changes needed)
- **Routing Logic**: Updated `App.jsx` to route to `/launchpad` when `activeOrgId` is null
  - Personal view (no active org) → `/launchpad`
  - Label workspace (active org set) → `/dashboard`

### 2. WORKSPACE DECOUPLING ✅
- **Sidebar Navigation** (`src/components/Sidebar.jsx`):
  - **Personal View** (activeOrgId is null): Shows "Personal Dashboard", "Personal Rolodex", "Profile"
  - **Label Workspace** (activeOrgId set): Shows full Label features (Dashboard, Artist Directory, Upcoming, Vault, Calendar, etc.)
  - Displays "Personal Workspace" vs "Role • Label Name" based on context

### 3. REVERSE THE HIERARCHY ✅
- **Personal Inbox/Rolodex** are now the primary data structures:
  - Owned by `user_id` (via `recipient_user_id`)
  - `organization_id` is NULL for Personal data
- **Label-specific data** is treated as external workspaces:
  - Tracks have `organization_id` set when in a Label workspace
  - Agent can switch between Personal and Label workspaces

### 4. CREATE LABEL LOGIC ✅
- Already optional - users can use the app without creating a Label
- When a Label is created:
  - Agent is assigned 'Owner' role via `memberships` table
  - Agent remains independent at root level (can still access Personal Inbox)

### 5. PERMISSIONS RE-INDEX ✅
- **Personal View** (`activeOrgId === null`):
  - User has full 'Owner' permissions by default
  - All permission checks return `true` in Personal view
- **Label Workspace** (`activeOrgId` set):
  - Permissions fetched from `memberships` table based on `activeOrgId`
  - Uses `activeMembership.permissions_json` for granular permissions

## Implementation Details

### AppContext Changes (`src/context/AppContext.jsx`)
- **loadTracks()**: 
  - Personal view: Loads tracks where `organization_id IS NULL` AND `recipient_user_id = staffProfile.id`
  - Label workspace: Loads tracks where `organization_id = activeOrgId`
- **addTrack()**: 
  - Personal view: Sets `recipient_user_id` and leaves `organization_id` as NULL
  - Label workspace: Sets `organization_id` from `activeOrgId`
- **voteOnTrack()**: Handles votes in both Personal and Label contexts

### AuthContext Changes (`src/context/AuthContext.jsx`)
- **hasPermission()**: Returns `true` in Personal view (full Owner permissions)
- **Granular permissions** (canVote, canSetEnergy, etc.): All return `true` in Personal view
- **isOwner/isManager/isScout**: `isOwner` is `true` in Personal view
- **loadMemberships()**: Does NOT auto-select organization on login - user starts in Personal view

### Routing Changes (`src/App.jsx`)
- **getDefaultRoute()**: Routes to `/launchpad` if `activeOrgId` is null
- **Protected routes**: Redirect to `/launchpad` if user tries to access Label features without active org

### Sidebar Changes (`src/components/Sidebar.jsx`)
- **Dynamic navigation**: Shows Personal vs Label nav items based on `activeOrgId`
- **Workspace indicator**: Shows "Personal Workspace" vs "Role • Label Name"

## Data Flow

### Personal View (activeOrgId === null)
```
User → Personal Inbox (organization_id IS NULL, recipient_user_id = user_id)
     → Personal Rolodex (artists with organization_id IS NULL)
     → Full Owner permissions
```

### Label Workspace (activeOrgId set)
```
User → Label Tracks (organization_id = activeOrgId)
     → Label Artists (organization_id = activeOrgId)
     → Permissions from memberships table
```

## Testing Checklist

- [ ] New user signup → Should land on `/launchpad` with Personal view
- [ ] Personal Inbox loads correctly (organization_id IS NULL)
- [ ] Create Label → Agent gets Owner role, can switch to Label workspace
- [ ] Switch between Personal and Label workspaces
- [ ] Permissions work correctly in Personal view (full Owner)
- [ ] Permissions work correctly in Label workspace (from memberships)
- [ ] Sidebar shows correct navigation for each context
- [ ] Tracks can be added to Personal Inbox (organization_id stays NULL)
- [ ] Tracks can be added to Label workspace (organization_id set)

## Migration Notes

- No database schema changes required
- Existing users will start in Personal view on next login
- Users with existing memberships can still access Label workspaces
- Personal Inbox tracks are already supported (recipient_user_id field exists)

## Future Enhancements

- Add "Switch Workspace" dropdown in Sidebar
- Add Personal workspace settings
- Add ability to move tracks between Personal and Label workspaces
- Add Personal workspace analytics/metrics
