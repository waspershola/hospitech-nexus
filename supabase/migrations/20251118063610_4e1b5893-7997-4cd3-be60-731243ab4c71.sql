-- V2.2.1-FINAL-4PARAM: Backfill orphaned payments using 4-parameter wrapper
-- This migration is IDEMPOTENT and safe to re-run
-- Posts all payments with stay_folio_id IS NULL to their respective folios

DO $$
DECLARE
  r RECORD;
  v_result jsonb;
  v_success_count int := 0;
  v_fail_count int := 0;
  v_no_folio_count int := 0;
BEGIN
  RAISE NOTICE 'Starting V2.2.1-FINAL-4PARAM orphaned payment backfill...';
  
  FOR r IN
    SELECT 
      p.id AS payment_id,
      p.booking_id,
      b.tenant_id,
      p.amount,
      p.transaction_ref,
      b.booking_reference,
      b.status AS booking_status
    FROM payments p
    JOIN bookings b ON b.id = p.booking_id
    WHERE p.stay_folio_id IS NULL
      AND b.status IN ('checked_in', 'completed')
    ORDER BY p.created_at
  LOOP
    BEGIN
      RAISE NOTICE 'Processing payment % (ref: %) for booking % (status: %)', 
        r.payment_id, r.transaction_ref, r.booking_reference, r.booking_status;
      
      -- Call the 4-parameter wrapper
      SELECT execute_payment_posting(
        r.tenant_id,
        r.booking_id,
        r.payment_id,
        r.amount
      ) INTO v_result;
      
      -- Check result
      IF (v_result->>'success')::boolean THEN
        IF v_result->>'message' = 'pre_checkin_payment' THEN
          v_no_folio_count := v_no_folio_count + 1;
          RAISE NOTICE '  ⚠️  Pre-check-in payment % - will post at check-in', r.payment_id;
        ELSE
          v_success_count := v_success_count + 1;
          RAISE NOTICE '  ✅ Successfully posted payment % to folio %', 
            r.payment_id, v_result->>'folio_id';
        END IF;
      ELSE
        v_fail_count := v_fail_count + 1;
        RAISE WARNING '  ❌ Failed to post payment %: %', 
          r.payment_id, v_result->>'message';
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      v_fail_count := v_fail_count + 1;
      RAISE WARNING '  ❌ Exception posting payment %: % (SQLSTATE: %)', 
        r.payment_id, SQLERRM, SQLSTATE;
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========== BACKFILL COMPLETE ==========';
  RAISE NOTICE 'Successfully posted: %', v_success_count;
  RAISE NOTICE 'Pre-check-in (deferred): %', v_no_folio_count;
  RAISE NOTICE 'Failed: %', v_fail_count;
  RAISE NOTICE 'Total processed: %', v_success_count + v_fail_count + v_no_folio_count;
END $$;