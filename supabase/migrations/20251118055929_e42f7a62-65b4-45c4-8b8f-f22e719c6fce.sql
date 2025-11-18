
-- Drop existing execute_payment_posting function and recreate with pre-check-in support
DROP FUNCTION IF EXISTS public.execute_payment_posting(uuid, uuid, numeric);

CREATE OR REPLACE FUNCTION public.execute_payment_posting(
  p_tenant_id uuid,
  p_booking_id uuid,
  p_payment_id uuid,
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Try to find open folio for this booking
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
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION execute_payment_posting IS 'V2.2.1-FINAL: Handles both pre-check-in and post-check-in payments gracefully';
