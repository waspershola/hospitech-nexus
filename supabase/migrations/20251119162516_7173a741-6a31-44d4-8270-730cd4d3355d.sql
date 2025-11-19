-- Migration: Phase 6A - Group Master Folio Database Layer
-- Version: PHASE-6A-GROUP-MASTER-V1

-- 1. Update folio_type constraint to include 'group_master'
ALTER TABLE stay_folios
DROP CONSTRAINT IF EXISTS stay_folios_folio_type_check;

ALTER TABLE stay_folios
ADD CONSTRAINT stay_folios_folio_type_check
CHECK (folio_type IN ('room', 'incidentals', 'corporate', 'group', 'group_master', 'mini_bar', 'spa', 'restaurant'));

-- 2. Update generate_folio_number to support 'group_master' type
CREATE OR REPLACE FUNCTION generate_folio_number(p_tenant_id UUID, p_booking_id UUID, p_folio_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_booking_ref TEXT;
  v_folio_count INTEGER;
  v_type_prefix TEXT;
BEGIN
  SELECT booking_reference INTO v_booking_ref
  FROM bookings
  WHERE id = p_booking_id AND tenant_id = p_tenant_id;
  
  SELECT COUNT(*) INTO v_folio_count
  FROM stay_folios
  WHERE booking_id = p_booking_id AND tenant_id = p_tenant_id;
  
  v_type_prefix := CASE p_folio_type
    WHEN 'room' THEN 'R'
    WHEN 'incidentals' THEN 'I'
    WHEN 'corporate' THEN 'C'
    WHEN 'group' THEN 'G'
    WHEN 'group_master' THEN 'GMF'
    WHEN 'mini_bar' THEN 'MB'
    WHEN 'spa' THEN 'S'
    WHEN 'restaurant' THEN 'RS'
    ELSE 'O'
  END;
  
  RETURN v_booking_ref || '-' || v_type_prefix || '-' || (v_folio_count + 1)::TEXT;
END;
$$;

-- 3. Create RPC: get_group_master_folio
-- Aggregates master folio + all child folios with balances
CREATE OR REPLACE FUNCTION get_group_master_folio(p_tenant_id UUID, p_group_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_master_folio stay_folios;
  v_child_folios JSONB := '[]'::JSONB;
  v_child_folio RECORD;
  v_total_charges NUMERIC := 0;
  v_total_payments NUMERIC := 0;
  v_outstanding_balance NUMERIC := 0;
  v_children_breakdown JSONB := '[]'::JSONB;
BEGIN
  -- Find group master folio for this booking
  SELECT * INTO v_master_folio
  FROM stay_folios
  WHERE booking_id = p_group_booking_id
    AND tenant_id = p_tenant_id
    AND folio_type = 'group_master'
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No group master folio found for this booking',
      'booking_id', p_group_booking_id
    );
  END IF;
  
  -- Calculate master folio's own totals
  v_total_charges := COALESCE(v_master_folio.total_charges, 0);
  v_total_payments := COALESCE(v_master_folio.total_payments, 0);
  v_outstanding_balance := COALESCE(v_master_folio.balance, 0);
  
  -- Fetch all child folios and build breakdown
  FOR v_child_folio IN
    SELECT 
      sf.id,
      sf.folio_number,
      sf.folio_type,
      sf.status,
      COALESCE(sf.total_charges, 0) AS charges,
      COALESCE(sf.total_payments, 0) AS payments,
      COALESCE(sf.balance, 0) AS balance,
      g.name AS guest_name,
      r.number AS room_number
    FROM stay_folios sf
    LEFT JOIN guests g ON g.id = sf.guest_id
    LEFT JOIN rooms r ON r.id = sf.room_id
    WHERE sf.parent_folio_id = v_master_folio.id
      AND sf.tenant_id = p_tenant_id
    ORDER BY sf.created_at
  LOOP
    -- Add to child folios array
    v_child_folios := v_child_folios || jsonb_build_object(
      'folio_id', v_child_folio.id,
      'folio_number', v_child_folio.folio_number,
      'folio_type', v_child_folio.folio_type,
      'status', v_child_folio.status,
      'guest_name', v_child_folio.guest_name,
      'room_number', v_child_folio.room_number,
      'charges', v_child_folio.charges,
      'payments', v_child_folio.payments,
      'balance', v_child_folio.balance
    );
    
    -- Add to children breakdown for aggregated stats
    v_children_breakdown := v_children_breakdown || jsonb_build_object(
      'folio_id', v_child_folio.id,
      'guest_name', v_child_folio.guest_name,
      'charges', v_child_folio.charges,
      'payments', v_child_folio.payments,
      'balance', v_child_folio.balance
    );
    
    -- Aggregate totals (only for open child folios)
    IF v_child_folio.status = 'open' THEN
      v_total_charges := v_total_charges + v_child_folio.charges;
      v_total_payments := v_total_payments + v_child_folio.payments;
      v_outstanding_balance := v_outstanding_balance + v_child_folio.balance;
    END IF;
  END LOOP;
  
  -- Return complete group master folio data
  RETURN jsonb_build_object(
    'success', true,
    'master_folio', row_to_json(v_master_folio)::jsonb,
    'child_folios', v_child_folios,
    'aggregated_balances', jsonb_build_object(
      'total_charges', v_total_charges,
      'total_payments', v_total_payments,
      'outstanding_balance', v_outstanding_balance
    ),
    'children_breakdown', v_children_breakdown
  );
END;
$$;

-- 4. Create RPC: close_child_folio_to_master
-- Closes child folio and moves all transactions to master
CREATE OR REPLACE FUNCTION close_child_folio_to_master(p_child_folio_id UUID, p_master_folio_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_child_folio stay_folios;
  v_master_folio stay_folios;
  v_transaction RECORD;
  v_transfer_count INTEGER := 0;
BEGIN
  -- Lock both folios
  SELECT * INTO v_child_folio
  FROM stay_folios
  WHERE id = p_child_folio_id
  FOR UPDATE;
  
  SELECT * INTO v_master_folio
  FROM stay_folios
  WHERE id = p_master_folio_id
  FOR UPDATE;
  
  -- Validate folios exist
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Child or master folio not found'
    );
  END IF;
  
  -- Validate child folio is actually a child of this master
  IF v_child_folio.parent_folio_id != p_master_folio_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Child folio is not linked to this master folio',
      'child_parent_id', v_child_folio.parent_folio_id,
      'master_id', p_master_folio_id
    );
  END IF;
  
  -- Validate child folio is open
  IF v_child_folio.status != 'open' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Child folio must be open to close to master',
      'current_status', v_child_folio.status
    );
  END IF;
  
  -- Validate master folio is open
  IF v_master_folio.status != 'open' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Master folio must be open to receive child transactions',
      'current_status', v_master_folio.status
    );
  END IF;
  
  -- Move all transactions from child to master
  FOR v_transaction IN
    SELECT * FROM folio_transactions
    WHERE folio_id = p_child_folio_id
      AND tenant_id = v_child_folio.tenant_id
    ORDER BY created_at
  LOOP
    -- Create mirror transaction on master folio
    INSERT INTO folio_transactions (
      tenant_id,
      folio_id,
      transaction_type,
      amount,
      description,
      reference_type,
      reference_id,
      department,
      created_by,
      metadata
    ) VALUES (
      v_master_folio.tenant_id,
      p_master_folio_id,
      v_transaction.transaction_type,
      v_transaction.amount,
      v_transaction.description || ' (from ' || v_child_folio.folio_number || ')',
      'close_to_master',
      v_transaction.id,
      v_transaction.department,
      auth.uid(),
      jsonb_build_object(
        'closed_from_child', p_child_folio_id,
        'child_folio_number', v_child_folio.folio_number,
        'original_transaction_id', v_transaction.id
      )
    );
    
    v_transfer_count := v_transfer_count + 1;
  END LOOP;
  
  -- Update master folio balances
  UPDATE stay_folios
  SET 
    total_charges = total_charges + COALESCE(v_child_folio.total_charges, 0),
    total_payments = total_payments + COALESCE(v_child_folio.total_payments, 0),
    balance = balance + COALESCE(v_child_folio.balance, 0),
    updated_at = NOW()
  WHERE id = p_master_folio_id;
  
  -- Close child folio and zero out balances
  UPDATE stay_folios
  SET 
    status = 'closed_to_master',
    total_charges = 0,
    total_payments = 0,
    balance = 0,
    updated_at = NOW(),
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'closed_to_master_at', NOW(),
      'closed_to_master_folio_id', p_master_folio_id,
      'closed_to_master_folio_number', v_master_folio.folio_number,
      'original_charges', COALESCE(v_child_folio.total_charges, 0),
      'original_payments', COALESCE(v_child_folio.total_payments, 0),
      'original_balance', COALESCE(v_child_folio.balance, 0)
    )
  WHERE id = p_child_folio_id;
  
  -- Log audit event
  INSERT INTO finance_audit_events (
    tenant_id,
    event_type,
    user_id,
    target_id,
    payload
  ) VALUES (
    v_child_folio.tenant_id,
    'child_folio_closed_to_master',
    auth.uid(),
    p_child_folio_id,
    jsonb_build_object(
      'child_folio_id', p_child_folio_id,
      'child_folio_number', v_child_folio.folio_number,
      'master_folio_id', p_master_folio_id,
      'master_folio_number', v_master_folio.folio_number,
      'transactions_transferred', v_transfer_count,
      'closed_charges', COALESCE(v_child_folio.total_charges, 0),
      'closed_payments', COALESCE(v_child_folio.total_payments, 0),
      'closed_balance', COALESCE(v_child_folio.balance, 0)
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'child_folio_id', p_child_folio_id,
    'master_folio_id', p_master_folio_id,
    'transactions_transferred', v_transfer_count,
    'closed_charges', COALESCE(v_child_folio.total_charges, 0),
    'closed_balance', COALESCE(v_child_folio.balance, 0)
  );
END;
$$;

-- 5. Add comment for documentation
COMMENT ON FUNCTION get_group_master_folio IS 'Phase 6A: Fetches group master folio with all child folios and aggregated balances';
COMMENT ON FUNCTION close_child_folio_to_master IS 'Phase 6A: Closes child folio and transfers all transactions to master folio';
