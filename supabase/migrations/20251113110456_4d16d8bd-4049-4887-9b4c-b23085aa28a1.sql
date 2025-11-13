-- Phase 1: Platform Fee Payment Settlement - Database Schema Enhancement

-- 1. Extend platform_fee_ledger status constraint to include 'settled' and 'failed'
ALTER TABLE platform_fee_ledger 
  DROP CONSTRAINT IF EXISTS platform_fee_ledger_status_check;

ALTER TABLE platform_fee_ledger 
  ADD CONSTRAINT platform_fee_ledger_status_check 
  CHECK (status IN ('pending', 'billed', 'settled', 'failed', 'waived'));

-- 2. Create platform_fee_payments table for tracking tenant fee payments
CREATE TABLE platform_fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  payment_reference TEXT UNIQUE NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  payment_method_id UUID REFERENCES platform_payment_providers(id),
  provider TEXT,
  status TEXT CHECK (status IN ('initiated', 'processing', 'successful', 'failed', 'refunded')) DEFAULT 'initiated',
  ledger_ids UUID[] NOT NULL,
  provider_response JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  settled_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ
);

-- 3. Add payment tracking columns to platform_fee_ledger
ALTER TABLE platform_fee_ledger 
  ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES platform_fee_payments(id),
  ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;

-- 4. Create indexes for performance
CREATE INDEX idx_platform_fee_payments_tenant ON platform_fee_payments(tenant_id);
CREATE INDEX idx_platform_fee_payments_status ON platform_fee_payments(status);
CREATE INDEX idx_platform_fee_payments_reference ON platform_fee_payments(payment_reference);
CREATE INDEX idx_platform_fee_ledger_payment ON platform_fee_ledger(payment_id);
CREATE INDEX idx_platform_fee_ledger_status ON platform_fee_ledger(status);

-- 5. Enable Row Level Security
ALTER TABLE platform_fee_payments ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for platform_fee_payments

-- Tenants can view their own payment history
CREATE POLICY "Tenants can view own payment history"
  ON platform_fee_payments FOR SELECT
  USING (tenant_id = get_user_tenant(auth.uid()));

-- Platform admins can view all payments
CREATE POLICY "Platform admins can view all payments"
  ON platform_fee_payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM platform_users 
    WHERE id = auth.uid() AND role IN ('super_admin', 'support_admin')
  ));

-- Service role can insert payment records
CREATE POLICY "Service role can insert payments"
  ON platform_fee_payments FOR INSERT
  WITH CHECK (true);

-- Service role can update payment records
CREATE POLICY "Service role can update payments"
  ON platform_fee_payments FOR UPDATE
  USING (true);

-- 7. Add updated_at trigger for platform_fee_payments
CREATE TRIGGER update_platform_fee_payments_updated_at
  BEFORE UPDATE ON platform_fee_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Add comment documentation
COMMENT ON TABLE platform_fee_payments IS 'Tracks tenant payments for platform fees via payment gateways';
COMMENT ON COLUMN platform_fee_payments.ledger_ids IS 'Array of platform_fee_ledger.id entries included in this payment';
COMMENT ON COLUMN platform_fee_payments.provider_response IS 'Raw response from payment provider for debugging';
COMMENT ON COLUMN platform_fee_ledger.payment_id IS 'Links fee entry to payment transaction';
COMMENT ON COLUMN platform_fee_ledger.settled_at IS 'Timestamp when fee was successfully paid';
COMMENT ON COLUMN platform_fee_ledger.failed_at IS 'Timestamp when payment attempt failed';