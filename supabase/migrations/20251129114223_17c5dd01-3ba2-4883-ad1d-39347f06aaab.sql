
-- LEDGER-REPAIR-V1: Drop OLD insert_ledger_entry function and recreate with p_room_id parameter
-- This fixes RPC resolution conflicts that caused silent failures

-- Drop OLD function with conflicting signature (if exists)
DROP FUNCTION IF EXISTS public.insert_ledger_entry(
  uuid, ledger_transaction_type, numeric, text, text, uuid, 
  text, uuid, uuid, text, text, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, jsonb
);

-- Drop any other overloads to ensure clean state
DROP FUNCTION IF EXISTS public.insert_ledger_entry CASCADE;

-- Create canonical insert_ledger_entry with ALL required parameters including p_room_id
CREATE OR REPLACE FUNCTION public.insert_ledger_entry(
  p_tenant_id uuid,
  p_transaction_type ledger_transaction_type,
  p_amount numeric,
  p_description text,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_payment_method_id uuid DEFAULT NULL,
  p_payment_provider text DEFAULT NULL,
  p_payment_provider_id uuid DEFAULT NULL,
  p_payment_location text DEFAULT NULL,
  p_payment_location_id uuid DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_department text DEFAULT NULL,
  p_booking_id uuid DEFAULT NULL,
  p_guest_id uuid DEFAULT NULL,
  p_room_id uuid DEFAULT NULL,  -- ADDED BACK for compatibility
  p_organization_id uuid DEFAULT NULL,
  p_staff_id uuid DEFAULT NULL,
  p_shift text DEFAULT NULL,
  p_source_type text DEFAULT NULL,
  p_payment_id uuid DEFAULT NULL,
  p_qr_request_id uuid DEFAULT NULL,
  p_wallet_transaction_id uuid DEFAULT NULL,
  p_folio_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ledger_id uuid;
  v_room_number text;
  v_room_category text;
  v_guest_name text;
BEGIN
  -- Lookup room details if room_id provided
  IF p_room_id IS NOT NULL THEN
    SELECT r.number, rc.name INTO v_room_number, v_room_category
    FROM rooms r
    LEFT JOIN room_categories rc ON rc.id = r.category_id
    WHERE r.id = p_room_id AND r.tenant_id = p_tenant_id;
  END IF;
  
  -- Lookup guest name if guest_id provided
  IF p_guest_id IS NOT NULL THEN
    SELECT name INTO v_guest_name
    FROM guests
    WHERE id = p_guest_id AND tenant_id = p_tenant_id;
  END IF;
  
  -- Insert ledger entry
  INSERT INTO ledger_entries (
    tenant_id,
    transaction_type,
    amount,
    description,
    payment_method,
    payment_method_id,
    payment_provider_ref,
    payment_provider_id,
    payment_location_ref,
    payment_location_id,
    category,
    department,
    source_type,
    booking_id,
    guest_id,
    guest_name,
    room_id,
    room_number,
    room_category,
    organization_id,
    staff_id,
    shift,
    payment_id,
    qr_request_id,
    wallet_transaction_id,
    folio_id,
    status,
    reconciliation_status,
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
    p_source_type,
    p_booking_id,
    p_guest_id,
    v_guest_name,
    p_room_id,
    v_room_number,
    v_room_category,
    p_organization_id,
    p_staff_id,
    CASE WHEN p_shift IS NOT NULL THEN p_shift::ledger_shift ELSE NULL END,
    p_payment_id,
    p_qr_request_id,
    p_wallet_transaction_id,
    p_folio_id,
    'completed',
    'pending',
    p_metadata
  )
  RETURNING id INTO v_ledger_id;
  
  RETURN v_ledger_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.insert_ledger_entry TO authenticated, service_role;

COMMENT ON FUNCTION public.insert_ledger_entry IS 'LEDGER-REPAIR-V1: Canonical ledger entry insertion function with p_room_id parameter for compatibility';
