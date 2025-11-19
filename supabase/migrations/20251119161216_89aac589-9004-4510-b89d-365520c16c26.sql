-- Migration: Phase 5A - Enforce Organization Credit Limits in Core RPCs
-- Version: CREDIT-LIMIT-ENFORCEMENT-V1
-- Description: Add org limit validation to folio_post_charge, folio_transfer_charge, folio_split_charge, folio_merge

-- ============================================
-- Function 1: folio_post_charge with org limit enforcement
-- ============================================

CREATE OR REPLACE FUNCTION folio_post_charge(
  p_folio_id uuid,
  p_amount numeric,
  p_description text,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_department text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folio stay_folios;
  v_transaction_id uuid;
  v_booking bookings;
  v_org_validation jsonb;
BEGIN
  -- Lock folio
  SELECT * INTO v_folio
  FROM stay_folios
  WHERE id = p_folio_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Folio not found');
  END IF;
  
  IF v_folio.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot post to closed folio');
  END IF;
  
  -- Check if folio belongs to organization booking
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = v_folio.booking_id
    AND tenant_id = v_folio.tenant_id;
  
  IF FOUND AND v_booking.organization_id IS NOT NULL THEN
    -- Validate organization limits
    SELECT validate_org_limits(
      v_booking.organization_id,
      v_folio.guest_id,
      COALESCE(p_department, 'general'),
      p_amount
    ) INTO v_org_validation;
    
    -- Block if not allowed
    IF (v_org_validation->>'allowed')::boolean = false THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Organization credit limit exceeded',
        'code', v_org_validation->>'code',
        'detail', v_org_validation->>'detail'
      );
    END IF;
  END IF;
  
  -- Post charge
  INSERT INTO folio_transactions (
    tenant_id, folio_id, transaction_type, amount, description,
    reference_type, reference_id, department, created_by
  ) VALUES (
    v_folio.tenant_id, p_folio_id, 'charge', p_amount, p_description,
    p_reference_type, p_reference_id, p_department, auth.uid()
  ) RETURNING id INTO v_transaction_id;
  
  -- Update folio balance
  UPDATE stay_folios
  SET 
    total_charges = total_charges + p_amount,
    balance = balance + p_amount,
    updated_at = now()
  WHERE id = p_folio_id;
  
  SELECT row_to_json(f.*)::jsonb INTO v_folio
  FROM stay_folios f
  WHERE id = p_folio_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'folio', v_folio
  );
END;
$$;

-- ============================================
-- Function 2: folio_transfer_charge with org limit enforcement
-- ============================================

CREATE OR REPLACE FUNCTION folio_transfer_charge(
  p_source_folio_id uuid,
  p_target_folio_id uuid,
  p_transaction_id uuid,
  p_amount numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_folio stay_folios;
  v_target_folio stay_folios;
  v_transaction folio_transactions;
  v_new_transaction_id uuid;
  v_target_booking bookings;
  v_org_validation jsonb;
BEGIN
  -- Lock both folios
  SELECT * INTO v_source_folio FROM stay_folios WHERE id = p_source_folio_id FOR UPDATE;
  SELECT * INTO v_target_folio FROM stay_folios WHERE id = p_target_folio_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Source or target folio not found');
  END IF;
  
  IF v_source_folio.status != 'open' OR v_target_folio.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Both folios must be open');
  END IF;
  
  -- Get original transaction
  SELECT * INTO v_transaction FROM folio_transactions WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;
  
  -- Check if target folio belongs to organization booking
  SELECT * INTO v_target_booking
  FROM bookings
  WHERE id = v_target_folio.booking_id
    AND tenant_id = v_target_folio.tenant_id;
  
  IF FOUND AND v_target_booking.organization_id IS NOT NULL THEN
    -- Validate organization limits for target folio
    SELECT validate_org_limits(
      v_target_booking.organization_id,
      v_target_folio.guest_id,
      COALESCE(v_transaction.department, 'general'),
      p_amount
    ) INTO v_org_validation;
    
    -- Block if not allowed
    IF (v_org_validation->>'allowed')::boolean = false THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Target organization credit limit exceeded',
        'code', v_org_validation->>'code',
        'detail', v_org_validation->>'detail'
      );
    END IF;
  END IF;
  
  -- Create reversal on source folio
  INSERT INTO folio_transactions (
    tenant_id, folio_id, transaction_type, amount, description,
    reference_type, reference_id, created_by, metadata
  ) VALUES (
    v_source_folio.tenant_id, p_source_folio_id, 'adjustment', -p_amount,
    'Transfer to ' || v_target_folio.folio_number,
    'transfer', p_transaction_id, auth.uid(),
    jsonb_build_object('transfer_type', 'source', 'target_folio_id', p_target_folio_id)
  );
  
  -- Create charge on target folio
  INSERT INTO folio_transactions (
    tenant_id, folio_id, transaction_type, amount, description,
    reference_type, reference_id, created_by, metadata
  ) VALUES (
    v_target_folio.tenant_id, p_target_folio_id, 'charge', p_amount,
    'Transfer from ' || v_source_folio.folio_number,
    'transfer', p_transaction_id, auth.uid(),
    jsonb_build_object('transfer_type', 'target', 'source_folio_id', p_source_folio_id)
  ) RETURNING id INTO v_new_transaction_id;
  
  -- Update folio balances
  UPDATE stay_folios
  SET 
    total_charges = total_charges - p_amount,
    balance = balance - p_amount,
    updated_at = now()
  WHERE id = p_source_folio_id;
  
  UPDATE stay_folios
  SET 
    total_charges = total_charges + p_amount,
    balance = balance + p_amount,
    updated_at = now()
  WHERE id = p_target_folio_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_new_transaction_id,
    'source_folio_id', p_source_folio_id,
    'target_folio_id', p_target_folio_id
  );
END;
$$;

-- ============================================
-- Function 3: folio_split_charge with org limit enforcement
-- ============================================

CREATE OR REPLACE FUNCTION folio_split_charge(
  p_transaction_id uuid,
  p_splits jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction folio_transactions;
  v_split jsonb;
  v_total_split numeric := 0;
  v_new_transaction_ids uuid[] := ARRAY[]::uuid[];
  v_new_id uuid;
  v_target_folio stay_folios;
  v_target_booking bookings;
  v_org_validation jsonb;
BEGIN
  -- Get original transaction
  SELECT * INTO v_transaction FROM folio_transactions WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;
  
  -- Calculate total split amount
  FOR v_split IN SELECT * FROM jsonb_array_elements(p_splits)
  LOOP
    v_total_split := v_total_split + (v_split->>'amount')::numeric;
  END LOOP;
  
  -- Validate split amounts equal original
  IF ABS(v_total_split - v_transaction.amount) > 0.01 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Split amounts must equal original amount');
  END IF;
  
  -- Validate each target folio for organization limits
  FOR v_split IN SELECT * FROM jsonb_array_elements(p_splits)
  LOOP
    -- Get target folio
    SELECT * INTO v_target_folio
    FROM stay_folios
    WHERE id = (v_split->>'targetFolioId')::uuid;
    
    IF FOUND THEN
      -- Check if target folio belongs to organization booking
      SELECT * INTO v_target_booking
      FROM bookings
      WHERE id = v_target_folio.booking_id
        AND tenant_id = v_target_folio.tenant_id;
      
      IF FOUND AND v_target_booking.organization_id IS NOT NULL THEN
        -- Validate organization limits
        SELECT validate_org_limits(
          v_target_booking.organization_id,
          v_target_folio.guest_id,
          COALESCE(v_transaction.department, 'general'),
          (v_split->>'amount')::numeric
        ) INTO v_org_validation;
        
        -- Block if not allowed
        IF (v_org_validation->>'allowed')::boolean = false THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', 'Target organization credit limit exceeded for folio ' || v_target_folio.folio_number,
            'code', v_org_validation->>'code',
            'detail', v_org_validation->>'detail'
          );
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  -- Create reversal on original folio
  INSERT INTO folio_transactions (
    tenant_id, folio_id, transaction_type, amount, description,
    reference_type, reference_id, created_by, metadata
  ) VALUES (
    v_transaction.tenant_id, v_transaction.folio_id, 'adjustment', -v_transaction.amount,
    'Split charge reversed',
    'split', p_transaction_id, auth.uid(),
    jsonb_build_object('split_type', 'reversal', 'splits', p_splits)
  );
  
  -- Create new charges on target folios
  FOR v_split IN SELECT * FROM jsonb_array_elements(p_splits)
  LOOP
    INSERT INTO folio_transactions (
      tenant_id, folio_id, transaction_type, amount, description,
      reference_type, reference_id, created_by, metadata
    ) VALUES (
      v_transaction.tenant_id, (v_split->>'targetFolioId')::uuid, 'charge', (v_split->>'amount')::numeric,
      v_transaction.description || ' (split)',
      'split', p_transaction_id, auth.uid(),
      jsonb_build_object('split_type', 'new_charge', 'original_transaction_id', p_transaction_id)
    ) RETURNING id INTO v_new_id;
    
    v_new_transaction_ids := array_append(v_new_transaction_ids, v_new_id);
    
    -- Update target folio balance
    UPDATE stay_folios
    SET 
      total_charges = total_charges + (v_split->>'amount')::numeric,
      balance = balance + (v_split->>'amount')::numeric,
      updated_at = now()
    WHERE id = (v_split->>'targetFolioId')::uuid;
  END LOOP;
  
  -- Update original folio balance
  UPDATE stay_folios
  SET 
    total_charges = total_charges - v_transaction.amount,
    balance = balance - v_transaction.amount,
    updated_at = now()
  WHERE id = v_transaction.folio_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_ids', v_new_transaction_ids
  );
END;
$$;

-- ============================================
-- Function 4: folio_merge with org limit enforcement
-- ============================================

CREATE OR REPLACE FUNCTION folio_merge(
  p_source_folio_id uuid,
  p_target_folio_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_folio stay_folios;
  v_target_folio stay_folios;
  v_target_booking bookings;
  v_org_validation jsonb;
BEGIN
  -- Lock both folios
  SELECT * INTO v_source_folio FROM stay_folios WHERE id = p_source_folio_id FOR UPDATE;
  SELECT * INTO v_target_folio FROM stay_folios WHERE id = p_target_folio_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Source or target folio not found');
  END IF;
  
  IF v_source_folio.status != 'open' OR v_target_folio.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Both folios must be open');
  END IF;
  
  IF v_source_folio.booking_id != v_target_folio.booking_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Folios must belong to same booking');
  END IF;
  
  -- Check if target folio belongs to organization booking
  SELECT * INTO v_target_booking
  FROM bookings
  WHERE id = v_target_folio.booking_id
    AND tenant_id = v_target_folio.tenant_id;
  
  IF FOUND AND v_target_booking.organization_id IS NOT NULL THEN
    -- Validate organization limits for the merge amount
    SELECT validate_org_limits(
      v_target_booking.organization_id,
      v_target_folio.guest_id,
      'general',
      v_source_folio.total_charges
    ) INTO v_org_validation;
    
    -- Block if not allowed
    IF (v_org_validation->>'allowed')::boolean = false THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Target organization credit limit exceeded for merge',
        'code', v_org_validation->>'code',
        'detail', v_org_validation->>'detail'
      );
    END IF;
  END IF;
  
  -- Transfer all transactions from source to target
  UPDATE folio_transactions
  SET 
    folio_id = p_target_folio_id,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('merged_from', p_source_folio_id)
  WHERE folio_id = p_source_folio_id;
  
  -- Update target folio totals
  UPDATE stay_folios
  SET 
    total_charges = total_charges + v_source_folio.total_charges,
    total_payments = total_payments + v_source_folio.total_payments,
    balance = balance + v_source_folio.balance,
    updated_at = now()
  WHERE id = p_target_folio_id;
  
  -- Close source folio
  UPDATE stay_folios
  SET 
    status = 'closed',
    total_charges = 0,
    total_payments = 0,
    balance = 0,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('merged_into', p_target_folio_id, 'merged_at', now()),
    updated_at = now()
  WHERE id = p_source_folio_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'source_folio_id', p_source_folio_id,
    'target_folio_id', p_target_folio_id
  );
END;
$$;