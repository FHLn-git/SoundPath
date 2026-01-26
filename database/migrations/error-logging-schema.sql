-- Error Logging System for SoundPath
-- Stores application errors for admin review

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_component TEXT,
  error_url TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  staff_member_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_agent TEXT,
  browser_info JSONB,
  error_context JSONB, -- Additional context like props, state, etc.
  severity TEXT DEFAULT 'error' CHECK (severity IN ('error', 'warning', 'info')),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  resolved_note TEXT,
  occurrence_count INTEGER DEFAULT 1, -- How many times this error occurred
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_organization_id ON error_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_last_seen_at ON error_logs(last_seen_at DESC);

-- Function to get error summary stats
CREATE OR REPLACE FUNCTION get_error_stats()
RETURNS TABLE (
  total_errors BIGINT,
  unresolved_errors BIGINT,
  errors_last_24h BIGINT,
  errors_last_7d BIGINT,
  most_common_error TEXT,
  error_rate_trend JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_errors,
    COUNT(*) FILTER (WHERE resolved = false)::BIGINT as unresolved_errors,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::BIGINT as errors_last_24h,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::BIGINT as errors_last_7d,
    (SELECT error_message FROM error_logs WHERE resolved = false GROUP BY error_message ORDER BY COUNT(*) DESC LIMIT 1) as most_common_error,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', date_trunc('day', created_at),
          'count', COUNT(*)
        )
      )
      FROM error_logs
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY date_trunc('day', created_at)
      ORDER BY date_trunc('day', created_at)
    ) as error_rate_trend;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- SystemAdmin can see all errors
CREATE POLICY "SystemAdmin can view all errors"
  ON error_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE id = (SELECT id FROM staff_members WHERE auth_user_id = auth.uid() LIMIT 1)
      AND role = 'SystemAdmin'
    )
  );

-- SystemAdmin can update errors (mark as resolved)
CREATE POLICY "SystemAdmin can update errors"
  ON error_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE id = (SELECT id FROM staff_members WHERE auth_user_id = auth.uid() LIMIT 1)
      AND role = 'SystemAdmin'
    )
  );

-- Anyone can insert errors (for error logging)
CREATE POLICY "Anyone can log errors"
  ON error_logs FOR INSERT
  WITH CHECK (true);

-- Function to log an error (can be called from frontend)
CREATE OR REPLACE FUNCTION log_error(
  p_error_message TEXT,
  p_error_stack TEXT DEFAULT NULL,
  p_error_component TEXT DEFAULT NULL,
  p_error_url TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_staff_member_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_browser_info JSONB DEFAULT NULL,
  p_error_context JSONB DEFAULT NULL,
  p_severity TEXT DEFAULT 'error'
)
RETURNS UUID AS $$
DECLARE
  v_error_id UUID;
  v_existing_id UUID;
BEGIN
  -- Check if similar error exists (same message, unresolved, within last hour)
  SELECT id INTO v_existing_id
  FROM error_logs
  WHERE error_message = p_error_message
    AND resolved = false
    AND created_at > NOW() - INTERVAL '1 hour'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing error: increment count and update last_seen_at
    UPDATE error_logs
    SET
      occurrence_count = occurrence_count + 1,
      last_seen_at = NOW(),
      error_context = COALESCE(p_error_context, error_context),
      browser_info = COALESCE(p_browser_info, browser_info)
    WHERE id = v_existing_id;
    
    RETURN v_existing_id;
  ELSE
    -- Insert new error
    INSERT INTO error_logs (
      error_message,
      error_stack,
      error_component,
      error_url,
      user_id,
      staff_member_id,
      organization_id,
      user_agent,
      browser_info,
      error_context,
      severity
    ) VALUES (
      p_error_message,
      p_error_stack,
      p_error_component,
      p_error_url,
      p_user_id,
      p_staff_member_id,
      p_organization_id,
      p_user_agent,
      p_browser_info,
      p_error_context,
      p_severity
    )
    RETURNING id INTO v_error_id;
    
    RETURN v_error_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
