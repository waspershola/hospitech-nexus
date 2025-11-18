-- Migration: V2.2.1-FINAL-4PARAM - Add tenant_id parameter to execute_payment_posting
-- This migration updates the function signature to explicitly require tenant_id
-- for maximum security and tenant isolation

CREATE OR REPLACE FUNCTION public.execute_payment_posting(
  p_tenant_id uuid,
  p_booking_id uuid,
  p_payment_id uuid,
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folio_id uuid;
  v_booking_status text;
  v_result jsonb;
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

COMMENT ON FUNCTION execute_payment_posting IS 'V2.2.1-FINAL-4PARAM - Tenant-aware wrapper requiring explicit tenant_id for maximum security and tenant isolation';