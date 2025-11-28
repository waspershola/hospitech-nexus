-- =====================================================
-- Fix: Populate Guest Name & Room Number in Ledger Entries
-- Version: LEDGER-GUEST-ROOM-POPULATE-V1
-- =====================================================

-- Drop and recreate insert_ledger_entry to populate guest_name and room_number
DROP FUNCTION IF EXISTS insert_ledger_entry(
  UUID, ledger_transaction_type, NUMERIC, TEXT, TEXT, UUID, TEXT, UUID, TEXT, UUID, TEXT, UUID, 
  TEXT, TEXT, UUID, UUID, UUID, UUID, TEXT, TEXT, UUID, UUID, UUID, UUID, JSONB
);

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
  v_guest_name TEXT;
  v_room_number TEXT;
  v_room_category TEXT;
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

  -- LEDGER-GUEST-ROOM-POPULATE-V1: Lookup guest name
  IF p_guest_id IS NOT NULL THEN
    SELECT name INTO v_guest_name
    FROM guests
    WHERE id = p_guest_id AND tenant_id = p_tenant_id
    LIMIT 1;
  END IF;

  -- LEDGER-GUEST-ROOM-POPULATE-V1: Lookup room number and category from booking
  IF p_booking_id IS NOT NULL THEN
    SELECT 
      r.number,
      rc.name
    INTO v_room_number, v_room_category
    FROM bookings b
    JOIN rooms r ON r.id = b.room_id
    LEFT JOIN room_categories rc ON rc.id = r.category_id
    WHERE b.id = p_booking_id AND b.tenant_id = p_tenant_id
    LIMIT 1;
  END IF;

  INSERT INTO ledger_entries (
    tenant_id, transaction_type, amount, description, payment_method, payment_method_id,
    payment_provider, payment_provider_id, payment_location, payment_location_id,
    transaction_category, department, booking_id, guest_id, guest_name, room_number, room_category,
    staff_id_initiated, shift, source_type, payment_id, qr_request_id, wallet_transaction_id, 
    folio_id, metadata
  ) VALUES (
    p_tenant_id, p_transaction_type, p_amount, p_description, p_payment_method, p_payment_method_id,
    p_payment_provider, p_payment_provider_id, p_payment_location, p_payment_location_id,
    p_category, p_department, p_booking_id, p_guest_id, v_guest_name, v_room_number, v_room_category,
    p_staff_id, v_shift, v_source_type, COALESCE(p_payment_id, p_reference_id), p_qr_request_id, 
    p_wallet_transaction_id, p_folio_id, p_metadata
  ) RETURNING id INTO v_ledger_id;

  RETURN v_ledger_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;