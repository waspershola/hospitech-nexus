-- LEDGER-BLOCKING-FIX-V2: Make ledger entry creation blocking in folio_post_charge
-- Prevents folio charges from succeeding without corresponding ledger entries

-- Drop existing function to recreate with blocking ledger logic
DROP FUNCTION IF EXISTS public.folio_post_charge(uuid, numeric, text, text, uuid, text);

CREATE OR REPLACE FUNCTION public.folio_post_charge(
  p_folio_id UUID,
  p_amount NUMERIC,
  p_description TEXT,
  p_reference_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_department TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folio RECORD;
  v_transaction_id UUID;
  v_ledger_id UUID;
  v_new_total_charges NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Lock folio row
  SELECT * INTO v_folio
  FROM stay_folios
  WHERE id = p_folio_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'FOLIO_NOT_FOUND',
      'error', 'Folio not found',
      'version', 'LEDGER-BLOCKING-FIX-V2'
    );
  END IF;
  
  IF v_folio.status != 'open' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'FOLIO_CLOSED',
      'error', 'Cannot post charge to closed folio',
      'version', 'LEDGER-BLOCKING-FIX-V2'
    );
  END IF;
  
  -- Create folio transaction
  INSERT INTO folio_transactions (
    tenant_id, folio_id, transaction_type, amount, description,
    reference_type, reference_id, department, created_by
  ) VALUES (
    v_folio.tenant_id, p_folio_id, 'charge', p_amount, p_description,
    p_reference_type, p_reference_id, p_department, auth.uid()
  ) RETURNING id INTO v_transaction_id;
  
  RAISE NOTICE '[LEDGER-BLOCKING-FIX-V2] Created folio transaction %', v_transaction_id;
  
  -- BLOCKING: Create ledger DEBIT entry - fail entire transaction if this fails
  BEGIN
    v_ledger_id := insert_ledger_entry(
      p_tenant_id := v_folio.tenant_id,
      p_transaction_type := 'debit'::ledger_transaction_type,
      p_amount := p_amount,
      p_description := p_description,
      p_reference_type := 'folio_transaction',
      p_reference_id := v_transaction_id,
      p_category := 'folio_charge',
      p_source_type := 'folio',
      p_folio_id := p_folio_id,
      p_booking_id := v_folio.booking_id,
      p_guest_id := v_folio.guest_id,
      p_room_id := v_folio.room_id,
      p_department := p_department,
      p_staff_id := (SELECT id FROM staff WHERE user_id = auth.uid() AND tenant_id = v_folio.tenant_id LIMIT 1),
      p_metadata := jsonb_build_object(
        'folio_transaction_id', v_transaction_id,
        'charge_reference_type', p_reference_type,
        'charge_reference_id', p_reference_id,
        'version', 'LEDGER-BLOCKING-FIX-V2'
      )
    );
    
    RAISE NOTICE '[LEDGER-BLOCKING-FIX-V2] Created ledger entry % for folio transaction %', v_ledger_id, v_transaction_id;
    
  EXCEPTION WHEN OTHERS THEN
    -- BLOCKING: Return error instead of continuing without ledger entry
    RAISE WARNING '[LEDGER-BLOCKING-FIX-V2] Ledger entry failed: %', SQLERRM;
    
    RETURN jsonb_build_object(
      'success', false,
      'code', 'LEDGER_INSERT_FAILED',
      'error', 'Failed to post charge to accounting ledger',
      'detail', SQLERRM,
      'folio_transaction_id', v_transaction_id,
      'version', 'LEDGER-BLOCKING-FIX-V2'
    );
  END;
  
  -- Update folio totals
  v_new_total_charges := COALESCE(v_folio.total_charges, 0) + p_amount;
  v_new_balance := v_new_total_charges - COALESCE(v_folio.total_payments, 0);
  
  UPDATE stay_folios
  SET 
    total_charges = v_new_total_charges,
    balance = v_new_balance,
    updated_at = now()
  WHERE id = p_folio_id;
  
  RAISE NOTICE '[LEDGER-BLOCKING-FIX-V2] Updated folio % with new charges ₦% and balance ₦%', 
    p_folio_id, v_new_total_charges, v_new_balance;
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'ledger_id', v_ledger_id,
    'folio_id', p_folio_id,
    'new_total_charges', v_new_total_charges,
    'new_balance', v_new_balance,
    'version', 'LEDGER-BLOCKING-FIX-V2'
  );
END;
$$;

-- Backfill missing ledger entries for existing folio charges
DO $$
DECLARE
  v_missing_count INTEGER := 0;
  v_created_count INTEGER := 0;
  v_folio_txn RECORD;
  v_ledger_id UUID;
BEGIN
  -- Count missing entries by checking if folio_transaction exists in ledger metadata
  SELECT COUNT(*) INTO v_missing_count
  FROM folio_transactions ft
  WHERE ft.transaction_type = 'charge'
    AND NOT EXISTS (
      SELECT 1 FROM ledger_entries le
      WHERE le.folio_id = ft.folio_id
        AND le.metadata->>'folio_transaction_id' = ft.id::text
    );
  
  RAISE NOTICE '[LEDGER-BACKFILL-V2] Found % folio charges without ledger entries', v_missing_count;
  
  IF v_missing_count = 0 THEN
    RAISE NOTICE '[LEDGER-BACKFILL-V2] No missing entries to backfill';
    RETURN;
  END IF;
  
  -- Create missing ledger entries
  FOR v_folio_txn IN
    SELECT 
      ft.id as txn_id,
      ft.tenant_id,
      ft.folio_id,
      ft.amount,
      ft.description,
      ft.reference_type,
      ft.reference_id,
      ft.department,
      ft.created_by,
      ft.created_at,
      sf.booking_id,
      sf.guest_id,
      sf.room_id
    FROM folio_transactions ft
    JOIN stay_folios sf ON sf.id = ft.folio_id
    WHERE ft.transaction_type = 'charge'
      AND NOT EXISTS (
        SELECT 1 FROM ledger_entries le
        WHERE le.folio_id = ft.folio_id
          AND le.metadata->>'folio_transaction_id' = ft.id::text
      )
    ORDER BY ft.created_at
  LOOP
    BEGIN
      -- Create DEBIT ledger entry for this charge
      v_ledger_id := insert_ledger_entry(
        p_tenant_id := v_folio_txn.tenant_id,
        p_transaction_type := 'debit'::ledger_transaction_type,
        p_amount := v_folio_txn.amount,
        p_description := v_folio_txn.description,
        p_reference_type := 'folio_transaction',
        p_reference_id := v_folio_txn.txn_id,
        p_category := 'folio_charge',
        p_source_type := 'folio',
        p_folio_id := v_folio_txn.folio_id,
        p_booking_id := v_folio_txn.booking_id,
        p_guest_id := v_folio_txn.guest_id,
        p_room_id := v_folio_txn.room_id,
        p_department := v_folio_txn.department,
        p_staff_id := (SELECT id FROM staff WHERE user_id = v_folio_txn.created_by AND tenant_id = v_folio_txn.tenant_id LIMIT 1),
        p_metadata := jsonb_build_object(
          'folio_transaction_id', v_folio_txn.txn_id,
          'charge_reference_type', v_folio_txn.reference_type,
          'charge_reference_id', v_folio_txn.reference_id,
          'backfilled', true,
          'original_created_at', v_folio_txn.created_at,
          'version', 'LEDGER-BACKFILL-V2'
        )
      );
      
      v_created_count := v_created_count + 1;
      
      IF v_created_count % 100 = 0 THEN
        RAISE NOTICE '[LEDGER-BACKFILL-V2] Backfilled % of % entries', v_created_count, v_missing_count;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[LEDGER-BACKFILL-V2] Failed to backfill ledger entry for folio_transaction %: %', v_folio_txn.txn_id, SQLERRM;
      -- Continue with next record
    END;
  END LOOP;
  
  RAISE NOTICE '[LEDGER-BACKFILL-V2] Backfill complete: created % ledger entries for folio charges', v_created_count;
END $$;