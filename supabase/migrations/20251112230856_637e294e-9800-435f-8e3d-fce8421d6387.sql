-- =====================================================
-- Phase 1: Platform Fee Configuration & Billing System
-- Database Schema Implementation
-- =====================================================

-- 1. Create platform_fee_configurations table
CREATE TABLE IF NOT EXISTS platform_fee_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  
  -- What this fee applies to
  applies_to TEXT[] DEFAULT ARRAY['bookings','qr_payments']::TEXT[],
  
  -- Fee calculation mode
  mode TEXT CHECK (mode IN ('inclusive','exclusive')) DEFAULT 'exclusive',
  -- 'inclusive' = guest pays extra | 'exclusive' = property pays from amount
  
  -- Who pays the fee
  payer TEXT CHECK (payer IN ('guest','property')) DEFAULT 'property',
  
  -- Fee structure
  fee_type TEXT CHECK (fee_type IN ('percentage','flat')) DEFAULT 'percentage',
  booking_fee NUMERIC(10,2) DEFAULT 2.00,  -- 2% or ₦2.00
  qr_fee NUMERIC(10,2) DEFAULT 1.00,       -- 1% or ₦1.00
  
  -- Billing preferences
  billing_cycle TEXT CHECK (billing_cycle IN ('realtime','monthly')) DEFAULT 'realtime',
  
  -- Trial period
  trial_days INTEGER DEFAULT 14,
  trial_exemption_enabled BOOLEAN DEFAULT TRUE,
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Create indexes for platform_fee_configurations
CREATE INDEX idx_fee_config_tenant ON platform_fee_configurations(tenant_id);
CREATE INDEX idx_fee_config_active ON platform_fee_configurations(active);

-- 2. Create platform_fee_ledger table
CREATE TABLE IF NOT EXISTS platform_fee_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Reference to original transaction
  reference_type TEXT NOT NULL CHECK (reference_type IN ('booking','qr_payment','qr_request')),
  reference_id UUID NOT NULL,
  
  -- Fee details
  base_amount NUMERIC(10,2) NOT NULL,      -- Original transaction amount
  fee_amount NUMERIC(10,2) NOT NULL,       -- Calculated fee
  rate NUMERIC(10,2),                      -- Rate used (e.g., 2.00 for 2%)
  fee_type TEXT CHECK (fee_type IN ('percentage','flat')),
  
  -- Billing info
  billing_cycle TEXT CHECK (billing_cycle IN ('realtime','monthly')),
  payer TEXT CHECK (payer IN ('guest','property')),
  
  -- Status tracking
  status TEXT CHECK (status IN ('pending','billed','paid','waived')) DEFAULT 'pending',
  billed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  invoice_id UUID REFERENCES platform_invoices(id) ON DELETE SET NULL,
  
  -- Additional context
  metadata JSONB DEFAULT '{}'::JSONB,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  waived_by UUID,
  waived_reason TEXT
);

-- Create indexes for platform_fee_ledger
CREATE INDEX idx_ledger_tenant ON platform_fee_ledger(tenant_id);
CREATE INDEX idx_ledger_reference ON platform_fee_ledger(reference_type, reference_id);
CREATE INDEX idx_ledger_status ON platform_fee_ledger(status);
CREATE INDEX idx_ledger_billing_cycle ON platform_fee_ledger(billing_cycle, status);
CREATE INDEX idx_ledger_created ON platform_fee_ledger(created_at);

-- 3. Create trigger function for auto-initialization
CREATE OR REPLACE FUNCTION assign_default_fee_configuration()
RETURNS TRIGGER AS $$
DECLARE
  is_trial_active BOOLEAN;
  plan_trial_days INTEGER;
BEGIN
  -- Check if tenant has active trial
  SELECT 
    COALESCE(trial_days, 14) INTO plan_trial_days
  FROM platform_tenants pt
  LEFT JOIN tenant_subscriptions ts ON ts.tenant_id = pt.id
  LEFT JOIN platform_plans pp ON pp.id = ts.plan_id
  WHERE pt.id = NEW.id;
  
  -- Trial is active if trial_end_date exists and is in the future
  is_trial_active := (
    SELECT trial_end_date IS NOT NULL AND trial_end_date > now()
    FROM platform_tenants
    WHERE id = NEW.id
  );
  
  -- Create default fee configuration
  INSERT INTO platform_fee_configurations (
    tenant_id,
    applies_to,
    mode,
    payer,
    fee_type,
    booking_fee,
    qr_fee,
    billing_cycle,
    trial_days,
    trial_exemption_enabled,
    active
  ) VALUES (
    NEW.id,
    ARRAY['bookings','qr_payments']::TEXT[],
    'exclusive',              -- Property pays from amount
    'property',               -- Property bears the cost
    'percentage',             -- Percentage-based fees
    2.00,                     -- 2% on bookings
    1.00,                     -- 1% on QR payments
    'realtime',               -- Instant deduction
    COALESCE(plan_trial_days, 14),  -- Trial period
    TRUE,                     -- Trial exemption enabled
    CASE 
      WHEN is_trial_active THEN FALSE  -- Inactive during trial
      ELSE TRUE                        -- Active after trial
    END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_default_fee_config ON tenants;

CREATE TRIGGER trigger_default_fee_config
AFTER INSERT ON tenants
FOR EACH ROW 
EXECUTE FUNCTION assign_default_fee_configuration();

-- 4. Enable RLS on both tables
ALTER TABLE platform_fee_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_fee_ledger ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for platform_fee_configurations

-- Platform admins can manage all configurations
CREATE POLICY platform_admin_fee_config_all
ON platform_fee_configurations
FOR ALL
TO authenticated
USING (
  is_platform_admin(auth.uid())
);

-- Tenants can view their own fee configuration
CREATE POLICY tenant_view_own_fee_config
ON platform_fee_configurations
FOR SELECT
TO authenticated
USING (
  tenant_id = get_user_tenant(auth.uid())
);

-- 6. RLS Policies for platform_fee_ledger

-- Platform admins can view all ledger entries
CREATE POLICY platform_admin_fee_ledger_view
ON platform_fee_ledger
FOR SELECT
TO authenticated
USING (
  is_platform_admin(auth.uid())
);

-- System can insert ledger entries (via service role in edge functions)
CREATE POLICY system_insert_fee_ledger
ON platform_fee_ledger
FOR INSERT
TO service_role
WITH CHECK (true);

-- Tenants can view their own fee ledger
CREATE POLICY tenant_view_own_fee_ledger
ON platform_fee_ledger
FOR SELECT
TO authenticated
USING (
  tenant_id = get_user_tenant(auth.uid())
);

-- Platform admins can update ledger status (for waivers)
CREATE POLICY platform_admin_fee_ledger_update
ON platform_fee_ledger
FOR UPDATE
TO authenticated
USING (
  is_platform_admin(auth.uid())
);

-- 7. Add updated_at trigger for platform_fee_configurations
CREATE TRIGGER update_platform_fee_config_updated_at
BEFORE UPDATE ON platform_fee_configurations
FOR EACH ROW
EXECUTE FUNCTION update_platform_updated_at();