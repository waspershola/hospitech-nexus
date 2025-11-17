-- Migration: Create execute_payment_posting DB wrapper
-- This function wraps folio_post_payment to eliminate JS client RPC serialization issues
-- Version: V2.2.1 - Database-level UUID handling

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
  v_result jsonb;
  v_tenant_id uuid;
BEGIN
  -- Get folio ID directly in database (guaranteed clean UUID)
  SELECT id, tenant_id INTO v_folio_id, v_tenant_id
  FROM stay_folios
  WHERE booking_id = p_booking_id
    AND status = 'open'
  LIMIT 1;

  IF v_folio_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'no_open_folio',
      'booking_id', p_booking_id
    );
  END IF;

  -- Call existing RPC with guaranteed clean DB UUIDs (no JS serialization)
  BEGIN
    SELECT folio_post_payment(v_folio_id, p_payment_id, p_amount) INTO v_result;
    
    -- Log successful posting for audit trail
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
        'method', 'db_wrapper_v2.2.1'
      )
    );
    
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'rpc_failed', 
      'error', SQLERRM,
      'folio_id', v_folio_id,
      'payment_id', p_payment_id
    );
  END;

  RETURN jsonb_build_object(
    'success', true, 
    'result', v_result,
    'folio_id', v_folio_id,
    'method', 'db_wrapper'
  );
END;
$$;

COMMENT ON FUNCTION execute_payment_posting IS 'V2.2.1 - DB wrapper for folio_post_payment that eliminates JS client RPC serialization issues by handling UUID resolution entirely in PostgreSQL';
