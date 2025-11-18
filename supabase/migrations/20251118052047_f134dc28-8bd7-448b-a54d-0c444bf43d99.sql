-- V2.2.1-FINAL: Ultimate payment→folio posting fix with booking-based tenant resolution
-- This version eliminates all JavaScript serialization issues by:
-- 1. Resolving tenant_id from bookings table (more reliable)
-- 2. Using regular SELECT INTO instead of STRICT for better error handling
-- 3. Including ORDER BY created_at DESC for multi-folio scenarios
-- 4. Providing detailed error messages for troubleshooting

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
  -- Resolve tenant from booking (more reliable than folio)
  SELECT tenant_id INTO v_tenant_id
  FROM bookings
  WHERE id = p_booking_id;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'booking_not_found',
      'booking_id', p_booking_id
    );
  END IF;

  -- Select only UUID (prevents composite serialization)
  -- Use ORDER BY for newest folio in multi-folio scenarios
  SELECT id INTO v_folio_id
  FROM stay_folios
  WHERE booking_id = p_booking_id
    AND status = 'open'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_folio_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'no_open_folio',
      'booking_id', p_booking_id,
      'tenant_id', v_tenant_id
    );
  END IF;

  -- Execute the actual posting RPC with clean UUIDs
  SELECT folio_post_payment(v_folio_id, p_payment_id, p_amount) INTO v_result;

  -- Detect RPC internal failure
  IF (v_result->>'success') = 'false' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'folio_post_failed',
      'details', v_result,
      'folio_id', v_folio_id
    );
  END IF;

  -- Audit event (tenant-aware)
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
      'method', 'db_wrapper_v2.2.1_final'
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

COMMENT ON FUNCTION execute_payment_posting IS 'V2.2.1-FINAL - Tenant-aware DB wrapper with booking-based tenant resolution, eliminates all JavaScript client serialization issues';