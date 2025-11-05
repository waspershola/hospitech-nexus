-- Drop existing table if needed
DROP TABLE IF EXISTS platform_plans CASCADE;

-- Create platform_plans table
CREATE TABLE platform_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  limits JSONB DEFAULT '{}',
  overage_rates JSONB DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  trial_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index
CREATE INDEX idx_plans_active ON platform_plans(is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON platform_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_updated_at();

-- Enable RLS
ALTER TABLE platform_plans ENABLE ROW LEVEL SECURITY;

-- Platform admins can manage all plans
CREATE POLICY "Platform admins manage plans"
  ON platform_plans
  FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()));

-- Everyone can view active plans
CREATE POLICY "View active plans"
  ON platform_plans
  FOR SELECT
  TO authenticated
  USING (is_active = true);