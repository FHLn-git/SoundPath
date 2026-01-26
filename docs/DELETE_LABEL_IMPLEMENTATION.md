# Delete Label Implementation

## Overview

Implemented a three-layer confirmation system for label owners to delete their labels, with automatic metrics archiving before deletion.

## Three Confirmation Layers

### Layer 1: "Are you sure?"
- Simple yes/no confirmation
- Yellow warning styling
- Basic warning message

### Layer 2: Slider Confirmation
- Interactive slider (0-100%)
- Must slide all the way to 100% to continue
- Shows percentage as user slides
- Orange warning styling
- Detailed list of what will be deleted

### Layer 3: Text Confirmation
- Must type exactly: "I want to delete my record label and all of its information."
- Real-time validation (shows error if text doesn't match)
- Green checkmark when text matches
- Red final warning styling
- Final delete button only enabled when text matches exactly

## Metrics Archiving

Before deletion, all metrics and statistics are automatically archived to `archived_organization_metrics` table:

- **Organization Data**: Name, ID, deletion timestamp, who deleted it
- **Counts**: Total tracks, artists, staff, submissions
- **Subscription Info**: Plan, status, dates, revenue
- **Usage Metrics**: Tracks count, staff count, storage, API calls
- **Company Health**: Health score, daily demos, fatigued staff count
- **Staff Metrics**: JSONB snapshot of all staff member metrics

## Database Schema

Run `archive-metrics-schema.sql` in Supabase SQL Editor to create:
- `archived_organization_metrics` table
- `archive_organization_metrics()` function
- RLS policies (SystemAdmin only access)

## Implementation Details

### State Management
- `leaveLabelStep`: 1, 2, or 3 (which confirmation step)
- `sliderValue`: 0-100 (slider position)
- `deleteConfirmText`: User's typed confirmation text

### Delete Process
1. Archive metrics using `archive_organization_metrics()` function
2. Delete organization (cascades to related data)
3. Switch user to personal view
4. Reload application

### Error Handling
- If archiving fails, shows warning but continues with deletion
- If deletion fails, shows error and keeps modal open
- All state resets on cancel or error

## Files Modified

- `src/pages/StaffAdmin.jsx` - Added 3-step confirmation modal
- `src/index.css` - Added slider styling
- `archive-metrics-schema.sql` - New file for metrics archiving

## Usage

1. Owner clicks "Delete Label" button in settings
2. Step 1: Click "Yes, Continue" to proceed
3. Step 2: Slide slider to 100%, then click "Continue"
4. Step 3: Type exact confirmation text, then click "Yes, Delete Label"
5. Metrics are archived, organization is deleted, user is redirected

## Security

- Only owners can see "Delete Label" button
- Non-owners still see "Leave Label" (unchanged behavior)
- Metrics archive is protected by RLS (SystemAdmin only)
- All confirmations must be completed in order
