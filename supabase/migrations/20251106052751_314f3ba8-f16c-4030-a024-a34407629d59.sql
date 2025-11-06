-- Create platform usage records table for tracking tenant usage
CREATE TABLE IF NOT EXISTS platform_usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES platform_plans(id) ON DELETE SET NULL,
  usage_type TEXT NOT NULL CHECK (usage_type IN ('sms_sent', 'storage_used', 'api_calls', 'users_active', 'bookings_created')),
  quantity NUMERIC NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  cost NUMERIC DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create platform invoices table
CREATE TABLE IF NOT EXISTS platform_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  overage_charges NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  due_date TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_usage_records_tenant ON platform_usage_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_period ON platform_usage_records(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_usage_records_type ON platform_usage_records(usage_type);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON platform_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON platform_invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_period ON platform_invoices(period_start, period_end);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_platform_usage_records_updated_at ON platform_usage_records;
CREATE TRIGGER update_platform_usage_records_updated_at
  BEFORE UPDATE ON platform_usage_records
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_updated_at();

DROP TRIGGER IF EXISTS update_platform_invoices_updated_at ON platform_invoices;
CREATE TRIGGER update_platform_invoices_updated_at
  BEFORE UPDATE ON platform_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_updated_at();

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  year TEXT;
  month TEXT;
  sequence_num INTEGER;
BEGIN
  year := TO_CHAR(CURRENT_DATE, 'YYYY');
  month := TO_CHAR(CURRENT_DATE, 'MM');
  
  SELECT COALESCE(MAX(SUBSTRING(invoice_number FROM 'INV-\d{4}-\d{2}-(\d+)')::INTEGER), 0) + 1
  INTO sequence_num
  FROM platform_invoices
  WHERE invoice_number LIKE 'INV-' || year || '-' || month || '-%';
  
  RETURN 'INV-' || year || '-' || month || '-' || LPAD(sequence_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;