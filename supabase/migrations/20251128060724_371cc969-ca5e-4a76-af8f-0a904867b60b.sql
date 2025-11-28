-- Migration: Integrate ledger recording into folio_post_charge
-- Marker: LEDGER-PHASE-2B-V1
-- Description: Add insert_ledger_entry call to folio_post_charge RPC for all folio charges

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
  -- Defensive UUID extraction (handle TEXT or JSON object)
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
        'version', 'LEDGER-PHASE-2B-V1'
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
        'version', 'LEDGER-PHASE-2B-V1'
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
        'version', 'LEDGER-PHASE-2B-V1'
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
  
  -- LEDGER-PHASE-2B-V1: Post folio charge to accounting ledger
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
      p_room_number := NULL,
      p_staff_id_initiated := auth.uid(),
      p_staff_id_confirmed := auth.uid(),
      p_status := 'pending',
      p_reconciliation_status := 'pending',
      p_metadata := jsonb_build_object(
        'transaction_id', v_transaction_id,
        'request_id', p_request_id,
        'billing_reference_code', p_billing_reference_code,
        'source', 'folio_post_charge',
        'version', 'LEDGER-PHASE-2B-V1'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Non-blocking: log error but don't fail the folio charge
    RAISE WARNING '[LEDGER-PHASE-2B-V1] Failed to post to ledger: %', SQLERRM;
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
    'version', 'LEDGER-PHASE-2B-V1'
  );
END;
$$;