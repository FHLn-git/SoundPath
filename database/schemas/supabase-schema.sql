-- SoundPath Database Schema
-- Safe, non-destructive schema that can be run multiple times
-- Run this script in your Supabase SQL Editor to create the required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Artists table
CREATE TABLE IF NOT EXISTS artists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  bio TEXT,
  primary_genre TEXT,
  profitability_score NUMERIC(5, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Genres table
CREATE TABLE IF NOT EXISTS genres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  avg_performance NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracks table
CREATE TABLE IF NOT EXISTS tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES artists(id) ON DELETE SET NULL,
  artist_name TEXT NOT NULL,
  title TEXT NOT NULL,
  sc_link TEXT,
  genre TEXT,
  bpm INTEGER DEFAULT 128,
  energy INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'inbox',
  "column" TEXT NOT NULL DEFAULT 'inbox',
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  moved_to_second_listen TIMESTAMPTZ,
  target_release_date DATE,
  release_date DATE,
  contract_signed BOOLEAN DEFAULT FALSE,
  total_earnings NUMERIC(10, 2) DEFAULT 0,
  watched BOOLEAN DEFAULT FALSE,
  archived BOOLEAN DEFAULT FALSE,
  spotify_plays INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to tracks table if they don't exist (for existing tables)
DO $$ 
BEGIN
  -- Only run if tracks table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tracks') THEN
    -- Add artist_name if missing (add as nullable first, then update and set NOT NULL)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'artist_name') THEN
      ALTER TABLE tracks ADD COLUMN artist_name TEXT;
      UPDATE tracks SET artist_name = '' WHERE artist_name IS NULL;
      ALTER TABLE tracks ALTER COLUMN artist_name SET NOT NULL;
      ALTER TABLE tracks ALTER COLUMN artist_name SET DEFAULT '';
    END IF;
  
    -- Add status if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'status') THEN
      ALTER TABLE tracks ADD COLUMN status TEXT;
      UPDATE tracks SET status = COALESCE("column", 'inbox') WHERE status IS NULL;
      ALTER TABLE tracks ALTER COLUMN status SET NOT NULL;
      ALTER TABLE tracks ALTER COLUMN status SET DEFAULT 'inbox';
    END IF;
    
    -- Add column (quoted) if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'column') THEN
      ALTER TABLE tracks ADD COLUMN "column" TEXT;
      UPDATE tracks SET "column" = COALESCE(status, 'inbox') WHERE "column" IS NULL;
      ALTER TABLE tracks ALTER COLUMN "column" SET NOT NULL;
      ALTER TABLE tracks ALTER COLUMN "column" SET DEFAULT 'inbox';
    END IF;
    
    -- Add other columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'moved_to_second_listen') THEN
      ALTER TABLE tracks ADD COLUMN moved_to_second_listen TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'target_release_date') THEN
      ALTER TABLE tracks ADD COLUMN target_release_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'release_date') THEN
      ALTER TABLE tracks ADD COLUMN release_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'contract_signed') THEN
      ALTER TABLE tracks ADD COLUMN contract_signed BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'total_earnings') THEN
      ALTER TABLE tracks ADD COLUMN total_earnings NUMERIC(10, 2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'watched') THEN
      ALTER TABLE tracks ADD COLUMN watched BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'archived') THEN
      ALTER TABLE tracks ADD COLUMN archived BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'spotify_plays') THEN
      ALTER TABLE tracks ADD COLUMN spotify_plays INTEGER DEFAULT 0;
    END IF;
    
    -- Add bpm if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'bpm') THEN
      ALTER TABLE tracks ADD COLUMN bpm INTEGER DEFAULT 128;
    END IF;
    
    -- Add energy if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'energy') THEN
      ALTER TABLE tracks ADD COLUMN energy INTEGER DEFAULT 0;
    END IF;
    
    -- Add genre if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'genre') THEN
      ALTER TABLE tracks ADD COLUMN genre TEXT;
    END IF;
    
    -- Add sc_link if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'sc_link') THEN
      ALTER TABLE tracks ADD COLUMN sc_link TEXT;
    END IF;
    
    -- Add votes if missing (calculated by trigger, but column must exist)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'votes') THEN
      ALTER TABLE tracks ADD COLUMN votes INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'updated_at') THEN
      ALTER TABLE tracks ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Update existing rows to set status from column if status is null
    UPDATE tracks SET status = COALESCE(status, "column", 'inbox') WHERE status IS NULL;
    UPDATE tracks SET "column" = COALESCE("column", status, 'inbox') WHERE "column" IS NULL;
  END IF;
END $$;

-- Votes table (normalized voting system)
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  staff_id TEXT NOT NULL,
  vote_type INTEGER NOT NULL CHECK (vote_type IN (-1, 1)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(track_id, staff_id)
);

-- Staff members table
CREATE TABLE IF NOT EXISTS staff_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance (safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_tracks_status ON tracks(status);
CREATE INDEX IF NOT EXISTS idx_tracks_artist_id ON tracks(artist_id);
CREATE INDEX IF NOT EXISTS idx_tracks_artist_name ON tracks(artist_name);
CREATE INDEX IF NOT EXISTS idx_tracks_release_date ON tracks(release_date);
CREATE INDEX IF NOT EXISTS idx_votes_track_id ON votes(track_id);
CREATE INDEX IF NOT EXISTS idx_votes_staff_id ON votes(staff_id);

-- Function to update tracks.updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists, then recreate (safe)
DROP TRIGGER IF EXISTS update_tracks_updated_at ON tracks;
CREATE TRIGGER update_tracks_updated_at 
  BEFORE UPDATE ON tracks
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function to recalculate track votes when a vote is added/updated/deleted
CREATE OR REPLACE FUNCTION recalculate_track_votes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tracks
  SET votes = (
    SELECT COALESCE(SUM(vote_type), 0)
    FROM votes
    WHERE track_id = COALESCE(NEW.track_id, OLD.track_id)
  )
  WHERE id = COALESCE(NEW.track_id, OLD.track_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Drop trigger if exists, then recreate (safe)
DROP TRIGGER IF EXISTS recalculate_votes_on_vote_change ON votes;
CREATE TRIGGER recalculate_votes_on_vote_change
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW 
  EXECUTE FUNCTION recalculate_track_votes();

-- Delete old genres and insert new ones
DELETE FROM genres;
INSERT INTO genres (name) VALUES
  ('Tech House'),
  ('Deep House'),
  ('Classic House'),
  ('Piano House'),
  ('Progressive House');

-- Insert default staff members (safe to run multiple times)
INSERT INTO staff_members (id, name, role) VALUES
  ('staff1', 'Sin Morera', 'Label Owner'),
  ('staff2', 'Ethan Berdofe', 'A&R Manager'),
  ('staff3', 'Lex Luca', 'A&R Scout')
ON CONFLICT (id) DO NOTHING;
