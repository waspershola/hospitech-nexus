-- Backfill Orphaned Payments to Folios
-- Created: 2025-11-17
-- Purpose: Post all existing unlinked payments to their respective folios via folio_post_payment RPC
-- This migration is idempotent and safe to re-run

DO $$
DECLARE
  r RECORD;
  v_result jsonb;
  v_success_count INT := 0;
  v_fail_count INT := 0;
BEGIN
  RAISE NOTICE '=== Starting Orphaned Payment Backfill ===';
  RAISE NOTICE 'Timestamp: %', NOW();
  
  FOR r IN
    SELECT
      p.id AS payment_id,
      p.amount,
      p.transaction_ref,
      p.created_at AS payment_created_at,
      sf.id AS folio_id,
      p.tenant_id,
      b.booking_reference
    FROM payments p
    JOIN bookings b ON b.id = p.booking_id
    JOIN stay_folios sf ON sf.booking_id = b.id AND sf.status = 'open'
    WHERE p.stay_folio_id IS NULL
      AND b.status IN ('checked_in', 'completed')
    ORDER BY p.created_at
  LOOP
    BEGIN
      -- Call RPC with explicit UUID casting to prevent serialization issues
      SELECT folio_post_payment(
        r.folio_id::uuid,
        r.payment_id::uuid,
        r.amount
      ) INTO v_result;
      
      v_success_count := v_success_count + 1;
      
      RAISE NOTICE '[SUCCESS] Posted payment % (ref: %, booking: %) to folio % - Tenant: % - Amount: %',
        r.payment_id, 
        r.transaction_ref, 
        r.booking_reference,
        r.folio_id, 
        r.tenant_id,
        r.amount;
        
    EXCEPTION WHEN OTHERS THEN
      v_fail_count := v_fail_count + 1;
      
      RAISE WARNING '[FAILED] Payment % (ref: %, booking: %): % - Tenant: %',
        r.payment_id, 
        r.transaction_ref,
        r.booking_reference,
        SQLERRM, 
        r.tenant_id;
    END;
  END LOOP;
  
  RAISE NOTICE '=== Backfill Complete ===';
  RAISE NOTICE 'Succeeded: %', v_success_count;
  RAISE NOTICE 'Failed: %', v_fail_count;
  RAISE NOTICE 'Total processed: %', v_success_count + v_fail_count;
END $$;

-- Verification: Count remaining orphaned payments
DO $$
DECLARE
  v_remaining INT;
BEGIN
  SELECT COUNT(*) INTO v_remaining
  FROM payments p
  JOIN bookings b ON b.id = p.booking_id
  JOIN stay_folios sf ON sf.booking_id = b.id AND sf.status = 'open'
  WHERE p.stay_folio_id IS NULL
    AND b.status IN ('checked_in', 'completed');
  
  RAISE NOTICE '=== Post-Backfill Verification ===';
  RAISE NOTICE 'Remaining orphaned payments: %', v_remaining;
  
  IF v_remaining = 0 THEN
    RAISE NOTICE '✅ All orphaned payments successfully backfilled';
  ELSE
    RAISE WARNING '⚠️ % orphaned payments still remain - manual review recommended', v_remaining;
  END IF;
END $$;