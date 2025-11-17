-- Migration: Backfill orphaned payments to folios using execute_payment_posting
-- This migration is IDEMPOTENT and safe to re-run
-- Version: V2.2.1 - Backfill using DB wrapper

DO $$
DECLARE
  r RECORD;
  v_res jsonb;
  v_success int := 0;
  v_fail int := 0;
  v_no_folio int := 0;
BEGIN
  RAISE NOTICE 'Starting orphaned payment backfill using execute_payment_posting...';
  
  FOR r IN
    SELECT 
      p.id AS payment_id, 
      p.amount, 
      p.transaction_ref, 
      p.tenant_id,
      b.id AS booking_id,
      b.booking_reference,
      sf.id AS folio_id,
      sf.status AS folio_status
    FROM payments p
    JOIN bookings b ON b.id = p.booking_id
    LEFT JOIN stay_folios sf ON sf.booking_id = b.id
    WHERE p.stay_folio_id IS NULL
      AND p.booking_id IS NOT NULL
      AND b.status IN ('checked_in', 'completed')
    ORDER BY p.created_at
  LOOP
    BEGIN
      -- Log attempt
      RAISE NOTICE 'Processing payment % (ref: %) for booking %', 
        r.payment_id, r.transaction_ref, r.booking_reference;
      
      -- Call DB wrapper
      SELECT execute_payment_posting(r.booking_id, r.payment_id, r.amount) INTO v_res;
      
      -- Check result
      IF v_res->>'success' = 'true' THEN
        v_success := v_success + 1;
        RAISE NOTICE '  ✅ Successfully posted payment % to folio %', 
          r.payment_id, v_res->>'folio_id';
      ELSIF v_res->>'message' = 'no_open_folio' THEN
        v_no_folio := v_no_folio + 1;
        RAISE NOTICE '  ⚠️  No open folio for payment % (booking: %)', 
          r.payment_id, r.booking_reference;
      ELSE
        v_fail := v_fail + 1;
        RAISE WARNING '  ❌ Failed to post payment %: %', 
          r.payment_id, v_res;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      v_fail := v_fail + 1;
      RAISE WARNING '  ❌ Exception backfilling payment %: %', 
        r.payment_id, SQLERRM;
    END;
  END LOOP;

  -- Final summary
  RAISE NOTICE '';
  RAISE NOTICE '=== BACKFILL SUMMARY ===';
  RAISE NOTICE 'Successfully posted: %', v_success;
  RAISE NOTICE 'No open folio found: %', v_no_folio;
  RAISE NOTICE 'Failed: %', v_fail;
  RAISE NOTICE 'Total processed: %', (v_success + v_no_folio + v_fail);
  RAISE NOTICE '';
  
  -- Verification query
  RAISE NOTICE 'Running verification...';
  
  DECLARE
    v_remaining_orphans int;
  BEGIN
    SELECT COUNT(*) INTO v_remaining_orphans
    FROM payments p
    JOIN bookings b ON b.id = p.booking_id
    JOIN stay_folios sf ON sf.booking_id = b.id AND sf.status = 'open'
    WHERE p.stay_folio_id IS NULL
      AND b.status IN ('checked_in', 'completed');
    
    RAISE NOTICE 'Remaining orphaned payments (with open folios): %', v_remaining_orphans;
    
    IF v_remaining_orphans = 0 THEN
      RAISE NOTICE '✅ All payments successfully linked to folios!';
    ELSE
      RAISE WARNING '⚠️  % payments still orphaned - may require manual investigation', v_remaining_orphans;
    END IF;
  END;
END $$;
