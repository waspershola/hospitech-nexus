-- LEDGER-REPAIR-V3: Add provider/location name lookups and fix folio_post_charge room_id
-- Phase 1: Fix insert_ledger_entry to lookup provider/location names from IDs

DROP FUNCTION IF EXISTS public.insert_ledger_entry CASCADE;

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
  p_room_id uuid DEFAULT NULL,
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
  v_provider_name text;
  v_location_name text;
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
  
  -- LEDGER-REPAIR-V3: Lookup provider name from provider_id
  IF p_payment_provider_id IS NOT NULL THEN
    SELECT name INTO v_provider_name
    FROM finance_providers
    WHERE id = p_payment_provider_id AND tenant_id = p_tenant_id;
  END IF;
  
  -- LEDGER-REPAIR-V3: Lookup location name from location_id
  IF p_payment_location_id IS NOT NULL THEN
    SELECT name INTO v_location_name
    FROM finance_locations
    WHERE id = p_payment_location_id AND tenant_id = p_tenant_id;
  END IF;
  
  -- Insert ledger entry
  INSERT INTO ledger_entries (
    tenant_id,
    transaction_type,
    transaction_category,
    amount,
    description,
    payment_method,
    payment_method_id,
    payment_provider,
    payment_provider_id,
    payment_location,
    payment_location_id,
    department,
    source_type,
    booking_id,
    guest_id,
    guest_name,
    room_number,
    room_category,
    staff_id_initiated,
    shift,
    payment_id,
    qr_request_id,
    wallet_transaction_id,
    folio_id,
    status,
    reconciliation_status,
    metadata,
    currency
  ) VALUES (
    p_tenant_id,
    p_transaction_type,
    COALESCE(p_category, 'other'),
    p_amount,
    p_description,
    p_payment_method,
    p_payment_method_id,
    COALESCE(v_provider_name, p_payment_provider),  -- Use looked-up name or fallback to passed value
    p_payment_provider_id,
    COALESCE(v_location_name, p_payment_location),  -- Use looked-up name or fallback to passed value
    p_payment_location_id,
    p_department,
    p_source_type,
    p_booking_id,
    p_guest_id,
    v_guest_name,
    v_room_number,
    v_room_category,
    p_staff_id,
    CASE WHEN p_shift IS NOT NULL THEN p_shift::ledger_shift ELSE NULL END,
    p_payment_id,
    p_qr_request_id,
    p_wallet_transaction_id,
    p_folio_id,
    'completed'::ledger_status,
    'pending'::ledger_reconciliation_status,
    p_metadata,
    'NGN'
  )
  RETURNING id INTO v_ledger_id;
  
  RETURN v_ledger_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_ledger_entry TO authenticated, service_role;

COMMENT ON FUNCTION public.insert_ledger_entry IS 'LEDGER-REPAIR-V3: Added provider/location name lookups from IDs';

-- Phase 2: Fix folio_post_charge to pass room_id instead of NULL

CREATE OR REPLACE FUNCTION public.folio_post_charge(
  p_folio_id TEXT,
  p_amount NUMERIC,
  p_description TEXT,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_department TEXT DEFAULT NULL,
  p_request_id UUID DEFAULT NULL,
  p_billing_reference_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_folio_id UUID;
  v_tenant_id UUID;
  v_folio_record stay_folios%ROWTYPE;
  v_transaction_id UUID;
  v_new_balance NUMERIC;
  v_new_total_charges NUMERIC;
  v_request requests%ROWTYPE;
BEGIN
  -- Defensive UUID extraction
  BEGIN
    v_folio_id := p_folio_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      v_folio_id := (p_folio_id::jsonb->>'id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'code', 'INVALID_FOLIO_ID_FORMAT',
        'error', 'Invalid folio ID format',
        'debug_input', p_folio_id,
        'version', 'LEDGER-REPAIR-V3'
      );
    END;
  END;

  -- Lock folio row
  SELECT * INTO v_folio_record
  FROM stay_folios
  WHERE id = v_folio_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'FOLIO_NOT_FOUND',
      'error', 'Folio not found'
    );
  END IF;
  
  IF v_folio_record.status != 'open' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'FOLIO_CLOSED',
      'error', 'Cannot post to closed folio'
    );
  END IF;
  
  v_tenant_id := v_folio_record.tenant_id;
  
  -- QR Billing Task Validation
  IF p_request_id IS NOT NULL THEN
    SELECT * INTO v_request
    FROM requests
    WHERE id = p_request_id
      AND tenant_id = v_tenant_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'code', 'REQUEST_NOT_FOUND',
        'error', 'QR request not found or does not belong to this tenant',
        'request_id', p_request_id,
        'version', 'LEDGER-REPAIR-V3'
      );
    END IF;
    
    IF v_request.billing_status IN ('posted_to_folio', 'paid_direct')
       OR v_request.billed_transaction_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'code', 'ALREADY_BILLED',
        'error', 'This QR billing task has already been processed',
        'billed_at', v_request.billed_at,
        'billed_amount', v_request.billed_amount,
        'billed_folio_id', v_request.billed_folio_id,
        'billed_transaction_id', v_request.billed_transaction_id,
        'billing_status', v_request.billing_status,
        'version', 'LEDGER-REPAIR-V3'
      );
    END IF;
  END IF;
  
  -- Create folio transaction
  INSERT INTO folio_transactions (
    tenant_id, folio_id, transaction_type, amount, description,
    reference_type, reference_id, created_by, department, metadata
  ) VALUES (
    v_tenant_id, v_folio_id, 'charge', p_amount, p_description,
    p_reference_type, p_reference_id, auth.uid(), p_department,
    CASE 
      WHEN p_request_id IS NOT NULL THEN
        jsonb_build_object(
          'request_id', p_request_id,
          'billing_reference_code', p_billing_reference_code,
          'source', 'qr_billing_task'
        )
      ELSE '{}'::jsonb
    END
  ) RETURNING id INTO v_transaction_id;
  
  -- Update folio balances
  v_new_total_charges := COALESCE(v_folio_record.total_charges, 0) + p_amount;
  v_new_balance := v_new_total_charges - COALESCE(v_folio_record.total_payments, 0);
  
  UPDATE stay_folios
  SET 
    total_charges = v_new_total_charges,
    balance = v_new_balance,
    updated_at = NOW()
  WHERE id = v_folio_id;
  
  -- LEDGER-REPAIR-V3: Post folio charge to accounting ledger with room_id
  BEGIN
    PERFORM insert_ledger_entry(
      p_tenant_id := v_tenant_id,
      p_transaction_type := 'debit'::ledger_transaction_type,
      p_amount := p_amount,
      p_description := p_description,
      p_reference_type := p_reference_type,
      p_reference_id := p_reference_id,
      p_category := p_reference_type,
      p_department := p_department,
      p_folio_id := v_folio_id,
      p_booking_id := v_folio_record.booking_id,
      p_guest_id := v_folio_record.guest_id,
      p_room_id := v_folio_record.room_id,  -- LEDGER-REPAIR-V3: Pass room_id instead of NULL
      p_staff_id := auth.uid(),
      p_metadata := jsonb_build_object(
        'transaction_id', v_transaction_id,
        'request_id', p_request_id,
        'billing_reference_code', p_billing_reference_code,
        'source', 'folio_post_charge',
        'version', 'LEDGER-REPAIR-V3'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[LEDGER-REPAIR-V3] Failed to post to ledger: %', SQLERRM;
  END;
  
  -- Update request billing status atomically
  IF p_request_id IS NOT NULL THEN
    UPDATE requests
    SET
      billing_status = 'posted_to_folio',
      billing_reference_code = COALESCE(billing_reference_code, p_billing_reference_code),
      billed_amount = p_amount,
      billed_folio_id = v_folio_id,
      billed_transaction_id = v_transaction_id,
      billed_at = NOW()
    WHERE id = p_request_id
      AND tenant_id = v_tenant_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'folio_id', v_folio_id,
    'transaction_id', v_transaction_id,
    'new_balance', v_new_balance,
    'total_charges', v_new_total_charges,
    'request_id', p_request_id,
    'billing_status', CASE 
      WHEN p_request_id IS NOT NULL THEN 'posted_to_folio'
      ELSE NULL
    END,
    'version', 'LEDGER-REPAIR-V3'
  );
END;
$$;