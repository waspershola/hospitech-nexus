-- BACKFILL-WALLET-V1: Post existing wallet credit payments to folios and create ledger entries
-- This migration fixes wallet payments that were created but never posted to folios or recorded in ledger

DO $$
DECLARE
  v_payment RECORD;
  v_folio_result JSONB;
  v_processed_count INTEGER := 0;
  v_failed_count INTEGER := 0;
BEGIN
  RAISE NOTICE '[BACKFILL-WALLET-V1] Starting wallet payment backfill...';
  
  -- Process each wallet_credit payment that hasn't been posted to a folio
  FOR v_payment IN
    SELECT 
      p.id,
      p.tenant_id,
      p.booking_id,
      p.guest_id,
      p.amount,
      p.transaction_ref,
      p.recorded_by,
      p.wallet_id,
      sf.id as folio_id,
      s.id as staff_id
    FROM payments p
    JOIN stay_folios sf ON sf.booking_id = p.booking_id AND sf.status = 'open'
    LEFT JOIN staff s ON s.user_id = p.recorded_by AND s.tenant_id = p.tenant_id
    WHERE p.method = 'wallet_credit'
      AND p.status = 'success'
      AND p.stay_folio_id IS NULL
      AND p.booking_id IS NOT NULL
    ORDER BY p.created_at ASC
  LOOP
    BEGIN
      RAISE NOTICE '[BACKFILL-WALLET-V1] Processing payment % (₦%, booking: %)', 
        v_payment.id, v_payment.amount, v_payment.booking_id;
      
      -- Post to folio using execute_payment_posting RPC
      SELECT execute_payment_posting(
        v_payment.tenant_id,
        v_payment.booking_id,
        v_payment.id,
        v_payment.amount
      ) INTO v_folio_result;
      
      IF (v_folio_result->>'success')::BOOLEAN THEN
        RAISE NOTICE '[BACKFILL-WALLET-V1] ✅ Posted payment % to folio', v_payment.id;
        
        -- Create ledger entry for this wallet payment
        PERFORM insert_ledger_entry(
          p_tenant_id := v_payment.tenant_id,
          p_transaction_type := 'credit',
          p_amount := v_payment.amount,
          p_description := 'Wallet credit applied (backfilled)',
          p_reference_type := 'wallet_payment',
          p_reference_id := v_payment.id,
          p_payment_method := 'wallet_credit',
          p_category := 'wallet_deduction',
          p_source_type := 'wallet',
          p_booking_id := v_payment.booking_id,
          p_guest_id := v_payment.guest_id,
          p_staff_id := v_payment.staff_id,
          p_metadata := jsonb_build_object(
            'wallet_id', v_payment.wallet_id,
            'wallet_debit', true,
            'backfilled', true,
            'source', 'backfill-wallet-payments',
            'version', 'BACKFILL-WALLET-V1'
          )
        );
        
        RAISE NOTICE '[BACKFILL-WALLET-V1] ✅ Created ledger entry for payment %', v_payment.id;
        v_processed_count := v_processed_count + 1;
      ELSE
        RAISE WARNING '[BACKFILL-WALLET-V1] ⚠️  Failed to post payment %: %', 
          v_payment.id, v_folio_result->>'error';
        v_failed_count := v_failed_count + 1;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[BACKFILL-WALLET-V1] ❌ Exception processing payment %: %', 
        v_payment.id, SQLERRM;
      v_failed_count := v_failed_count + 1;
    END;
  END LOOP;
  
  RAISE NOTICE '[BACKFILL-WALLET-V1] Backfill complete - Processed: %, Failed: %', 
    v_processed_count, v_failed_count;
    
END;
$$;