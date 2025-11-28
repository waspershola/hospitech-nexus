-- Add ledger_reference column as regular column
-- Version: LEDGER-ADD-REFERENCE-COLUMN-V3

ALTER TABLE ledger_entries
ADD COLUMN IF NOT EXISTS ledger_reference TEXT;

CREATE INDEX IF NOT EXISTS idx_ledger_entries_ledger_reference 
ON ledger_entries(ledger_reference);

-- Update insert_ledger_entry to generate and set ledger_reference
CREATE OR REPLACE FUNCTION public.insert_ledger_entry(
  p_tenant_id UUID,
  p_transaction_type ledger_transaction_type,
  p_amount NUMERIC,
  p_description TEXT,
  p_reference_type TEXT,
  p_reference_id UUID,
  p_payment_method TEXT DEFAULT NULL,
  p_provider_id UUID DEFAULT NULL,
  p_location_id UUID DEFAULT NULL,
  p_department TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_folio_id UUID DEFAULT NULL,
  p_booking_id UUID DEFAULT NULL,
  p_guest_id UUID DEFAULT NULL,
  p_room_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_staff_id UUID DEFAULT NULL,
  p_shift_id UUID DEFAULT NULL,
  p_batch_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_ledger_id UUID;
  v_guest_name TEXT;
  v_room_number TEXT;
  v_payment_provider_name TEXT;
  v_payment_location_name TEXT;
  v_ledger_reference TEXT;
BEGIN
  -- Generate unique ledger reference
  v_ledger_reference := 'LDG-' || 
                        TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                        UPPER(SUBSTRING(gen_random_uuid()::text, 1, 6));

  -- Get guest name if guest_id provided
  IF p_guest_id IS NOT NULL THEN
    SELECT name INTO v_guest_name
    FROM guests
    WHERE id = p_guest_id;
  END IF;

  -- Get room number if room_id provided
  IF p_room_id IS NOT NULL THEN
    SELECT number INTO v_room_number
    FROM rooms
    WHERE id = p_room_id;
  END IF;

  -- Get payment provider name
  IF p_provider_id IS NOT NULL THEN
    SELECT name INTO v_payment_provider_name
    FROM finance_providers
    WHERE id = p_provider_id;
  END IF;

  -- Get payment location name
  IF p_location_id IS NOT NULL THEN
    SELECT name INTO v_payment_location_name
    FROM finance_locations
    WHERE id = p_location_id;
  END IF;

  -- Insert ledger entry
  INSERT INTO ledger_entries (
    tenant_id,
    ledger_reference,
    transaction_type,
    transaction_category,
    amount,
    description,
    payment_method,
    payment_provider,
    payment_location,
    department,
    folio_id,
    booking_id,
    guest_id,
    guest_name,
    room_number,
    payment_id,
    wallet_transaction_id,
    qr_request_id,
    staff_id_initiated,
    status,
    metadata
  ) VALUES (
    p_tenant_id,
    v_ledger_reference,
    p_transaction_type,
    p_category,
    p_amount,
    p_description,
    p_payment_method,
    v_payment_provider_name,
    v_payment_location_name,
    p_department,
    p_folio_id,
    p_booking_id,
    p_guest_id,
    v_guest_name,
    v_room_number,
    CASE WHEN p_reference_type = 'payment' THEN p_reference_id ELSE NULL END,
    CASE WHEN p_reference_type = 'wallet_transaction' THEN p_reference_id ELSE NULL END,
    CASE WHEN p_reference_type = 'qr_request' THEN p_reference_id ELSE NULL END,
    p_staff_id,
    'completed',
    p_metadata || jsonb_build_object(
      'reference_type', p_reference_type,
      'reference_id', p_reference_id,
      'ledger_reference', v_ledger_reference,
      'ledger_version', 'LEDGER-FUNCTION-FIX-V3',
      'created_via', 'insert_ledger_entry'
    )
  )
  RETURNING id INTO v_ledger_id;

  RAISE NOTICE '[LEDGER-FUNCTION-FIX-V3] Created ledger entry: % with ref: %', v_ledger_id, v_ledger_reference;
  RETURN v_ledger_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[LEDGER-FUNCTION-FIX-V3] Failed to insert ledger entry: %', SQLERRM;
    RAISE;
END;
$$;