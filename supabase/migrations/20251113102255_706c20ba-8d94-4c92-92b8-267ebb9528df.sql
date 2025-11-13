-- Create platform fee alert rules table
CREATE TABLE IF NOT EXISTS platform_fee_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
  metric TEXT NOT NULL CHECK (metric IN ('total_revenue', 'booking_revenue', 'qr_revenue', 'tenant_revenue')),
  threshold_type TEXT NOT NULL CHECK (threshold_type IN ('absolute', 'percentage_drop')),
  threshold_value NUMERIC NOT NULL,
  comparison_period TEXT CHECK (comparison_period IN ('previous_day', 'previous_week', 'previous_month', 'same_period_last_month')),
  tenant_id UUID REFERENCES tenants(id),
  active BOOLEAN NOT NULL DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create platform fee alerts table
CREATE TABLE IF NOT EXISTS platform_fee_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES platform_fee_alert_rules(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('threshold_breach', 'unusual_pattern', 'zero_revenue')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  current_value NUMERIC NOT NULL,
  expected_value NUMERIC,
  threshold_value NUMERIC,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  tenant_id UUID REFERENCES tenants(id),
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_platform_fee_alert_rules_active ON platform_fee_alert_rules(active);
CREATE INDEX idx_platform_fee_alert_rules_period ON platform_fee_alert_rules(period);
CREATE INDEX idx_platform_fee_alerts_acknowledged ON platform_fee_alerts(acknowledged);
CREATE INDEX idx_platform_fee_alerts_created_at ON platform_fee_alerts(created_at DESC);
CREATE INDEX idx_platform_fee_alerts_severity ON platform_fee_alerts(severity);
CREATE INDEX idx_platform_fee_alerts_tenant_id ON platform_fee_alerts(tenant_id);

-- RLS Policies
ALTER TABLE platform_fee_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_fee_alerts ENABLE ROW LEVEL SECURITY;

-- Platform admins can manage all alert rules
CREATE POLICY "Platform admins can manage alert rules"
  ON platform_fee_alert_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'support_admin')
    )
  );

-- Platform admins can view all alerts
CREATE POLICY "Platform admins can view all alerts"
  ON platform_fee_alerts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'support_admin')
    )
  );

-- Platform admins can acknowledge alerts
CREATE POLICY "Platform admins can acknowledge alerts"
  ON platform_fee_alerts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'support_admin')
    )
  );

-- Tenants can view their own alerts
CREATE POLICY "Tenants can view their own alerts"
  ON platform_fee_alerts
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_platform_fee_alert_rules_updated_at
  BEFORE UPDATE ON platform_fee_alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default alert rules
INSERT INTO platform_fee_alert_rules (name, description, period, metric, threshold_type, threshold_value, comparison_period, active)
VALUES 
  ('Daily Revenue Drop', 'Alert when daily revenue drops by 50% or more', 'daily', 'total_revenue', 'percentage_drop', 50, 'previous_day', true),
  ('Weekly Revenue Drop', 'Alert when weekly revenue drops by 30% or more', 'weekly', 'total_revenue', 'percentage_drop', 30, 'previous_week', true),
  ('Monthly Revenue Drop', 'Alert when monthly revenue drops by 20% or more', 'monthly', 'total_revenue', 'percentage_drop', 20, 'previous_month', true),
  ('Zero Daily Revenue', 'Alert when no revenue collected in a day', 'daily', 'total_revenue', 'absolute', 0, NULL, true)
ON CONFLICT DO NOTHING;