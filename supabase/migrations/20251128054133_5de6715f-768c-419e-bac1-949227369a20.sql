-- Backfill existing transactions to ledger
-- Version: LEDGER-BACKFILL-V1
-- This is a one-time migration to populate ledger with historical transactions

DO $$
DECLARE
  v_count INTEGER := 0;
  v_payment RECORD;
  v_folio_txn RECORD;
  v_wallet_txn RECORD;
BEGIN
  RAISE NOTICE '[LEDGER-BACKFILL-V1] Starting backfill of historical transactions';
  
  -- Backfill payments from last 90 days
  FOR v_payment IN
    SELECT p.*, b.guest_id, b.room_id, r.number as room_number, g.name as guest_name
    FROM payments p
    LEFT JOIN bookings b ON b.id = p.booking_id
    LEFT JOIN rooms r ON r.id = b.room_id
    LEFT JOIN guests g ON g.id = b.guest_id
    WHERE p.created_at > NOW() - INTERVAL '90 days'
      AND p.status IN ('success', 'completed')
      AND NOT EXISTS (
        SELECT 1 FROM ledger_entries
        WHERE metadata->>'payment_id' = p.id::text
      )
    ORDER BY p.created_at ASC
    LIMIT 1000
  LOOP
    BEGIN
      PERFORM insert_ledger_entry(
        p_tenant_id := v_payment.tenant_id,
        p_transaction_type := 'credit'::ledger_transaction_type,
        p_amount := v_payment.amount,
        p_description := 'Payment received - ' || COALESCE(v_payment.method, 'N/A'),
        p_reference_type := 'payment',
        p_reference_id := v_payment.id,
        p_payment_method := v_payment.method,
        p_provider_id := v_payment.provider_id,
        p_location_id := v_payment.location_id,
        p_department := v_payment.department,
        p_category := 'payment_received',
        p_booking_id := v_payment.booking_id,
        p_guest_id := v_payment.guest_id,
        p_staff_id := v_payment.recorded_by,
        p_metadata := jsonb_build_object(
          'payment_id', v_payment.id,
          'transaction_ref', v_payment.transaction_ref,
          'payment_type', v_payment.payment_type,
          'guest_name', v_payment.guest_name,
          'room_number', v_payment.room_number,
          'backfilled', true,
          'version', 'LEDGER-BACKFILL-V1'
        )
      );
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[LEDGER-BACKFILL-V1] Failed to backfill payment %: %', v_payment.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '[LEDGER-BACKFILL-V1] Backfilled % payments', v_count;
  
  -- Backfill folio transactions from last 90 days
  v_count := 0;
  FOR v_folio_txn IN
    SELECT ft.*, sf.folio_number, sf.folio_type, sf.booking_id, sf.guest_id, 
           g.name as guest_name, r.number as room_number
    FROM folio_transactions ft
    JOIN stay_folios sf ON sf.id = ft.folio_id
    LEFT JOIN guests g ON g.id = sf.guest_id
    LEFT JOIN rooms r ON r.id = sf.room_id
    WHERE ft.created_at > NOW() - INTERVAL '90 days'
      AND NOT EXISTS (
        SELECT 1 FROM ledger_entries
        WHERE metadata->>'folio_transaction_id' = ft.id::text
      )
    ORDER BY ft.created_at ASC
    LIMIT 1000
  LOOP
    BEGIN
      PERFORM insert_ledger_entry(
        p_tenant_id := v_folio_txn.tenant_id,
        p_transaction_type := CASE 
          WHEN v_folio_txn.transaction_type = 'payment' THEN 'credit'::ledger_transaction_type
          WHEN v_folio_txn.transaction_type = 'charge' THEN 'debit'::ledger_transaction_type
          WHEN v_folio_txn.transaction_type = 'refund' THEN 'refund'::ledger_transaction_type
          ELSE 'debit'::ledger_transaction_type
        END,
        p_amount := ABS(v_folio_txn.amount),
        p_description := v_folio_txn.description,
        p_reference_type := 'folio_transaction',
        p_reference_id := v_folio_txn.id,
        p_category := v_folio_txn.transaction_type,
        p_folio_id := v_folio_txn.folio_id,
        p_booking_id := v_folio_txn.booking_id,
        p_guest_id := v_folio_txn.guest_id,
        p_department := v_folio_txn.department,
        p_staff_id := v_folio_txn.created_by,
        p_metadata := jsonb_build_object(
          'folio_transaction_id', v_folio_txn.id,
          'folio_number', v_folio_txn.folio_number,
          'folio_type', v_folio_txn.folio_type,
          'guest_name', v_folio_txn.guest_name,
          'room_number', v_folio_txn.room_number,
          'backfilled', true,
          'version', 'LEDGER-BACKFILL-V1'
        )
      );
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[LEDGER-BACKFILL-V1] Failed to backfill folio transaction %: %', v_folio_txn.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '[LEDGER-BACKFILL-V1] Backfilled % folio transactions', v_count;
  
  -- Backfill wallet transactions from last 90 days
  v_count := 0;
  FOR v_wallet_txn IN
    SELECT wt.*, w.wallet_type, w.owner_id,
           CASE WHEN w.wallet_type = 'guest' THEN g.name 
                WHEN w.wallet_type = 'organization' THEN o.name 
                ELSE NULL END as owner_name,
           p.booking_id, b.room_id, r.number as room_number
    FROM wallet_transactions wt
    JOIN wallets w ON w.id = wt.wallet_id
    LEFT JOIN guests g ON g.id = w.owner_id AND w.wallet_type = 'guest'
    LEFT JOIN organizations o ON o.id = w.owner_id AND w.wallet_type = 'organization'
    LEFT JOIN payments p ON p.id = wt.payment_id
    LEFT JOIN bookings b ON b.id = p.booking_id
    LEFT JOIN rooms r ON r.id = b.room_id
    WHERE wt.created_at > NOW() - INTERVAL '90 days'
      AND NOT EXISTS (
        SELECT 1 FROM ledger_entries
        WHERE metadata->>'wallet_transaction_id' = wt.id::text
      )
    ORDER BY wt.created_at ASC
    LIMIT 1000
  LOOP
    BEGIN
      PERFORM insert_ledger_entry(
        p_tenant_id := v_wallet_txn.tenant_id,
        p_transaction_type := CASE 
          WHEN v_wallet_txn.type = 'credit' THEN 'credit'::ledger_transaction_type
          WHEN v_wallet_txn.type = 'debit' THEN 'debit'::ledger_transaction_type
          ELSE 'credit'::ledger_transaction_type
        END,
        p_amount := v_wallet_txn.amount,
        p_description := COALESCE(v_wallet_txn.description, 'Wallet transaction'),
        p_reference_type := 'wallet_transaction',
        p_reference_id := v_wallet_txn.id,
        p_payment_method := CASE 
          WHEN v_wallet_txn.type = 'credit' THEN 'wallet_topup'
          WHEN v_wallet_txn.type = 'debit' THEN 'wallet_deduction'
          ELSE 'wallet'
        END,
        p_category := CASE 
          WHEN v_wallet_txn.type = 'credit' THEN 'wallet_topup'
          WHEN v_wallet_txn.type = 'debit' THEN 'wallet_deduction'
          ELSE 'wallet_transaction'
        END,
        p_booking_id := v_wallet_txn.booking_id,
        p_guest_id := CASE WHEN v_wallet_txn.wallet_type = 'guest' THEN v_wallet_txn.owner_id ELSE NULL END,
        p_organization_id := CASE WHEN v_wallet_txn.wallet_type = 'organization' THEN v_wallet_txn.owner_id ELSE NULL END,
        p_staff_id := v_wallet_txn.created_by,
        p_metadata := jsonb_build_object(
          'wallet_transaction_id', v_wallet_txn.id,
          'wallet_id', v_wallet_txn.wallet_id,
          'wallet_type', v_wallet_txn.wallet_type,
          'owner_name', v_wallet_txn.owner_name,
          'room_number', v_wallet_txn.room_number,
          'backfilled', true,
          'version', 'LEDGER-BACKFILL-V1'
        )
      );
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[LEDGER-BACKFILL-V1] Failed to backfill wallet transaction %: %', v_wallet_txn.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '[LEDGER-BACKFILL-V1] Backfilled % wallet transactions', v_count;
  RAISE NOTICE '[LEDGER-BACKFILL-V1] Backfill complete';
END $$;