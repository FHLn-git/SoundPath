-- Migration: Add require_rejection_reason to organizations table
-- Run this script in Supabase SQL Editor to add the rejection reason requirement setting

-- Add require_rejection_reason column to organizations table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organizations' AND column_name = 'require_rejection_reason') THEN
      ALTER TABLE organizations ADD COLUMN require_rejection_reason BOOLEAN DEFAULT true;
      UPDATE organizations SET require_rejection_reason = true WHERE require_rejection_reason IS NULL;
      COMMENT ON COLUMN organizations.require_rejection_reason IS 'Requires staff to provide a reason when rejecting tracks (minimum 5 characters)';
    END IF;
  END IF;
END $$;

-- Add rejection_reason column to tracks table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tracks') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'rejection_reason') THEN
      ALTER TABLE tracks ADD COLUMN rejection_reason TEXT;
      COMMENT ON COLUMN tracks.rejection_reason IS 'Reason provided when track was rejected/archived';
    END IF;
  END IF;
END $$;

-- Add UPDATE policy for organizations (Owners only)
DROP POLICY IF EXISTS "Owners can update their organization" ON organizations;
CREATE POLICY "Owners can update their organization" ON organizations
  FOR UPDATE
  USING (id = get_user_organization_id())
  WITH CHECK (
    id = get_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.organization_id = organizations.id
      AND staff_members.auth_user_id = auth.uid()
      AND staff_members.role = 'Owner'
    )
  );

-- Verify columns were added
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'require_rejection_reason')
    THEN '✅ require_rejection_reason column added to organizations'
    ELSE '❌ require_rejection_reason column NOT found in organizations'
  END as organizations_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracks' AND column_name = 'rejection_reason')
    THEN '✅ rejection_reason column added to tracks'
    ELSE '❌ rejection_reason column NOT found in tracks'
  END as tracks_check;
