-- ============================================================================
-- Function to Allow Users to Leave a Label
-- ============================================================================
-- This function allows users to deactivate their own membership,
-- effectively leaving the label. This is different from deactivate_membership
-- which only allows Owners to remove others.
-- ============================================================================

CREATE OR REPLACE FUNCTION leave_label(organization_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id TEXT;
  membership_role TEXT;
BEGIN
  -- Get current user's staff ID
  SELECT id INTO current_user_id
  FROM staff_members
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Check if user has an active membership in this organization
  SELECT role INTO membership_role
  FROM memberships
  WHERE user_id = current_user_id
    AND organization_id = organization_id_param
    AND active = true
  LIMIT 1;

  IF membership_role IS NULL THEN
    RAISE EXCEPTION 'You are not a member of this organization';
  END IF;

  -- Prevent Owners from leaving if they are the only Owner
  IF membership_role = 'Owner' THEN
    IF EXISTS (
      SELECT 1 FROM memberships
      WHERE organization_id = organization_id_param
        AND role = 'Owner'
        AND active = true
        AND user_id != current_user_id
    ) THEN
      -- There are other Owners, allow leaving
      NULL;
    ELSE
      -- This is the only Owner, prevent leaving
      RAISE EXCEPTION 'You cannot leave as you are the only Owner. Please transfer ownership or add another Owner first.';
    END IF;
  END IF;

  -- Deactivate the membership
  UPDATE memberships
  SET active = false,
      updated_at = NOW()
  WHERE user_id = current_user_id
    AND organization_id = organization_id_param;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION leave_label(UUID) TO authenticated;
