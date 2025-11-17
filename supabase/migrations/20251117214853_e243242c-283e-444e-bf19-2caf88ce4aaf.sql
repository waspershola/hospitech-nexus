-- Fix execute_payment_posting to ensure clean UUID parameters
-- This version eliminates all potential serialization by selecting UUIDs one at a time

CREATE OR REPLACE FUNCTION public.execute_payment_posting(
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
  v_tenant_id uuid;
  v_result jsonb;
BEGIN
  -- Select folio ID separately to ensure clean UUID (no row serialization)
  SELECT id INTO STRICT v_folio_id
  FROM stay_folios
  WHERE booking_id = p_booking_id
    AND status = 'open'
  LIMIT 1;

  -- Get tenant_id separately
  SELECT tenant_id INTO STRICT v_tenant_id
  FROM stay_folios
  WHERE id = v_folio_id;

  -- Now call folio_post_payment with guaranteed primitive UUID
  -- This bypasses all JS serialization issues
  v_result := folio_post_payment(v_folio_id, p_payment_id, p_amount);
  
  -- Check if posting succeeded
  IF v_result->>'success' = 'false' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'folio_post_failed',
      'details', v_result,
      'folio_id', v_folio_id
    );
  END IF;
  
  -- Log successful posting
  INSERT INTO finance_audit_events (
    tenant_id,
    event_type,
    user_id,
    target_id,
    payload
  ) VALUES (
    v_tenant_id,
    'payment_posted_to_folio',
    auth.uid(),
    p_payment_id,
    jsonb_build_object(
      'folio_id', v_folio_id,
      'booking_id', p_booking_id,
      'amount', p_amount,
      'method', 'db_wrapper_v2.2.1_fixed'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'folio_id', v_folio_id,
    'payment_id', p_payment_id,
    'result', v_result
  );

EXCEPTION 
  WHEN NO_DATA_FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'no_open_folio',
      'booking_id', p_booking_id
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'rpc_exception',
      'error', SQLERRM,
      'sqlstate', SQLSTATE
    );
END;
$$;

COMMENT ON FUNCTION execute_payment_posting IS 'V2.2.1-FIXED - DB wrapper with guaranteed primitive UUID parameters, no serialization possible';