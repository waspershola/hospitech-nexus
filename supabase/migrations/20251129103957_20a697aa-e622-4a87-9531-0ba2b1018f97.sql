-- LEDGER-BACKFILL-V1: Backfill missing ledger entries for double-entry accounting

DO $$
DECLARE
  v_debit_count INTEGER := 0;
  v_method_count INTEGER := 0;
  v_source_count INTEGER := 0;
BEGIN
  RAISE NOTICE '[LEDGER-BACKFILL-V1] Starting backfill...';
  
  -- Step 1: Create missing DEBIT entries for wallet payments that only have CREDIT
  INSERT INTO ledger_entries (
    tenant_id, transaction_type, amount, description, transaction_category,
    payment_method, source_type, payment_id,
    booking_id, guest_id, guest_name, staff_id_initiated, metadata, status, created_at
  )
  SELECT 
    le.tenant_id,
    'wallet_deduction'::ledger_transaction_type,
    le.amount,
    REPLACE(le.description, 'credit applied', 'deduction'),
    'wallet_deduction',
    'wallet_credit',
    'wallet',
    le.payment_id,
    le.booking_id,
    le.guest_id,
    le.guest_name,
    le.staff_id_initiated,
    jsonb_build_object('backfilled_debit', true, 'source_credit_id', le.id, 'version', 'LEDGER-BACKFILL-V1'),
    'completed',
    le.created_at
  FROM ledger_entries le
  WHERE le.source_type = 'wallet'
    AND le.transaction_type = 'credit'
    AND le.payment_method = 'wallet_credit'
    AND NOT EXISTS (
      SELECT 1 FROM ledger_entries d 
      WHERE d.booking_id = le.booking_id 
        AND d.transaction_type = 'wallet_deduction'
        AND d.source_type = 'wallet'
        AND d.amount = le.amount
        AND d.created_at BETWEEN le.created_at - INTERVAL '10 minutes' AND le.created_at + INTERVAL '10 minutes'
    );
  
  GET DIAGNOSTICS v_debit_count = ROW_COUNT;
  RAISE NOTICE '[LEDGER-BACKFILL-V1] Created % missing wallet DEBIT entries', v_debit_count;
  
  -- Step 2: Populate payment_method_id for entries with NULL FK but valid TEXT
  UPDATE ledger_entries le
  SET payment_method_id = pm.id
  FROM payment_methods pm
  WHERE le.payment_method_id IS NULL
    AND le.payment_method IS NOT NULL
    AND pm.tenant_id = le.tenant_id
    AND (
      LOWER(pm.method_name) = LOWER(le.payment_method)
      OR LOWER(pm.method_type) = LOWER(le.payment_method)
    );
  
  GET DIAGNOSTICS v_method_count = ROW_COUNT;
  RAISE NOTICE '[LEDGER-BACKFILL-V1] Populated payment_method_id for % entries', v_method_count;
  
  -- Step 3: Fix source_type values (underscore to hyphen for consistency)
  UPDATE ledger_entries
  SET source_type = CASE
    WHEN source_type = 'qr_request' THEN 'qr-request'
    WHEN source_type = 'checkin_guest' THEN 'checkin-guest'
    WHEN source_type = 'folio' AND transaction_category = 'room_charge' THEN 'checkin-guest'
    ELSE source_type
  END
  WHERE source_type IN ('qr_request', 'checkin_guest')
    OR (source_type = 'folio' AND transaction_category = 'room_charge');
  
  GET DIAGNOSTICS v_source_count = ROW_COUNT;
  RAISE NOTICE '[LEDGER-BACKFILL-V1] Fixed source_type for % entries', v_source_count;
  
  RAISE NOTICE '[LEDGER-BACKFILL-V1] Complete - Debit: %, Method FK: %, Source: %', 
    v_debit_count, v_method_count, v_source_count;
END;
$$;