-- ATTACH-PAYMENTS-V1: Function to attach reservation-time payments to folio created on check-in
-- This function idempotently posts completed payments to a folio via the 4-param wrapper

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
  -- Log function call
  RAISE NOTICE 'ATTACH-PAYMENTS-V1: Starting for booking % folio %', p_booking_id, p_folio_id;
  
  -- Iterate through all completed reservation payments not yet linked to a folio
  FOR r IN
    SELECT id AS payment_id, amount, transaction_ref
    FROM payments
    WHERE booking_id = p_booking_id
      AND tenant_id = p_tenant_id
      AND stay_folio_id IS NULL
      AND status = 'completed'
    ORDER BY created_at
  LOOP
    BEGIN
      -- Call execute_payment_posting (4-param wrapper) to post payment to folio
      SELECT execute_payment_posting(p_tenant_id, p_booking_id, r.payment_id, r.amount) INTO v_result;
      
      IF (v_result->>'success')::boolean IS TRUE THEN
        v_success_count := v_success_count + 1;
        RAISE NOTICE 'ATTACH-PAYMENTS-V1: Posted payment % (₦%) to folio', r.payment_id, r.amount;
        
        -- Create audit log entry for traceability
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
            'method', 'auto_attach_on_checkin'
          )
        );
      ELSE
        v_fail_count := v_fail_count + 1;
        RAISE WARNING 'ATTACH-PAYMENTS-V1: Failed to post payment %: %', r.payment_id, v_result->>'message';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_fail_count := v_fail_count + 1;
      RAISE WARNING 'ATTACH-PAYMENTS-V1: Exception for payment %: %', r.payment_id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'ATTACH-PAYMENTS-V1: Complete - Posted: %, Failed: %', v_success_count, v_fail_count;
  
  RETURN jsonb_build_object(
    'success', true,
    'payments_posted', v_success_count,
    'payments_failed', v_fail_count
  );
END;
$$;

COMMENT ON FUNCTION public.attach_booking_payments_to_folio IS 
'V1: Idempotently attach reservation-time payments to folio created on check-in. Called automatically during check-in flow.';

-- BACKFILL-ORPHAN-PAYMENTS-V1: One-time backfill of orphaned reservation payments to existing open folios
-- This migration finds completed payments without stay_folio_id and posts them to their booking's folio

DO $$
DECLARE
  r RECORD;
  v_result jsonb;
  v_total INTEGER := 0;
  v_success INTEGER := 0;
  v_failed INTEGER := 0;
BEGIN
  RAISE NOTICE 'BACKFILL-ORPHAN-PAYMENTS-V1: Starting backfill of orphaned reservation payments';
  
  -- Find all bookings with orphaned payments that have open folios
  FOR r IN
    SELECT DISTINCT p.booking_id, p.tenant_id, sf.id AS folio_id
    FROM payments p
    JOIN bookings b ON b.id = p.booking_id
    JOIN stay_folios sf ON sf.booking_id = b.id
    WHERE p.stay_folio_id IS NULL
      AND p.status = 'completed'
      AND sf.status = 'open'
      AND b.status IN ('checked_in', 'completed')
    ORDER BY p.tenant_id, p.booking_id
  LOOP
    v_total := v_total + 1;
    
    BEGIN
      -- Call attach function for this booking
      SELECT attach_booking_payments_to_folio(r.tenant_id, r.booking_id, r.folio_id) INTO v_result;
      
      IF (v_result->>'success')::boolean IS TRUE THEN
        v_success := v_success + 1;
        RAISE NOTICE 'BACKFILL-ORPHAN-PAYMENTS-V1: Processed booking % - Posted: %, Failed: %',
          r.booking_id, 
          v_result->>'payments_posted', 
          v_result->>'payments_failed';
      ELSE
        v_failed := v_failed + 1;
        RAISE WARNING 'BACKFILL-ORPHAN-PAYMENTS-V1: Attach function returned failure for booking %', r.booking_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      RAISE WARNING 'BACKFILL-ORPHAN-PAYMENTS-V1: Exception for booking %: %', r.booking_id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'BACKFILL-ORPHAN-PAYMENTS-V1: Complete - Total bookings: %, Success: %, Failed: %', 
    v_total, v_success, v_failed;
  
  -- Verification query to show remaining orphans (if any)
  RAISE NOTICE 'BACKFILL-ORPHAN-PAYMENTS-V1: Checking remaining orphaned payments...';
  
  DECLARE
    v_remaining INTEGER;
  BEGIN
    SELECT COUNT(*) INTO v_remaining
    FROM payments p
    JOIN bookings b ON b.id = p.booking_id
    LEFT JOIN stay_folios sf ON sf.booking_id = b.id AND sf.status = 'open'
    WHERE p.stay_folio_id IS NULL
      AND p.status = 'completed'
      AND b.status IN ('checked_in', 'completed');
    
    RAISE NOTICE 'BACKFILL-ORPHAN-PAYMENTS-V1: Remaining orphaned payments: %', v_remaining;
    
    IF v_remaining > 0 THEN
      RAISE NOTICE 'BACKFILL-ORPHAN-PAYMENTS-V1: Some orphans remain - likely post-checkout payments or bookings without open folios';
    END IF;
  END;
END;
$$;