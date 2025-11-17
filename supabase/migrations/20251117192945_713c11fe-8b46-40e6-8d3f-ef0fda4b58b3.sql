-- Backfill: post unlinked payments to their folios (idempotent)
-- This migration posts payments that were created but failed to link to folios
-- due to the UUID serialization bug in create-payment edge function

DO $$
DECLARE
  r RECORD;
  v_folio_id uuid;
  v_result jsonb;
  v_count integer := 0;
BEGIN
  -- Loop through all unlinked payments for checked-in/completed bookings with open folios
  FOR r IN
    SELECT p.id as payment_id, p.booking_id, p.amount, p.tenant_id
    FROM payments p
    JOIN bookings b ON b.id = p.booking_id
    JOIN stay_folios sf ON sf.booking_id = b.id AND sf.status = 'open'
    WHERE p.stay_folio_id IS NULL
      AND b.status IN ('checked_in','completed')
    ORDER BY p.created_at
  LOOP
    BEGIN
      -- Get the open folio for this booking
      SELECT id INTO v_folio_id
      FROM stay_folios
      WHERE booking_id = r.booking_id AND status = 'open'
      LIMIT 1;
      
      IF v_folio_id IS NOT NULL THEN
        -- Post the payment to the folio using the RPC function
        SELECT folio_post_payment(
          p_folio_id := v_folio_id,
          p_payment_id := r.payment_id,
          p_amount := r.amount
        ) INTO v_result;
        
        v_count := v_count + 1;
        RAISE NOTICE 'Posted payment % to folio %: %', r.payment_id, v_folio_id, v_result;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed to backfill payment %: %', r.payment_id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Backfill complete: % payments posted to folios', v_count;
END$$;