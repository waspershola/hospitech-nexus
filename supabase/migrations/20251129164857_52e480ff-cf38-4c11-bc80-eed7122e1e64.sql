-- LEDGER-FINAL-FIX-V2: Consolidate folio_post_charge with correct schema

-- Step 1: Drop ALL existing versions of folio_post_charge
DROP FUNCTION IF EXISTS public.folio_post_charge(UUID, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.folio_post_charge(UUID, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.folio_post_charge(UUID, TEXT, NUMERIC, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.folio_post_charge(UUID, TEXT, NUMERIC, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.folio_post_charge(UUID, TEXT, NUMERIC, TEXT);

-- Step 2: Create SINGLE canonical folio_post_charge function
CREATE OR REPLACE FUNCTION public.folio_post_charge(
  p_folio_id UUID,
  p_charge_type TEXT,
  p_amount NUMERIC,
  p_description TEXT,
  p_department TEXT DEFAULT NULL,
  p_category TEXT DEFAULT 'charge',
  p_request_id UUID DEFAULT NULL,
  p_billing_reference_code TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_folio RECORD;
  v_booking RECORD;
  v_transaction_id UUID;
  v_staff_id UUID;
  v_result JSON;
BEGIN
  RAISE NOTICE '[LEDGER-FINAL-FIX-V2] Starting folio_post_charge: folio_id=%, amount=%', p_folio_id, p_amount;

  -- Fetch folio details
  SELECT * INTO v_folio
  FROM stay_folios
  WHERE id = p_folio_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Folio not found: %', p_folio_id;
  END IF;

  IF v_folio.status = 'closed' THEN
    RAISE EXCEPTION 'Cannot post charges to closed folio';
  END IF;

  -- Fetch booking details
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = v_folio.booking_id;

  -- Lookup staff_id from auth.uid() via staff table
  SELECT id INTO v_staff_id
  FROM staff
  WHERE user_id = auth.uid() 
    AND tenant_id = v_folio.tenant_id
  LIMIT 1;

  RAISE NOTICE '[LEDGER-FINAL-FIX-V2] Staff lookup: auth.uid()=%, staff_id=%', auth.uid(), v_staff_id;

  -- Create folio transaction
  INSERT INTO folio_transactions (
    folio_id,
    tenant_id,
    transaction_type,
    amount,
    description,
    department,
    created_by,
    metadata
  ) VALUES (
    p_folio_id,
    v_folio.tenant_id,
    p_charge_type,
    p_amount,
    p_description,
    p_department,
    auth.uid(),
    jsonb_build_object(
      'charge_type', p_charge_type,
      'category', p_category,
      'request_id', p_request_id,
      'billing_reference_code', p_billing_reference_code,
      'version', 'LEDGER-FINAL-FIX-V2'
    )
  )
  RETURNING id INTO v_transaction_id;

  -- Update folio totals
  UPDATE stay_folios
  SET 
    total_charges = total_charges + p_amount,
    balance_due = balance_due + p_amount,
    updated_at = now()
  WHERE id = p_folio_id;

  -- BLOCKING: Create ledger DEBIT entry using insert_ledger_entry RPC
  BEGIN
    PERFORM insert_ledger_entry(
      p_tenant_id := v_folio.tenant_id,
      p_transaction_type := 'debit',
      p_amount := p_amount,
      p_description := p_description,
      p_source_type := 'folio_charge',
      p_folio_id := p_folio_id,
      p_booking_id := v_folio.booking_id,
      p_guest_id := v_booking.guest_id,
      p_room_id := v_booking.room_id,
      p_department := p_department,
      p_staff_id := v_staff_id,
      p_qr_request_id := p_request_id,
      p_metadata := jsonb_build_object(
        'folio_transaction_id', v_transaction_id,
        'charge_type', p_charge_type,
        'category', p_category,
        'billing_reference_code', p_billing_reference_code,
        'version', 'LEDGER-FINAL-FIX-V2'
      )
    );

    RAISE NOTICE '[LEDGER-FINAL-FIX-V2] Ledger DEBIT created via insert_ledger_entry for staff_id=%', v_staff_id;

  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION '[LEDGER-FINAL-FIX-V2] Ledger entry failed: %. Rolling back.', SQLERRM;
  END;

  -- Update request billing status if applicable
  IF p_request_id IS NOT NULL THEN
    UPDATE requests
    SET 
      billing_status = 'posted_to_folio',
      billed_amount = p_amount,
      billed_folio_id = p_folio_id,
      billed_transaction_id = v_transaction_id,
      billed_at = now()
    WHERE id = p_request_id
      AND billing_status != 'posted_to_folio';
  END IF;

  -- Build success response
  v_result := jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'folio_id', p_folio_id,
    'amount', p_amount,
    'new_balance', (SELECT balance_due FROM stay_folios WHERE id = p_folio_id),
    'version', 'LEDGER-FINAL-FIX-V2'
  );

  RETURN v_result;
END;
$$;

-- Step 3: Backfill missing ledger entries using insert_ledger_entry
DO $$
DECLARE
  v_rec RECORD;
  v_staff_id UUID;
  v_backfill_count INT := 0;
BEGIN
  FOR v_rec IN
    SELECT DISTINCT
      ft.id AS ft_id,
      ft.tenant_id,
      ft.amount,
      ft.description,
      ft.folio_id,
      sf.booking_id,
      b.guest_id,
      b.room_id,
      ft.department,
      ft.created_by,
      ft.created_at,
      ft.transaction_type,
      ft.metadata
    FROM folio_transactions ft
    JOIN stay_folios sf ON ft.folio_id = sf.id
    JOIN bookings b ON sf.booking_id = b.id
    LEFT JOIN ledger_entries le ON 
      le.folio_id = ft.folio_id 
      AND le.metadata->>'folio_transaction_id' = ft.id::text
    WHERE ft.transaction_type = 'charge'
      AND le.id IS NULL
      AND ft.created_at >= '2025-11-24'
    ORDER BY ft.created_at
  LOOP
    -- Lookup staff_id from created_by
    SELECT id INTO v_staff_id
    FROM staff
    WHERE user_id = v_rec.created_by 
      AND tenant_id = v_rec.tenant_id
    LIMIT 1;

    -- Create ledger entry using insert_ledger_entry RPC
    BEGIN
      PERFORM insert_ledger_entry(
        p_tenant_id := v_rec.tenant_id,
        p_transaction_type := 'debit',
        p_amount := v_rec.amount,
        p_description := v_rec.description,
        p_source_type := 'folio_charge',
        p_folio_id := v_rec.folio_id,
        p_booking_id := v_rec.booking_id,
        p_guest_id := v_rec.guest_id,
        p_room_id := v_rec.room_id,
        p_department := v_rec.department,
        p_staff_id := v_staff_id,
        p_qr_request_id := (v_rec.metadata->>'request_id')::UUID,
        p_metadata := v_rec.metadata || jsonb_build_object(
          'folio_transaction_id', v_rec.ft_id,
          'backfill_reason', 'Missing ledger entry due to FK error',
          'backfill_date', now(),
          'original_created_at', v_rec.created_at,
          'version', 'LEDGER-FINAL-FIX-V2-BACKFILL'
        )
      );
      
      v_backfill_count := v_backfill_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '[LEDGER-FINAL-FIX-V2-BACKFILL] Failed for ft_id=%: %', v_rec.ft_id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '[LEDGER-FINAL-FIX-V2] Backfilled % missing folio charge ledger entries', v_backfill_count;
END $$;