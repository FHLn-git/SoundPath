-- Add Stripe subscription tracking to personal tiers (staff_members)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_members') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'staff_members' AND column_name = 'subscription_id'
    ) THEN
      ALTER TABLE staff_members ADD COLUMN subscription_id TEXT;
      COMMENT ON COLUMN staff_members.subscription_id IS 'Stripe subscription id for personal (non-organization) tier billing';
      CREATE INDEX IF NOT EXISTS idx_staff_members_subscription_id ON staff_members(subscription_id);
    END IF;
  END IF;
END $$;

