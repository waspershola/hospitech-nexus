-- Drop existing tables if they exist to recreate properly
DROP TABLE IF EXISTS platform_usage_records CASCADE;
DROP TABLE IF EXISTS platform_invoices CASCADE;

-- Create platform usage records table
CREATE TABLE platform_usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  usage_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, usage_type, period_start)
);

-- Add check constraint for usage type
ALTER TABLE platform_usage_records 
  ADD CONSTRAINT check_usage_type 
  CHECK (usage_type IN ('sms', 'storage', 'api_calls', 'users'));

-- Create platform invoices table
CREATE TABLE platform_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  due_date TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add check constraint for invoice status
ALTER TABLE platform_invoices
  ADD CONSTRAINT check_invoice_status
  CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled'));

-- Create indexes for better query performance
CREATE INDEX idx_usage_records_tenant_period ON platform_usage_records(tenant_id, period_start, period_end);
CREATE INDEX idx_usage_records_type ON platform_usage_records(usage_type);
CREATE INDEX idx_invoices_tenant ON platform_invoices(tenant_id);
CREATE INDEX idx_invoices_status ON platform_invoices(status);
CREATE INDEX idx_invoices_due_date ON platform_invoices(due_date);

-- Add RLS policies for platform usage records
ALTER TABLE platform_usage_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view all usage records"
  ON platform_usage_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'billing_bot', 'support_admin')
    )
  );

CREATE POLICY "Tenants can view their own usage records"
  ON platform_usage_records FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Add RLS policies for platform invoices
ALTER TABLE platform_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage all invoices"
  ON platform_invoices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'billing_bot', 'support_admin')
    )
  );

CREATE POLICY "Tenants can view their own invoices"
  ON platform_invoices FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Add triggers for updated_at
CREATE TRIGGER update_usage_records_updated_at
  BEFORE UPDATE ON platform_usage_records
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_updated_at();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON platform_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_updated_at();

-- Schedule monthly billing cycle to run on the 1st of each month at 2 AM
SELECT cron.schedule(
  'monthly-billing-cycle',
  '0 2 1 * *',
  $$
  SELECT
    net.http_post(
        url:='https://akchmpmzcupzjaeewdui.supabase.co/functions/v1/platform-billing-cycle',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrY2htcG16Y3VwemphZWV3ZHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NTg0MTMsImV4cCI6MjA3NzIzNDQxM30.BqjNXhwKlNAAjRT0b7c86fkPe2htu19duz25kuCtEg4"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);