-- Week 1 Critical Fix: Unified Payment Methods System
-- Version: PAYMENT-METHODS-V1.0
-- Creates foundation for tenant-customizable payment methods

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  method_name text NOT NULL,
  method_type text NOT NULL CHECK (method_type IN ('cash', 'card', 'transfer', 'mobile_money', 'cheque', 'pos', 'online')),
  provider_id uuid REFERENCES finance_providers(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  requires_reference boolean NOT NULL DEFAULT false,
  requires_approval boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  CONSTRAINT unique_method_per_tenant UNIQUE (tenant_id, method_name)
);

-- Add indexes for performance
CREATE INDEX idx_payment_methods_tenant_id ON payment_methods(tenant_id);
CREATE INDEX idx_payment_methods_active ON payment_methods(tenant_id, active);
CREATE INDEX idx_payment_methods_display_order ON payment_methods(tenant_id, display_order);
CREATE INDEX idx_payment_methods_type ON payment_methods(tenant_id, method_type);

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view payment methods for their tenant"
  ON payment_methods FOR SELECT
  USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Owners/Managers can manage payment methods"
  ON payment_methods FOR ALL
  USING (
    tenant_id = get_user_tenant(auth.uid()) 
    AND (
      has_role(auth.uid(), tenant_id, 'owner'::app_role) 
      OR has_role(auth.uid(), tenant_id, 'manager'::app_role)
    )
  );

-- Auto-update updated_at timestamp
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_tenants_updated_at();

-- Seed default payment methods for all existing tenants
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN SELECT id FROM tenants WHERE deleted_at IS NULL
  LOOP
    -- Insert standard payment methods
    INSERT INTO payment_methods (tenant_id, method_name, method_type, display_order, requires_reference)
    VALUES
      (tenant_record.id, 'Cash', 'cash', 1, false),
      (tenant_record.id, 'Card', 'card', 2, true),
      (tenant_record.id, 'Bank Transfer', 'transfer', 3, true),
      (tenant_record.id, 'Mobile Money', 'mobile_money', 4, true),
      (tenant_record.id, 'Cheque', 'cheque', 5, true),
      (tenant_record.id, 'POS', 'pos', 6, true)
    ON CONFLICT (tenant_id, method_name) DO NOTHING;
  END LOOP;
END $$;

-- Add comment
COMMENT ON TABLE payment_methods IS 'Week 1 Critical Fix: Unified payment methods system foundation. Enables tenant-level payment method configuration.';