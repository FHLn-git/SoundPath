-- ============================================================================
-- Contact Form Submissions Schema
-- Internal mail service for contact form submissions
-- ============================================================================

-- Contact form submissions table
CREATE TABLE IF NOT EXISTS contact_form_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied', 'archived')),
  read_at TIMESTAMPTZ,
  read_by TEXT REFERENCES staff_members(id) ON DELETE SET NULL,
  replied_at TIMESTAMPTZ,
  replied_by TEXT REFERENCES staff_members(id) ON DELETE SET NULL,
  reply_message TEXT,
  archived_at TIMESTAMPTZ,
  archived_by TEXT REFERENCES staff_members(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  staff_member_id TEXT REFERENCES staff_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_form_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_form_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_email ON contact_form_submissions(email);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_user_id ON contact_form_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_staff_member_id ON contact_form_submissions(staff_member_id);

-- RLS Policies
ALTER TABLE contact_form_submissions ENABLE ROW LEVEL SECURITY;

-- System admins can view all submissions
CREATE POLICY "System admins can view all contact submissions"
  ON contact_form_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.id::text = auth.uid()::text
      AND staff_members.role = 'SystemAdmin'
    )
  );

-- System admins can update submissions (mark as read, replied, archived)
CREATE POLICY "System admins can update contact submissions"
  ON contact_form_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.id::text = auth.uid()::text
      AND staff_members.role = 'SystemAdmin'
    )
  );

-- Anyone authenticated can insert (submit contact forms)
CREATE POLICY "Authenticated users can submit contact forms"
  ON contact_form_submissions
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contact_submission_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS trigger_update_contact_submission_updated_at ON contact_form_submissions;
CREATE TRIGGER trigger_update_contact_submission_updated_at
  BEFORE UPDATE ON contact_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_submission_updated_at();
