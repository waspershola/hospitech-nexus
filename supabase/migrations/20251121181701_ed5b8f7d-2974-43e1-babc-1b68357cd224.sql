-- GROUP-BILLING-FIX-V1: Phase 2 - Fix Master Folio Architecture + Phase 3 Helper RPC
-- This migration fixes the core architectural issue where master folios are incorrectly
-- linked to specific bookings, preventing child folios from being created properly.

-- PART 1: Fix create_group_master_folio to NOT link master folio to any booking
DROP FUNCTION IF EXISTS create_group_master_folio(uuid, text, uuid, uuid, text);

CREATE OR REPLACE FUNCTION create_group_master_folio(
  p_tenant_id UUID,
  p_group_id TEXT,
  p_guest_id UUID,
  p_group_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_folio_id UUID;
  v_folio_number TEXT;
  v_existing_folio_id UUID;
BEGIN
  -- Check if master folio already exists for this group (idempotent)
  SELECT id INTO v_existing_folio_id
  FROM stay_folios
  WHERE tenant_id = p_tenant_id
    AND folio_type = 'group_master'
    AND metadata->>'group_id' = p_group_id;

  IF FOUND THEN
    SELECT folio_number INTO v_folio_number
    FROM stay_folios
    WHERE id = v_existing_folio_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'folio_id', v_existing_folio_id::text,
      'folio_number', v_folio_number,
      'message', 'Master folio already exists',
      'existing', true
    );
  END IF;

  -- Generate folio number
  v_folio_number := 'MASTER-' || UPPER(SUBSTRING(p_group_id, 1, 8));

  -- Create group master folio with NULL booking_id (not linked to specific room)
  INSERT INTO stay_folios (
    tenant_id,
    booking_id,
    guest_id,
    room_id,
    folio_number,
    folio_type,
    status,
    total_charges,
    total_payments,
    balance,
    metadata
  )
  VALUES (
    p_tenant_id,
    NULL,  -- 🔥 FIX: Master folio is NOT linked to any specific booking
    p_guest_id,
    NULL,
    v_folio_number,
    'group_master',
    'open',
    0,
    0,
    0,
    jsonb_build_object(
      'group_id', p_group_id,
      'group_name', p_group_name,
      'is_master', true,
      'created_via', 'GROUP-BILLING-FIX-V1'
    )
  )
  RETURNING id INTO v_folio_id;

  -- Insert into group_bookings table without master_booking_id
  INSERT INTO group_bookings (
    tenant_id,
    group_id,
    group_name,
    group_leader,
    master_booking_id,
    master_folio_id,
    status,
    group_size
  )
  VALUES (
    p_tenant_id,
    p_group_id::uuid,
    p_group_name,
    NULL,
    NULL,  -- 🔥 FIX: No master_booking_id since master folio is not linked to a room
    v_folio_id,
    'reserved',
    0
  )
  ON CONFLICT (group_id) 
  DO UPDATE SET
    master_folio_id = v_folio_id,
    updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'folio_id', v_folio_id::text,
    'folio_number', v_folio_number,
    'message', 'Master folio created successfully',
    'existing', false
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to create master folio'
    );
END;
$$;

COMMENT ON FUNCTION create_group_master_folio IS 'GROUP-BILLING-FIX-V1: Creates group master folio NOT linked to any specific booking';

-- PART 2: Create sync_master_folio_totals helper RPC for Phase 3
CREATE OR REPLACE FUNCTION sync_master_folio_totals(p_master_folio_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_total_charges NUMERIC := 0;
  v_total_payments NUMERIC := 0;
  v_balance NUMERIC := 0;
  v_child_count INTEGER := 0;
BEGIN
  -- Get tenant_id from master folio
  SELECT tenant_id INTO v_tenant_id
  FROM stay_folios
  WHERE id = p_master_folio_id
    AND folio_type = 'group_master';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Master folio not found'
    );
  END IF;

  -- Aggregate totals from all child folios
  SELECT 
    COALESCE(SUM(total_charges), 0),
    COALESCE(SUM(total_payments), 0),
    COALESCE(SUM(balance), 0),
    COUNT(*)
  INTO v_total_charges, v_total_payments, v_balance, v_child_count
  FROM stay_folios
  WHERE parent_folio_id = p_master_folio_id
    AND tenant_id = v_tenant_id
    AND status = 'open';

  -- Update master folio with aggregated totals
  UPDATE stay_folios
  SET 
    total_charges = v_total_charges,
    total_payments = v_total_payments,
    balance = v_balance,
    updated_at = NOW()
  WHERE id = p_master_folio_id
    AND tenant_id = v_tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'master_folio_id', p_master_folio_id,
    'total_charges', v_total_charges,
    'total_payments', v_total_payments,
    'balance', v_balance,
    'child_count', v_child_count
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION sync_master_folio_totals IS 'GROUP-BILLING-FIX-V1: Aggregates child folio totals to master folio';