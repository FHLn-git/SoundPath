-- Add recipient_user_id to tracks table for Personal Inbox feature
-- Run this script in Supabase SQL Editor

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tracks') THEN
    -- Add recipient_user_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'recipient_user_id') THEN
      ALTER TABLE tracks ADD COLUMN recipient_user_id TEXT REFERENCES staff_members(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_tracks_recipient_user_id ON tracks(recipient_user_id);
    END IF;
  END IF;
END $$;
