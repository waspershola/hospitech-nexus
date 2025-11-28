-- Finance Configuration System - Phase 1: Database Enhancements
-- Version: FINANCE-CONFIG-SYSTEM-V1
-- Wires together existing tables, adds FK constraints, enables dynamic payment configuration

-- Step 1: Add FK constraints to ledger_entries (currently missing)
ALTER TABLE ledger_entries
  DROP CONSTRAINT IF EXISTS fk_ledger_payment_method,
  DROP CONSTRAINT IF EXISTS fk_ledger_payment_provider,
  DROP CONSTRAINT IF EXISTS fk_ledger_payment_location;

ALTER TABLE ledger_entries
  ADD CONSTRAINT fk_ledger_payment_method 
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_ledger_payment_provider 
    FOREIGN KEY (payment_provider_id) REFERENCES finance_providers(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_ledger_payment_location 
    FOREIGN KEY (payment_location_id) REFERENCES finance_locations(id) ON DELETE SET NULL;

-- Step 2: Add FK columns to payments table (currently missing)
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_provider_id UUID REFERENCES finance_providers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_location_id UUID REFERENCES finance_locations(id) ON DELETE SET NULL;

-- Step 3: Add indices for performance on payments table
CREATE INDEX IF NOT EXISTS idx_payments_payment_method_id ON payments(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_provider_id ON payments(payment_provider_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_location_id ON payments(payment_location_id);

-- Step 4: Create finance_provider_locations junction table (formalize provider-location relationships)
CREATE TABLE IF NOT EXISTS finance_provider_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES finance_providers(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES finance_locations(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, provider_id, location_id)
);

-- Enable RLS on junction table
ALTER TABLE finance_provider_locations ENABLE ROW LEVEL SECURITY;

-- RLS policies for finance_provider_locations
CREATE POLICY "finance_provider_locations_tenant_select"
  ON finance_provider_locations FOR SELECT
  USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "finance_provider_locations_tenant_manage"
  ON finance_provider_locations FOR ALL
  USING (
    tenant_id = get_user_tenant(auth.uid()) 
    AND (
      has_role(auth.uid(), tenant_id, 'owner'::app_role) 
      OR has_role(auth.uid(), tenant_id, 'manager'::app_role)
    )
  );

-- Step 5: Add index for junction table queries
CREATE INDEX IF NOT EXISTS idx_finance_provider_locations_location 
  ON finance_provider_locations(location_id) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_finance_provider_locations_provider 
  ON finance_provider_locations(provider_id) WHERE is_enabled = true;

-- Step 6: Populate junction table from existing relationships
-- Auto-generate from finance_locations.provider_id if it exists
INSERT INTO finance_provider_locations (tenant_id, provider_id, location_id, is_enabled, is_default)
SELECT DISTINCT
  l.tenant_id,
  l.provider_id,
  l.id,
  true,
  true
FROM finance_locations l
WHERE l.provider_id IS NOT NULL
ON CONFLICT (tenant_id, provider_id, location_id) DO NOTHING;

-- Also populate from finance_provider_rules (existing junction-like table)
INSERT INTO finance_provider_locations (tenant_id, provider_id, location_id, is_enabled)
SELECT DISTINCT
  r.tenant_id,
  r.provider_id,
  r.location_id,
  true
FROM finance_provider_rules r
WHERE r.location_id IS NOT NULL
ON CONFLICT (tenant_id, provider_id, location_id) DO NOTHING;

-- Step 7: Backfill payments table with FK IDs from existing text values
-- Match payment_method to payment_methods.method_type
UPDATE payments p
SET payment_method_id = pm.id
FROM payment_methods pm
WHERE p.tenant_id = pm.tenant_id
  AND LOWER(p.method) = pm.method_type
  AND p.payment_method_id IS NULL;

-- Match method_provider to finance_providers.name
UPDATE payments p
SET payment_provider_id = fp.id
FROM finance_providers fp
WHERE p.tenant_id = fp.tenant_id
  AND p.method_provider = fp.name
  AND p.payment_provider_id IS NULL;

-- Match location to finance_locations.name
UPDATE payments p
SET payment_location_id = fl.id
FROM finance_locations fl
WHERE p.tenant_id = fl.tenant_id
  AND p.location = fl.name
  AND p.payment_location_id IS NULL;

-- Step 8: Backfill ledger_entries with FK IDs from existing text values
-- Match payment_method TEXT to payment_methods.method_type
UPDATE ledger_entries le
SET payment_method_id = pm.id
FROM payment_methods pm
WHERE le.tenant_id = pm.tenant_id
  AND LOWER(le.payment_method) = pm.method_type
  AND le.payment_method_id IS NULL
  AND le.payment_method IS NOT NULL;

-- Match payment_provider TEXT to finance_providers.name
UPDATE ledger_entries le
SET payment_provider_id = fp.id
FROM finance_providers fp
WHERE le.tenant_id = fp.tenant_id
  AND le.payment_provider = fp.name
  AND le.payment_provider_id IS NULL
  AND le.payment_provider IS NOT NULL;

-- Match payment_location TEXT to finance_locations.name
UPDATE ledger_entries le
SET payment_location_id = fl.id
FROM finance_locations fl
WHERE le.tenant_id = fl.tenant_id
  AND le.payment_location = fl.name
  AND le.payment_location_id IS NULL
  AND le.payment_location IS NOT NULL;

-- Success notification
DO $$
BEGIN
  RAISE NOTICE 'FINANCE-CONFIG-SYSTEM-V1: Finance configuration system Phase 1 complete';
  RAISE NOTICE 'FK constraints added, junction table created, data backfilled';
END $$;