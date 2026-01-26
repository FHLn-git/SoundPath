-- Quick fix: Add missing columns to tracks table
-- Run this in Supabase SQL Editor to fix the "column not found" error

-- Add bpm if missing
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tracks' AND column_name = 'bpm') THEN
    ALTER TABLE tracks ADD COLUMN bpm INTEGER DEFAULT 128;
    RAISE NOTICE '✅ Added bpm column';
  ELSE
    RAISE NOTICE 'ℹ️ bpm column already exists';
  END IF;
  
  -- Add energy if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tracks' AND column_name = 'energy') THEN
    ALTER TABLE tracks ADD COLUMN energy INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added energy column';
  ELSE
    RAISE NOTICE 'ℹ️ energy column already exists';
  END IF;
  
  -- Add genre if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tracks' AND column_name = 'genre') THEN
    ALTER TABLE tracks ADD COLUMN genre TEXT;
    RAISE NOTICE '✅ Added genre column';
  ELSE
    RAISE NOTICE 'ℹ️ genre column already exists';
  END IF;
  
  -- Add sc_link if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tracks' AND column_name = 'sc_link') THEN
    ALTER TABLE tracks ADD COLUMN sc_link TEXT;
    RAISE NOTICE '✅ Added sc_link column';
  ELSE
    RAISE NOTICE 'ℹ️ sc_link column already exists';
  END IF;
  
  -- Add votes if missing (calculated by trigger, but column must exist)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tracks' AND column_name = 'votes') THEN
    ALTER TABLE tracks ADD COLUMN votes INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added votes column';
  ELSE
    RAISE NOTICE 'ℹ️ votes column already exists';
  END IF;
  
  RAISE NOTICE '✅ Column check complete!';
END $$;

-- Update genres: Delete old and insert new
DELETE FROM genres;
INSERT INTO genres (name) VALUES
  ('Tech House'),
  ('Deep House'),
  ('Classic House'),
  ('Piano House'),
  ('Progressive House');
