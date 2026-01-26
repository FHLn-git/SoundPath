-- Find Orphaned User Data After Auth User Deletion
-- Use this to check if any data was left behind after deleting from auth.users

-- ============================================================================
-- CHECK FOR ORPHANED STAFF_MEMBERS
-- ============================================================================
-- If you deleted auth.users but staff_members still exists, this will find them
SELECT 
  sm.id as staff_id,
  sm.name,
  sm.role,
  sm.auth_user_id,
  sm.created_at,
  'Orphaned staff_members record (auth_user_id points to deleted user)' as issue
FROM staff_members sm
WHERE sm.auth_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = sm.auth_user_id
  );

-- ============================================================================
-- CHECK FOR ORPHANED MEMBERSHIPS
-- ============================================================================
-- Memberships that reference deleted staff_members
SELECT 
  m.id as membership_id,
  m.user_id as staff_id,
  m.organization_id,
  o.name as organization_name,
  m.role,
  m.active,
  'Orphaned membership (references deleted staff_member)' as issue
FROM memberships m
LEFT JOIN organizations o ON o.id = m.organization_id
WHERE NOT EXISTS (
  SELECT 1 FROM staff_members sm WHERE sm.id = m.user_id
);

-- ============================================================================
-- CHECK FOR ORPHANED VOTES
-- ============================================================================
-- Votes that reference deleted staff_members
SELECT 
  v.id as vote_id,
  v.staff_id,
  v.track_id,
  t.title as track_title,
  v.vote_type,
  v.created_at,
  'Orphaned vote (references deleted staff_member)' as issue
FROM votes v
LEFT JOIN tracks t ON t.id = v.track_id
WHERE NOT EXISTS (
  SELECT 1 FROM staff_members sm WHERE sm.id = v.staff_id
);

-- ============================================================================
-- CHECK FOR TRACKS WITH ORPHANED REFERENCES
-- ============================================================================
-- Tracks where sender_id or recipient_user_id points to deleted staff_member
SELECT 
  t.id as track_id,
  t.title,
  t.sender_id,
  t.recipient_user_id,
  CASE 
    WHEN t.sender_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM staff_members WHERE id = t.sender_id) 
      THEN 'sender_id points to deleted staff_member'
    WHEN t.recipient_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM staff_members WHERE id = t.recipient_user_id)
      THEN 'recipient_user_id points to deleted staff_member'
    ELSE 'Both references are orphaned'
  END as issue
FROM tracks t
WHERE (t.sender_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM staff_members WHERE id = t.sender_id))
   OR (t.recipient_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM staff_members WHERE id = t.recipient_user_id));

-- ============================================================================
-- CLEANUP: Delete Orphaned Data (Run only if you want to clean up)
-- ============================================================================

-- Delete orphaned staff_members (if any exist)
-- DELETE FROM staff_members 
-- WHERE auth_user_id IS NOT NULL
--   AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth_user_id);

-- Delete orphaned memberships
-- DELETE FROM memberships 
-- WHERE NOT EXISTS (SELECT 1 FROM staff_members WHERE id = memberships.user_id);

-- Delete orphaned votes
-- DELETE FROM votes 
-- WHERE NOT EXISTS (SELECT 1 FROM staff_members WHERE id = votes.staff_id);

-- Set orphaned track references to NULL (preserves tracks, just removes user references)
-- UPDATE tracks 
-- SET sender_id = NULL 
-- WHERE sender_id IS NOT NULL 
--   AND NOT EXISTS (SELECT 1 FROM staff_members WHERE id = sender_id);

-- UPDATE tracks 
-- SET recipient_user_id = NULL 
-- WHERE recipient_user_id IS NOT NULL 
--   AND NOT EXISTS (SELECT 1 FROM staff_members WHERE id = recipient_user_id);
