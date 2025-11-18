-- ATTACH-PAYMENTS-V1.1-STATUS-FIX: Update function to handle both 'success' and 'completed' payment statuses
-- Bug fix: Quick Payment form creates payments with status='success', but function only checked for 'completed'
-- This caused reservation payments to not auto-attach during check-in

CREATE OR REPLACE FUNCTION public.attach_booking_payments_to_folio(
  p_tenant_id uuid,
  p_booking_id uuid,
  p_folio_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  r RECORD;
  v_result jsonb;
  v_success_count INTEGER := 0;
  v_fail_count INTEGER := 0;
BEGIN
  -- Log function call with version marker
  RAISE NOTICE 'ATTACH-PAYMENTS-V1.1-STATUS-FIX: Starting for booking % folio %', p_booking_id, p_folio_id;
  
  -- Iterate through all reservation payments not yet linked to a folio
  -- FIXED: Now accepts both 'success' and 'completed' statuses
  FOR r IN
    SELECT id AS payment_id, amount, transaction_ref, status
    FROM payments
    WHERE booking_id = p_booking_id
      AND tenant_id = p_tenant_id
      AND stay_folio_id IS NULL
      AND status IN ('success', 'completed')  -- CRITICAL FIX: was "status = 'completed'"
    ORDER BY created_at
  LOOP
    BEGIN
      -- Call execute_payment_posting (4-param wrapper) to post payment to folio
      SELECT execute_payment_posting(p_tenant_id, p_booking_id, r.payment_id, r.amount) INTO v_result;
      
      IF (v_result->>'success')::boolean IS TRUE THEN
        v_success_count := v_success_count + 1;
        RAISE NOTICE 'ATTACH-PAYMENTS-V1.1-STATUS-FIX: Posted payment % (₦%, status=%) to folio', r.payment_id, r.amount, r.status;
        
        -- Create audit log entry for traceability with status info
        INSERT INTO finance_audit_events (
          tenant_id, event_type, user_id, target_id, payload
        ) VALUES (
          p_tenant_id, 
          'payment_auto_attached_to_folio', 
          NULL, -- system action, no user
          r.payment_id,
          jsonb_build_object(
            'booking_id', p_booking_id, 
            'folio_id', p_folio_id,
            'amount', r.amount, 
            'transaction_ref', r.transaction_ref,
            'payment_status', r.status,
            'method', 'auto_attach_on_checkin',
            'version', 'V1.1-STATUS-FIX'
          )
        );
      ELSE
        v_fail_count := v_fail_count + 1;
        RAISE WARNING 'ATTACH-PAYMENTS-V1.1-STATUS-FIX: Failed to post payment %: %', r.payment_id, v_result->>'message';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_fail_count := v_fail_count + 1;
      RAISE WARNING 'ATTACH-PAYMENTS-V1.1-STATUS-FIX: Exception for payment %: %', r.payment_id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'ATTACH-PAYMENTS-V1.1-STATUS-FIX: Complete - Posted: %, Failed: %', v_success_count, v_fail_count;
  
  RETURN jsonb_build_object(
    'success', true,
    'payments_posted', v_success_count,
    'payments_failed', v_fail_count,
    'version', 'V1.1-STATUS-FIX'
  );
END;
$$;

COMMENT ON FUNCTION public.attach_booking_payments_to_folio IS 
'V1.1-STATUS-FIX: Idempotently attach reservation-time payments to folio created on check-in. Accepts both success and completed payment statuses. Called automatically during check-in flow.';

-- Manual fix for existing orphaned payment (Room 209, booking c75a8def-93b1-431f-86cb-13134c8557f4)
DO $$
DECLARE
  v_tenant_id uuid;
  v_booking_id uuid := 'c75a8def-93b1-431f-86cb-13134c8557f4';
  v_folio_id uuid := 'fef972d8-3bbc-4883-a08d-efe9679d0fef';
  v_result jsonb;
BEGIN
  -- Get tenant_id from booking
  SELECT tenant_id INTO v_tenant_id
  FROM bookings
  WHERE id = v_booking_id;
  
  IF v_tenant_id IS NOT NULL THEN
    RAISE NOTICE 'MANUAL-FIX-ROOM-209: Attaching orphaned payment for booking %', v_booking_id;
    
    -- Call the updated function to attach the orphaned payment
    SELECT attach_booking_payments_to_folio(v_tenant_id, v_booking_id, v_folio_id) INTO v_result;
    
    RAISE NOTICE 'MANUAL-FIX-ROOM-209: Result - %', v_result;
  ELSE
    RAISE WARNING 'MANUAL-FIX-ROOM-209: Booking % not found', v_booking_id;
  END IF;
END;
$$;