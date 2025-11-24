-- Phase 5: Payment Pipeline Sync - Update Request Status on Payment Collection
-- Marker: QR-BILLING-SYNC-PHASE-5-V1

-- Drop existing function to avoid overloading
DROP FUNCTION IF EXISTS execute_payment_posting(UUID, UUID, UUID, NUMERIC);

-- Recreate with QR billing status sync
CREATE OR REPLACE FUNCTION execute_payment_posting(
  p_tenant_id UUID,
  p_booking_id UUID,
  p_payment_id UUID,
  p_amount NUMERIC
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folio_id UUID;
  v_booking_status TEXT;
  v_result JSONB;
  v_payment_metadata JSONB;
  v_request_id UUID;
BEGIN
  -- Check booking status first
  SELECT status INTO v_booking_status
  FROM bookings
  WHERE id = p_booking_id AND tenant_id = p_tenant_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'booking_not_found',
      'tenant_id', p_tenant_id,
      'booking_id', p_booking_id
    );
  END IF;
  
  -- Try to find open folio for this booking (tenant-scoped)
  SELECT id INTO v_folio_id
  FROM stay_folios
  WHERE booking_id = p_booking_id 
    AND status = 'open'
    AND tenant_id = p_tenant_id
  LIMIT 1;
  
  -- If no folio exists (pre-check-in payment)
  IF v_folio_id IS NULL THEN
    -- For reserved bookings, this is expected - payment will be posted at check-in
    IF v_booking_status = 'reserved' THEN
      RETURN jsonb_build_object(
        'success', true,
        'message', 'pre_checkin_payment',
        'folio_id', NULL,
        'note', 'Payment recorded, will be posted to folio at check-in',
        'booking_status', v_booking_status
      );
    ELSE
      -- For checked_in/completed bookings, missing folio is an error
      RETURN jsonb_build_object(
        'success', false,
        'message', 'no_open_folio',
        'tenant_id', p_tenant_id,
        'booking_id', p_booking_id,
        'booking_status', v_booking_status
      );
    END IF;
  END IF;
  
  -- Folio exists, post payment using the fixed RPC
  v_result := folio_post_payment(v_folio_id, p_payment_id, p_amount);
  
  -- Add folio_id to result
  v_result := v_result || jsonb_build_object('folio_id', v_folio_id);
  
  -- Log successful posting for audit trail
  IF (v_result->>'success') = 'true' THEN
    INSERT INTO finance_audit_events (
      tenant_id,
      event_type,
      user_id,
      target_id,
      payload
    ) VALUES (
      p_tenant_id,
      'payment_posted_to_folio',
      auth.uid(),
      p_payment_id,
      jsonb_build_object(
        'folio_id', v_folio_id,
        'booking_id', p_booking_id,
        'amount', p_amount,
        'method', 'db_wrapper_v2.2.1_final_4param'
      )
    );
    
    -- NEW PHASE 5: Check if this payment is linked to a QR request
    SELECT metadata INTO v_payment_metadata
    FROM payments
    WHERE id = p_payment_id AND tenant_id = p_tenant_id;
    
    -- Extract request_id from payment metadata
    IF v_payment_metadata ? 'request_id' THEN
      v_request_id := (v_payment_metadata->>'request_id')::UUID;
      
      -- Update request billing status to paid_direct
      UPDATE requests
      SET
        billing_status = CASE 
          WHEN billing_status = 'posted_to_folio' THEN 'paid_direct'
          ELSE billing_status
        END,
        paid_at = NOW()
      WHERE id = v_request_id
        AND tenant_id = p_tenant_id
        AND billing_status = 'posted_to_folio';  -- Only update if currently posted
      
      RAISE NOTICE '[PAYMENT-PIPELINE-SYNC-V1] Updated request % billing_status to paid_direct', v_request_id;
    END IF;
  END IF;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'rpc_exception',
    'error', SQLERRM,
    'sqlstate', SQLSTATE
  );
END;
$$;