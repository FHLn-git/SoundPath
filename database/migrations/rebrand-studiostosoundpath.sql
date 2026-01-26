-- Migration: Rebrand StudioOS to SoundPath
-- This updates any existing data in the database that references StudioOS
-- Run this after deploying the code changes

-- ============================================================================
-- UPDATE EXISTING TRACKS
-- ============================================================================
-- Update any tracks that have 'StudioOS' as the artist_name
UPDATE tracks 
SET artist_name = 'SoundPath'
WHERE artist_name = 'StudioOS';

-- ============================================================================
-- UPDATE EMAIL QUEUE (if you have an email queue table)
-- ============================================================================
-- Update any queued emails that reference StudioOS in subject or body
-- Note: Adjust table/column names based on your email queue structure
-- Example (uncomment if you have an email_queue table):
-- UPDATE email_queue 
-- SET subject = REPLACE(subject, 'StudioOS', 'SoundPath'),
--     html_body = REPLACE(html_body, 'StudioOS', 'SoundPath'),
--     text_body = REPLACE(text_body, 'StudioOS', 'SoundPath')
-- WHERE subject LIKE '%StudioOS%' 
--    OR html_body LIKE '%StudioOS%' 
--    OR text_body LIKE '%StudioOS%';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to check if there are any remaining StudioOS references:

-- Check tracks
-- SELECT COUNT(*) as tracks_with_studiostosoundpath 
-- FROM tracks 
-- WHERE artist_name = 'StudioOS';

-- Check for any other potential references (adjust based on your schema)
-- SELECT 'tracks' as table_name, COUNT(*) as count
-- FROM tracks 
-- WHERE artist_name ILIKE '%StudioOS%'
-- UNION ALL
-- SELECT 'organizations', COUNT(*)
-- FROM organizations
-- WHERE name ILIKE '%StudioOS%'
--   OR slug ILIKE '%studioos%';

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. This migration updates existing data only
-- 2. New organizations created after this migration will use 'SoundPath' 
--    (handled by the updated onboarding-schema.sql trigger)
-- 3. If you have custom fields or tables that reference StudioOS, 
--    add UPDATE statements for those as well
-- 4. Consider updating any cached data or search indexes after running this
