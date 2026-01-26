# Agent Networking & Quad-Inbox Implementation

## Overview
This document describes the comprehensive overhaul of the Launchpad with Agent Networking and a Quad-Inbox System.

## Database Changes

### New Table: `connections`
- Manages Agent-to-Agent relationships
- Fields: `id`, `requester_id`, `recipient_id`, `status` (pending/accepted/rejected/blocked), `created_at`, `updated_at`
- RLS policies ensure users can only view/manage their own connections

### New Fields in `tracks` Table
1. **`source`** (TEXT): Identifies track origin
   - `'public_form'`: Tracks from public submission form
   - `'manual'`: Manually added tracks
   - `'peer_to_peer'`: Tracks sent via network

2. **`is_close_eye`** (BOOLEAN): Flag for Global Close Watch
   - `true`: Track is being closely watched
   - Used to aggregate watched tracks across all labels

3. **`peer_to_peer`** (BOOLEAN): Tags network-sent tracks
   - `true`: Track was sent via Agent Networking
   - Used for tracking Professional Recommendation Velocity in Master Data Sheet

4. **`crate`** (TEXT): Identifies which crate the track belongs to
   - `'submissions'`: Public form submissions
   - `'network'`: Tracks from other agents
   - `'crate_a'`: Custom storage A
   - `'crate_b'`: Custom storage B

5. **`sender_id`** (TEXT): References the agent who sent the track (for network tracks)

### Database Functions
1. **`create_connection_request(recipient_staff_id)`**: Creates a connection request
2. **`accept_connection_request(connection_id)`**: Accepts a pending connection
3. **`send_track_to_peer(track_id, recipient_staff_id)`**: Creates a copy of a track in recipient's Network box

## UI Changes

### 1. Network Search Bar
- Located in the top search row
- Real-time search for agents by name
- Shows agent name and organization
- "Connect" button to send connection requests
- Dropdown with search results

### 2. Quad-Inbox System
The Personal Inbox has been refactored into 4 distinct crates:

#### **SUBMISSIONS** (Portal Icon: Radio)
- Tracks where `source = 'public_form'`
- Public user form submissions
- Can be moved to Crate A, Crate B, or promoted to Label

#### **NETWORK** (Handshake Icon: Users)
- Tracks sent by other connected Agents
- Shows sender information
- Tagged with `peer_to_peer = true` for Master Data tracking
- Can be promoted to Label

#### **CRATE A** (Package Icon)
- Custom storage area for agent organization
- Tracks can be moved here from Submissions
- Can be promoted to Label

#### **CRATE B** (Package2 Icon)
- Second custom storage area
- Tracks can be moved here from Submissions
- Can be promoted to Label

### 3. Global Close Watch Section
- New section above the Quad-Inbox
- Shows all tracks where `is_close_eye = true`
- Aggregates across ALL labels the user has memberships in
- Displays organization name for each track
- Clicking a track switches to that label's workspace
- Amber border styling to indicate "watched" status

### 4. High-Density DAW Aesthetic
- Tight vertical spacing (reduced padding/margins)
- Compact track cards (p-1.5 instead of p-2)
- Smaller text sizes (text-xs, text-sm)
- Icons for visual differentiation:
  - Radio icon for Submissions
  - Users icon for Network
  - Package icons for Crates A & B
  - Eye icon for Global Close Watch
- Reduced gaps between elements (gap-1, gap-2)

### 5. Send to Peer Functionality
- "Send to Peer" button appears on hover for tracks (except Network crate)
- Opens modal showing all connected agents
- Creates a copy of the track in recipient's Network box
- Tracks are tagged with `peer_to_peer = true` for Master Data tracking

### 6. Promote to Label
- Works seamlessly from all 4 crates
- Same functionality as before, but now available from any crate
- Updates all crates after promotion

## Migration Instructions

1. **Run the database migration:**
   ```sql
   -- Execute agent-networking-schema.sql in Supabase SQL Editor
   ```

2. **Update existing tracks:**
   - Existing tracks with `recipient_user_id` and `organization_id IS NULL` will be set to `source = 'public_form'` and `crate = 'submissions'`
   - Other tracks will default to `source = 'manual'`

3. **Test the features:**
   - Search for agents in Network search
   - Send connection requests
   - Accept connections
   - Send tracks to peers
   - Move tracks between crates
   - Promote tracks from any crate to labels
   - View Global Close Watch (requires tracks with `is_close_eye = true`)

## Master Data Integration

Tracks sent via "Send to Peer" are automatically tagged with:
- `peer_to_peer = true`
- `source = 'peer_to_peer'`
- `crate = 'network'`
- `sender_id` = ID of sending agent

This enables tracking of **Professional Recommendation Velocity** - the rate at which agents recommend tracks to each other, which is a key metric for the Master Data Sheet.

## Notes

- The Network search uses a 300ms debounce for performance
- Connection requests require acceptance before tracks can be sent
- Global Close Watch only shows tracks from labels where the user has active memberships
- All crates support the same "Promote to Label" functionality
- The UI maintains backward compatibility with the existing `personalInboxTracks` state
