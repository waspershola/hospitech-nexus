-- ============================================================================
-- WEEK 1 CRITICAL FIX: Backfill Orphaned Payments
-- Version: WEEK1-CRITICAL-V1-ORPHAN-BACKFILL
-- ============================================================================
-- 
-- PURPOSE:
-- This migration addresses the critical issue identified in the payment system audit
-- where 80 payments exist without stay_folio_id linkage due to:
-- 1. Payments created before check-in (reserved bookings)
-- 2. Historical status mismatch ('success' vs 'completed')
-- 3. Failed auto-attachment during check-in
--
-- AUDIT FINDINGS:
-- - Total orphaned payments: 80
-- - Status breakdown: 73 'success', 7 'completed'
-- - Booking status: 2 checked-in (needs immediate fix), 78 reserved (will auto-attach)
--
-- STRATEGY:
-- Phase 1: Immediate fix for checked-in bookings with open folios
-- Phase 2: Reserved bookings will auto-attach when they check in (no action needed)
--
-- SAFETY:
-- - Idempotent: Safe to run multiple times
-- - Uses existing attach_booking_payments_to_folio RPC (V1.3)
-- - Only processes payments without stay_folio_id
-- - Only processes bookings with open folios
-- - Comprehensive logging for audit trail
-- ============================================================================

DO $$
DECLARE
  v_booking RECORD;
  v_result JSONB;
  v_total_bookings INTEGER := 0;
  v_total_payments_processed INTEGER := 0;
  v_success_bookings INTEGER := 0;
  v_failed_bookings INTEGER := 0;
  v_skipped_no_folio INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'WEEK1-CRITICAL-V1-ORPHAN-BACKFILL: Starting orphaned payment backfill';
  RAISE NOTICE '========================================';
  
  -- Phase 1: Process checked-in bookings with open folios
  RAISE NOTICE 'PHASE 1: Processing checked-in bookings with orphaned payments';
  
  FOR v_booking IN
    SELECT DISTINCT
      p.tenant_id,
      p.booking_id,
      b.booking_reference,
      b.status AS booking_status,
      sf.id AS folio_id,
      sf.folio_number,
      COUNT(p.id) AS orphaned_payment_count,
      SUM(p.amount) AS total_orphaned_amount
    FROM payments p
    JOIN bookings b ON b.id = p.booking_id
    LEFT JOIN stay_folios sf ON sf.booking_id = p.booking_id 
      AND sf.status = 'open'
      AND sf.tenant_id = p.tenant_id
    WHERE p.stay_folio_id IS NULL
      AND p.status IN ('success', 'completed')
      AND p.booking_id IS NOT NULL
      AND b.status IN ('checked_in', 'completed')
    GROUP BY p.tenant_id, p.booking_id, b.booking_reference, b.status, sf.id, sf.folio_number
    ORDER BY p.tenant_id, p.booking_id
  LOOP
    v_total_bookings := v_total_bookings + 1;
    
    -- Check if booking has an open folio
    IF v_booking.folio_id IS NULL THEN
      v_skipped_no_folio := v_skipped_no_folio + 1;
      RAISE WARNING 'WEEK1-CRITICAL-V1: Booking % (%) has % orphaned payments but NO OPEN FOLIO - Skipping',
        v_booking.booking_reference,
        v_booking.booking_status,
        v_booking.orphaned_payment_count;
      CONTINUE;
    END IF;
    
    RAISE NOTICE 'WEEK1-CRITICAL-V1: Processing booking % (folio %) - % orphaned payments totaling ₦%',
      v_booking.booking_reference,
      v_booking.folio_number,
      v_booking.orphaned_payment_count,
      v_booking.total_orphaned_amount;
    
    BEGIN
      -- Call the attach function using the existing V1.3 RPC
      SELECT attach_booking_payments_to_folio(
        v_booking.tenant_id,
        v_booking.booking_id,
        v_booking.folio_id
      ) INTO v_result;
      
      IF (v_result->>'success')::BOOLEAN IS TRUE THEN
        v_success_bookings := v_success_bookings + 1;
        v_total_payments_processed := v_total_payments_processed + (v_result->>'payments_posted')::INTEGER;
        
        RAISE NOTICE 'WEEK1-CRITICAL-V1: ✓ SUCCESS - Booking % - Posted: %, Failed: %, Already Posted: %',
          v_booking.booking_reference,
          v_result->>'payments_posted',
          v_result->>'payments_failed',
          v_result->>'already_posted';
          
        -- Log to finance audit
        INSERT INTO finance_audit_events (
          tenant_id,
          event_type,
          user_id,
          target_id,
          payload
        ) VALUES (
          v_booking.tenant_id,
          'orphaned_payments_backfilled',
          NULL,
          v_booking.booking_id,
          jsonb_build_object(
            'booking_reference', v_booking.booking_reference,
            'folio_id', v_booking.folio_id,
            'folio_number', v_booking.folio_number,
            'payments_posted', v_result->>'payments_posted',
            'payments_failed', v_result->>'payments_failed',
            'already_posted', v_result->>'already_posted',
            'migration_version', 'WEEK1-CRITICAL-V1-ORPHAN-BACKFILL'
          )
        );
      ELSE
        v_failed_bookings := v_failed_bookings + 1;
        RAISE WARNING 'WEEK1-CRITICAL-V1: ✗ FAILED - Booking % - Error: %',
          v_booking.booking_reference,
          v_result->>'error';
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      v_failed_bookings := v_failed_bookings + 1;
      RAISE WARNING 'WEEK1-CRITICAL-V1: ✗ EXCEPTION - Booking % - %',
        v_booking.booking_reference,
        SQLERRM;
    END;
  END LOOP;
  
  -- Summary Report
  RAISE NOTICE '========================================';
  RAISE NOTICE 'WEEK1-CRITICAL-V1-ORPHAN-BACKFILL: COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total bookings processed: %', v_total_bookings;
  RAISE NOTICE 'Successful bookings: %', v_success_bookings;
  RAISE NOTICE 'Failed bookings: %', v_failed_bookings;
  RAISE NOTICE 'Skipped (no folio): %', v_skipped_no_folio;
  RAISE NOTICE 'Total payments linked: %', v_total_payments_processed;
  RAISE NOTICE '========================================';
  
  -- Phase 2: Report on reserved bookings (will auto-attach on check-in)
  RAISE NOTICE 'PHASE 2: Reserved bookings with orphaned payments (will auto-attach on check-in)';
  
  FOR v_booking IN
    SELECT 
      b.booking_reference,
      b.status AS booking_status,
      COUNT(p.id) AS orphaned_payment_count,
      SUM(p.amount) AS total_amount
    FROM payments p
    JOIN bookings b ON b.id = p.booking_id
    WHERE p.stay_folio_id IS NULL
      AND p.status IN ('success', 'completed')
      AND p.booking_id IS NOT NULL
      AND b.status = 'reserved'
    GROUP BY b.booking_reference, b.status
    ORDER BY b.booking_reference
  LOOP
    RAISE NOTICE 'WEEK1-CRITICAL-V1: Reserved booking % has % orphaned payments (₦%) - Will auto-attach on check-in',
      v_booking.booking_reference,
      v_booking.orphaned_payment_count,
      v_booking.total_amount;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'WEEK1-CRITICAL-V1: Migration complete';
  RAISE NOTICE '========================================';
END;
$$;