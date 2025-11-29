-- =========================================
-- LEDGER-FINAL-CONSOLIDATED-V1 (Fixed Backfill)
-- =========================================

-- Step 1: Drop ALL folio_post_charge versions
DO $$
DECLARE
  func_sig TEXT;
BEGIN
  FOR func_sig IN
    SELECT pg_get_function_identity_arguments(p.oid)::text
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'folio_post_charge'
      AND n.nspname = 'public'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.folio_post_charge(%s) CASCADE', func_sig);
    RAISE NOTICE 'Dropped: public.folio_post_charge(%s)', func_sig;
  END LOOP;
END;
$$;

-- Step 2: Create canonical version
CREATE OR REPLACE FUNCTION public.folio_post_charge(
  p_folio_id TEXT,
  p_amount NUMERIC,
  p_description TEXT,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_department TEXT DEFAULT NULL,
  p_request_id UUID DEFAULT NULL,
  p_billing_reference_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folio_id UUID;
  v_tenant_id UUID;
  v_booking_id UUID;
  v_guest_id UUID;
  v_room_id UUID;
  v_transaction_id UUID;
  v_new_charges NUMERIC;
  v_new_balance NUMERIC;
  v_staff_id UUID;
  v_current_shift TEXT;
  v_ledger_id UUID;
BEGIN
  BEGIN
    v_folio_id := p_folio_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_FOLIO_ID_FORMAT', 'version', 'LEDGER-FINAL-CONSOLIDATED-V1');
  END;

  SELECT id, tenant_id, booking_id, guest_id, room_id, total_charges
  INTO v_folio_id, v_tenant_id, v_booking_id, v_guest_id, v_room_id, v_new_charges
  FROM stay_folios WHERE id = v_folio_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'FOLIO_NOT_FOUND', 'version', 'LEDGER-FINAL-CONSOLIDATED-V1');
  END IF;
  
  IF (SELECT status FROM stay_folios WHERE id = v_folio_id) != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'FOLIO_CLOSED', 'version', 'LEDGER-FINAL-CONSOLIDATED-V1');
  END IF;

  -- CORRECT staff_id lookup
  SELECT id INTO v_staff_id FROM staff WHERE user_id = auth.uid() AND tenant_id = v_tenant_id LIMIT 1;

  SELECT shift_code INTO v_current_shift FROM cash_drawer_sessions
  WHERE tenant_id = v_tenant_id AND staff_id = v_staff_id AND status = 'open'
  ORDER BY opened_at DESC LIMIT 1;

  INSERT INTO folio_transactions (tenant_id, folio_id, transaction_type, amount, description, reference_type, reference_id, department, created_by, metadata)
  VALUES (v_tenant_id, v_folio_id, 'charge', p_amount, p_description, p_reference_type, p_reference_id, p_department, auth.uid(),
    jsonb_build_object('request_id', p_request_id, 'billing_reference_code', p_billing_reference_code, 'version', 'LEDGER-FINAL-CONSOLIDATED-V1'))
  RETURNING id INTO v_transaction_id;

  v_new_charges := COALESCE(v_new_charges, 0) + p_amount;
  v_new_balance := v_new_charges - COALESCE((SELECT total_payments FROM stay_folios WHERE id = v_folio_id), 0);
  
  UPDATE stay_folios SET total_charges = v_new_charges, balance = v_new_balance, updated_at = NOW() WHERE id = v_folio_id;

  -- BLOCKING ledger insertion
  BEGIN
    SELECT insert_ledger_entry(
      p_tenant_id := v_tenant_id, p_transaction_type := 'debit', p_amount := p_amount, p_description := p_description,
      p_reference_type := 'folio_transaction', p_reference_id := v_transaction_id,
      p_category := COALESCE(p_department, 'front_desk'), p_department := p_department,
      p_source_type := CASE WHEN p_request_id IS NOT NULL THEN 'qr-request' ELSE 'folio_post_charge' END,
      p_folio_id := v_folio_id, p_booking_id := v_booking_id, p_guest_id := v_guest_id, p_room_id := v_room_id,
      p_staff_id := v_staff_id, p_shift := v_current_shift, p_qr_request_id := p_request_id,
      p_metadata := jsonb_build_object('transaction_id', v_transaction_id, 'billing_reference_code', p_billing_reference_code, 'version', 'LEDGER-FINAL-CONSOLIDATED-V1')
    ) INTO v_ledger_id;
    RAISE NOTICE '[LEDGER-FINAL-CONSOLIDATED-V1] Ledger: %', v_ledger_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Ledger failed: % (%)', SQLERRM, SQLSTATE;
  END;

  IF p_request_id IS NOT NULL AND p_billing_reference_code IS NOT NULL THEN
    UPDATE requests SET billing_status = 'posted_to_folio', billed_amount = p_amount, billed_folio_id = v_folio_id,
      billed_transaction_id = v_transaction_id, billed_at = NOW()
    WHERE id = p_request_id AND billing_reference_code = p_billing_reference_code;
  END IF;

  RETURN jsonb_build_object('success', true, 'transaction_id', v_transaction_id, 'ledger_id', v_ledger_id,
    'folio_id', v_folio_id, 'new_balance', v_new_balance, 'total_charges', v_new_charges, 'version', 'LEDGER-FINAL-CONSOLIDATED-V1');
END;
$$;

-- Step 3: Backfill missing entries (fixed join)
DO $$
DECLARE
  v_charge RECORD;
  v_folio RECORD;
  v_staff_id UUID;
  v_ledger_id UUID;
  v_count INTEGER := 0;
BEGIN
  FOR v_charge IN
    SELECT ft.id, ft.tenant_id, ft.folio_id, ft.amount, ft.description, ft.department,
           ft.reference_type, ft.reference_id, ft.created_at, ft.created_by, ft.metadata
    FROM folio_transactions ft
    WHERE ft.transaction_type = 'charge'
      AND NOT EXISTS (
        SELECT 1 FROM ledger_entries le 
        WHERE le.metadata->>'transaction_id' = ft.id::text
      )
    ORDER BY ft.created_at
  LOOP
    SELECT booking_id, guest_id, room_id INTO v_folio FROM stay_folios WHERE id = v_charge.folio_id;
    SELECT id INTO v_staff_id FROM staff WHERE user_id = v_charge.created_by AND tenant_id = v_charge.tenant_id LIMIT 1;
    
    BEGIN
      SELECT insert_ledger_entry(
        p_tenant_id := v_charge.tenant_id, p_transaction_type := 'debit', p_amount := v_charge.amount,
        p_description := v_charge.description, p_reference_type := 'folio_transaction', p_reference_id := v_charge.id,
        p_category := COALESCE(v_charge.department, 'front_desk'), p_department := v_charge.department,
        p_source_type := 'folio_post_charge', p_folio_id := v_charge.folio_id,
        p_booking_id := v_folio.booking_id, p_guest_id := v_folio.guest_id, p_room_id := v_folio.room_id,
        p_staff_id := v_staff_id, p_qr_request_id := (v_charge.metadata->>'request_id')::UUID,
        p_metadata := jsonb_build_object('transaction_id', v_charge.id, 'backfilled', true,
          'backfill_reason', 'LEDGER-FINAL-CONSOLIDATED-V1', 'original_created_at', v_charge.created_at)
      ) INTO v_ledger_id;
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[BACKFILL] Failed %: %', v_charge.id, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE '[BACKFILL] Created % entries', v_count;
END;
$$;