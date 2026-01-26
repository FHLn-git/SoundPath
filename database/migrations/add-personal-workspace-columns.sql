-- Add columns for Personal Workspace Pitched and Signed features
-- Run this script in your Supabase SQL Editor

DO $$
BEGIN
  -- Only run if tracks table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tracks') THEN
    
    -- Add pitched_at column (timestamp when track was pitched)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'pitched_at') THEN
      ALTER TABLE tracks ADD COLUMN pitched_at TIMESTAMPTZ;
      CREATE INDEX IF NOT EXISTS idx_tracks_pitched_at ON tracks(pitched_at);
    END IF;
    
    -- Add pitched_to column (label or person the track was pitched to)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'pitched_to') THEN
      ALTER TABLE tracks ADD COLUMN pitched_to TEXT;
    END IF;
    
    -- Add signing_label column (label that signed the track)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'signing_label') THEN
      ALTER TABLE tracks ADD COLUMN signing_label TEXT;
    END IF;
    
    -- Add crate column if it doesn't exist (for tracking track status: submissions, network, crate_a, crate_b, pitched, signed)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'crate') THEN
      ALTER TABLE tracks ADD COLUMN crate TEXT DEFAULT 'submissions';
    END IF;
    
    -- Create index on crate for faster filtering
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tracks_crate') THEN
      CREATE INDEX idx_tracks_crate ON tracks(crate);
    END IF;
    
    -- Create index on recipient_user_id and organization_id for faster personal workspace queries
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tracks_personal_workspace') THEN
      CREATE INDEX idx_tracks_personal_workspace ON tracks(recipient_user_id, organization_id) WHERE organization_id IS NULL;
    END IF;
    
  END IF;
END $$;
