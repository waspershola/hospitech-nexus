-- Create tenant_sms_credits table to track SMS credit balances
CREATE TABLE IF NOT EXISTS tenant_sms_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  credits_available INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  total_purchased INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_tenant_credits UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE tenant_sms_credits ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can view their own credits
CREATE POLICY "Tenants can view own credits"
  ON tenant_sms_credits
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Policy: Platform admins can view all credits
CREATE POLICY "Platform admins can view all credits"
  ON tenant_sms_credits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'support_admin', 'billing_bot')
    )
  );

-- Policy: System can insert/update credits (through service role)
CREATE POLICY "Service role can manage credits"
  ON tenant_sms_credits
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Create index for faster lookups
CREATE INDEX idx_tenant_sms_credits_tenant ON tenant_sms_credits(tenant_id);

-- Trigger to update updated_at
CREATE TRIGGER update_tenant_sms_credits_updated_at
  BEFORE UPDATE ON tenant_sms_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();