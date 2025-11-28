-- =====================================================
-- Ledger Phase 2C: Dimensions & Filters Production Fix
-- Migration: Add FK columns and source_type to ledger_entries
-- Version: LEDGER-PHASE-2C-V1-FIXED
-- =====================================================

-- Step 1: Add new FK columns to ledger_entries
ALTER TABLE ledger_entries
ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS payment_provider_id UUID REFERENCES finance_providers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS payment_location_id UUID REFERENCES finance_locations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_type TEXT;

-- Step 2: Create indices for performance
CREATE INDEX IF NOT EXISTS idx_ledger_entries_payment_method_id ON ledger_entries(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_payment_provider_id ON ledger_entries(payment_provider_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_payment_location_id ON ledger_entries(payment_location_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_source_type ON ledger_entries(source_type);

-- Step 3: Update insert_ledger_entry RPC to store IDs
CREATE OR REPLACE FUNCTION insert_ledger_entry(
  p_tenant_id UUID,
  p_transaction_type ledger_transaction_type,
  p_amount NUMERIC,
  p_description TEXT,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_payment_method_id UUID DEFAULT NULL,
  p_payment_provider TEXT DEFAULT NULL,
  p_payment_provider_id UUID DEFAULT NULL,
  p_payment_location TEXT DEFAULT NULL,
  p_payment_location_id UUID DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_department TEXT DEFAULT NULL,
  p_booking_id UUID DEFAULT NULL,
  p_guest_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_staff_id UUID DEFAULT NULL,
  p_shift TEXT DEFAULT NULL,
  p_source_type TEXT DEFAULT NULL,
  p_payment_id UUID DEFAULT NULL,
  p_qr_request_id UUID DEFAULT NULL,
  p_wallet_transaction_id UUID DEFAULT NULL,
  p_folio_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_ledger_id UUID;
  v_source_type TEXT;
BEGIN
  -- Derive source_type from context if not provided
  v_source_type := COALESCE(
    p_source_type,
    CASE 
      WHEN p_payment_id IS NOT NULL THEN 'payment'
      WHEN p_qr_request_id IS NOT NULL THEN 'qr_request'
      WHEN p_wallet_transaction_id IS NOT NULL THEN 'wallet'
      WHEN p_folio_id IS NOT NULL THEN 'folio'
      ELSE 'unknown'
    END
  );

  INSERT INTO ledger_entries (
    tenant_id,
    transaction_type,
    amount,
    description,
    payment_method,
    payment_method_id,
    payment_provider,
    payment_provider_id,
    payment_location,
    payment_location_id,
    transaction_category,
    department,
    booking_id,
    guest_id,
    staff_id_initiated,
    shift,
    source_type,
    payment_id,
    qr_request_id,
    wallet_transaction_id,
    folio_id,
    metadata
  ) VALUES (
    p_tenant_id,
    p_transaction_type,
    p_amount,
    p_description,
    p_payment_method,
    p_payment_method_id,
    p_payment_provider,
    p_payment_provider_id,
    p_payment_location,
    p_payment_location_id,
    p_category,
    p_department,
    p_booking_id,
    p_guest_id,
    p_staff_id,
    p_shift,
    v_source_type,
    COALESCE(p_payment_id, p_reference_id),
    p_qr_request_id,
    p_wallet_transaction_id,
    p_folio_id,
    p_metadata
  ) RETURNING id INTO v_ledger_id;

  RETURN v_ledger_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 4: Backfill existing ledger entries with FK IDs and source_type
UPDATE ledger_entries le
SET 
  payment_method_id = (
    SELECT pm.id 
    FROM payment_methods pm 
    WHERE pm.method_name = le.payment_method 
    AND pm.tenant_id = le.tenant_id
    LIMIT 1
  ),
  payment_provider_id = (
    SELECT fp.id 
    FROM finance_providers fp 
    WHERE fp.name = le.payment_provider 
    AND fp.tenant_id = le.tenant_id
    LIMIT 1
  ),
  payment_location_id = (
    SELECT fl.id 
    FROM finance_locations fl 
    WHERE fl.name = le.payment_location 
    AND fl.tenant_id = le.tenant_id
    LIMIT 1
  ),
  source_type = COALESCE(
    le.metadata->>'source',
    le.metadata->>'source_type',
    CASE 
      WHEN le.payment_id IS NOT NULL THEN 'payment'
      WHEN le.qr_request_id IS NOT NULL THEN 'qr_request'
      WHEN le.wallet_transaction_id IS NOT NULL THEN 'wallet'
      WHEN le.folio_id IS NOT NULL THEN 'folio'
      ELSE 'unknown'
    END
  )
WHERE payment_method_id IS NULL OR source_type IS NULL;

COMMENT ON COLUMN ledger_entries.payment_method_id IS 'FK to payment_methods table for tenant-configured payment methods';
COMMENT ON COLUMN ledger_entries.payment_provider_id IS 'FK to finance_providers table for payment providers (POS, banks, etc)';
COMMENT ON COLUMN ledger_entries.payment_location_id IS 'FK to finance_locations table for collection points (front desk, restaurant, bar, etc)';
COMMENT ON COLUMN ledger_entries.source_type IS 'Source of the transaction: payment, folio, wallet, qr_request, etc';