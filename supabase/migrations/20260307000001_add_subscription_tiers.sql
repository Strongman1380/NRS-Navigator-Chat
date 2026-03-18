-- Add subscription tier fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'free'
    CHECK (subscription_status IN ('free', 'trial', 'premium', 'fee_waiver')),
  ADD COLUMN IF NOT EXISTS trial_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS fee_waiver_approved boolean DEFAULT false;

-- Subscriptions table (managed by Stripe webhooks)
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  status text NOT NULL DEFAULT 'inactive'
    CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'inactive')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Service role manages subscriptions (via Stripe webhook)
CREATE POLICY "Service role manages subscriptions" ON subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Fee waivers table
CREATE TABLE IF NOT EXISTS fee_waivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'denied')),
  reason text,
  applied_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_fee_waivers_user ON fee_waivers(user_id);
ALTER TABLE fee_waivers ENABLE ROW LEVEL SECURITY;

-- Users can view their own fee waiver applications
CREATE POLICY "Users can view own fee waiver" ON fee_waivers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Users can apply for a fee waiver
CREATE POLICY "Users can apply for fee waiver" ON fee_waivers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admins can manage all fee waivers
CREATE POLICY "Admins can manage fee waivers" ON fee_waivers
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
