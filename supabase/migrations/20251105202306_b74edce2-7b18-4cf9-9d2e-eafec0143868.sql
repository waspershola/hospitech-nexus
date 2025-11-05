-- Drop and recreate platform plans table properly
DROP TABLE IF EXISTS tenant_subscriptions CASCADE;
DROP TABLE IF EXISTS platform_plans CASCADE;

-- Create platform plans table
CREATE TABLE platform_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_monthly DECIMAL(10, 2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10, 2) NOT NULL DEFAULT 0,
  trial_days INTEGER DEFAULT 14,
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tenant subscriptions table
CREATE TABLE tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES platform_plans(id),
  status TEXT NOT NULL DEFAULT 'trial',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Add check constraints
ALTER TABLE tenant_subscriptions
  ADD CONSTRAINT check_subscription_status
  CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'expired'));

ALTER TABLE tenant_subscriptions
  ADD CONSTRAINT check_billing_cycle
  CHECK (billing_cycle IN ('monthly', 'yearly'));

-- Create indexes
CREATE INDEX idx_plans_slug ON platform_plans(slug);
CREATE INDEX idx_plans_active ON platform_plans(is_active);
CREATE INDEX idx_subscriptions_tenant ON tenant_subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_plan ON tenant_subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON tenant_subscriptions(status);

-- Add RLS policies for platform plans
ALTER TABLE platform_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage all plans"
  ON platform_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'marketplace_admin')
    )
  );

CREATE POLICY "Everyone can view active public plans"
  ON platform_plans FOR SELECT
  TO authenticated
  USING (is_active = true AND is_public = true);

-- Add RLS policies for tenant subscriptions
ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage all subscriptions"
  ON tenant_subscriptions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'billing_bot')
    )
  );

CREATE POLICY "Tenants can view their own subscription"
  ON tenant_subscriptions FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Add triggers for updated_at
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON platform_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_updated_at();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON tenant_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_updated_at();

-- Insert default plans
INSERT INTO platform_plans (name, slug, description, price_monthly, price_yearly, features, limits) VALUES
(
  'Starter',
  'starter',
  'Perfect for small hotels getting started',
  2500,
  25000,
  '{"custom_branding": false, "advanced_reports": false, "api_access": false, "priority_support": false}'::jsonb,
  '{"sms_monthly": 100, "users": 5, "rooms": 20, "storage_gb": 5}'::jsonb
),
(
  'Professional',
  'professional',
  'For growing hotels with advanced needs',
  7500,
  75000,
  '{"custom_branding": true, "advanced_reports": true, "api_access": false, "priority_support": true}'::jsonb,
  '{"sms_monthly": 500, "users": 20, "rooms": 100, "storage_gb": 50}'::jsonb
),
(
  'Enterprise',
  'enterprise',
  'For large hotels requiring full customization',
  15000,
  150000,
  '{"custom_branding": true, "advanced_reports": true, "api_access": true, "priority_support": true}'::jsonb,
  '{"sms_monthly": 2000, "users": -1, "rooms": -1, "storage_gb": 200}'::jsonb
);