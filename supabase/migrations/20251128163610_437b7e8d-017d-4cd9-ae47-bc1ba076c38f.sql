-- =====================================================
-- Fix: Ledger Entry Shift Type Casting & Staff FK
-- Drop specific signature and recreate
-- Version: LEDGER-SHIFT-FIX-V1
-- =====================================================

-- Drop the specific function signature
DROP FUNCTION IF EXISTS insert_ledger_entry(
  UUID, ledger_transaction_type, NUMERIC, TEXT, TEXT, UUID, TEXT, UUID, TEXT, UUID, TEXT, UUID, 
  TEXT, TEXT, UUID, UUID, UUID, UUID, TEXT, TEXT, UUID, UUID, UUID, UUID, JSONB
);

-- Create fixed version with safe shift casting
CREATE FUNCTION insert_ledger_entry(
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
  v_shift ledger_shift;
BEGIN
  -- Derive source_type
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

  -- LEDGER-SHIFT-FIX-V1: Safely cast shift to enum
  BEGIN
    v_shift := CASE WHEN p_shift IS NULL THEN NULL ELSE p_shift::ledger_shift END;
  EXCEPTION WHEN OTHERS THEN
    v_shift := NULL;
    RAISE WARNING 'Invalid shift: %. Setting to NULL.', p_shift;
  END;

  INSERT INTO ledger_entries (
    tenant_id, transaction_type, amount, description, payment_method, payment_method_id,
    payment_provider, payment_provider_id, payment_location, payment_location_id,
    transaction_category, department, booking_id, guest_id, staff_id_initiated, shift,
    source_type, payment_id, qr_request_id, wallet_transaction_id, folio_id, metadata
  ) VALUES (
    p_tenant_id, p_transaction_type, p_amount, p_description, p_payment_method, p_payment_method_id,
    p_payment_provider, p_payment_provider_id, p_payment_location, p_payment_location_id,
    p_category, p_department, p_booking_id, p_guest_id, p_staff_id, v_shift,
    v_source_type, COALESCE(p_payment_id, p_reference_id), p_qr_request_id, 
    p_wallet_transaction_id, p_folio_id, p_metadata
  ) RETURNING id INTO v_ledger_id;

  RETURN v_ledger_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;