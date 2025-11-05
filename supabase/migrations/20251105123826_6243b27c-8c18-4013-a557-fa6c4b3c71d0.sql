-- Create platform_usage_records table
CREATE TABLE IF NOT EXISTS platform_usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('sms_sent', 'storage_used', 'api_calls', 'users_active', 'bookings_created')),
  quantity INTEGER NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create platform_usage_aggregates table
CREATE TABLE IF NOT EXISTS platform_usage_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  metric_type TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  record_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, metric_type, period_start)
);

-- Create platform_invoices table
CREATE TABLE IF NOT EXISTS platform_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  base_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  overage_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  line_items JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_usage_records_tenant ON platform_usage_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_period ON platform_usage_records(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_usage_aggregates_tenant ON platform_usage_aggregates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON platform_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON platform_invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_period ON platform_invoices(period_start, period_end);

-- Triggers for updated_at
CREATE TRIGGER update_usage_aggregates_updated_at
  BEFORE UPDATE ON platform_usage_aggregates
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_updated_at();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON platform_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_updated_at();

-- Enable RLS
ALTER TABLE platform_usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_usage_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_invoices ENABLE ROW LEVEL SECURITY;

-- Platform admins can manage all billing data
CREATE POLICY "Platform admins manage usage records"
  ON platform_usage_records
  FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins manage usage aggregates"
  ON platform_usage_aggregates
  FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins manage invoices"
  ON platform_invoices
  FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()));

-- Tenants can view their own usage and invoices
CREATE POLICY "Tenants view usage aggregates"
  ON platform_usage_aggregates
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Tenants view invoices"
  ON platform_invoices
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid())
  );