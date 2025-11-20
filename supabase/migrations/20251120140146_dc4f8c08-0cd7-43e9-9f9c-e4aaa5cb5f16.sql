-- GROUP-FIX-V3: Fix function overloading for group master folio creation
-- MARKER: FUNCTION-OVERLOAD-FIX-V1

-- Drop the UUID version of create_group_master_folio to resolve PGRST203 errors
DROP FUNCTION IF EXISTS create_group_master_folio(
  p_tenant_id UUID,
  p_group_id UUID,  -- UUID version (incorrect)
  p_master_booking_id UUID,
  p_guest_id UUID,
  p_group_name TEXT
);

-- Verify the TEXT version exists with correct signature
-- (This should already exist from previous migrations)
CREATE OR REPLACE FUNCTION create_group_master_folio(
  p_tenant_id UUID,
  p_group_id TEXT,  -- TEXT version (correct - matches metadata storage)
  p_master_booking_id UUID,
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
  v_existing_folio RECORD;
BEGIN
  -- Check if master folio already exists for this group (idempotent)
  SELECT * INTO v_existing_folio
  FROM stay_folios
  WHERE tenant_id = p_tenant_id
    AND folio_type = 'group_master'
    AND metadata->>'group_id' = p_group_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'folio_id', v_existing_folio.id,
      'folio_number', v_existing_folio.folio_number,
      'message', 'Master folio already exists',
      'existing', true
    );
  END IF;

  -- Generate folio number
  v_folio_number := 'MASTER-' || UPPER(SUBSTRING(p_group_id::TEXT, 1, 8));

  -- Create group master folio
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
    p_master_booking_id,
    p_guest_id,
    NULL,  -- Master folio has no room
    v_folio_number,
    'group_master',
    'open',
    0,
    0,
    0,
    jsonb_build_object(
      'group_id', p_group_id,
      'group_name', p_group_name,
      'is_master', true
    )
  )
  RETURNING id INTO v_folio_id;

  RETURN jsonb_build_object(
    'success', true,
    'folio_id', v_folio_id,
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

-- Also verify get_group_master_folio expects TEXT for p_group_id
-- This should already exist with TEXT signature
CREATE OR REPLACE FUNCTION get_group_master_folio(
  p_tenant_id UUID,
  p_group_id TEXT  -- TEXT to match metadata storage
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_master_folio RECORD;
  v_child_folios JSONB;
  v_aggregated JSONB;
BEGIN
  -- Get master folio
  SELECT * INTO v_master_folio
  FROM stay_folios
  WHERE tenant_id = p_tenant_id
    AND folio_type = 'group_master'
    AND metadata->>'group_id' = p_group_id
    AND status = 'open';

  -- Get all child folios
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', sf.id,
      'folio_number', sf.folio_number,
      'folio_type', sf.folio_type,
      'booking_id', sf.booking_id,
      'guest_id', sf.guest_id,
      'room_id', sf.room_id,
      'total_charges', sf.total_charges,
      'total_payments', sf.total_payments,
      'balance', sf.balance,
      'status', sf.status,
      'created_at', sf.created_at,
      'booking', jsonb_build_object(
        'booking_reference', b.booking_reference,
        'check_in', b.check_in,
        'check_out', b.check_out
      ),
      'guest', jsonb_build_object(
        'name', g.name,
        'email', g.email,
        'phone', g.phone
      ),
      'room', jsonb_build_object(
        'number', r.number
      )
    )
  ) INTO v_child_folios
  FROM stay_folios sf
  LEFT JOIN bookings b ON b.id = sf.booking_id
  LEFT JOIN guests g ON g.id = sf.guest_id
  LEFT JOIN rooms r ON r.id = sf.room_id
  WHERE sf.tenant_id = p_tenant_id
    AND sf.folio_type = 'room'
    AND b.metadata->>'group_id' = p_group_id;

  -- Calculate aggregated balances
  SELECT jsonb_build_object(
    'total_charges', COALESCE(SUM(total_charges), 0),
    'total_payments', COALESCE(SUM(total_payments), 0),
    'outstanding_balance', COALESCE(SUM(balance), 0),
    'children_breakdown', jsonb_agg(
      jsonb_build_object(
        'folio_id', sf.id,
        'folio_number', sf.folio_number,
        'folio_type', sf.folio_type,
        'room_number', r.number,
        'guest_name', g.name,
        'charges', sf.total_charges,
        'payments', sf.total_payments,
        'balance', sf.balance
      )
    )
  ) INTO v_aggregated
  FROM stay_folios sf
  LEFT JOIN bookings b ON b.id = sf.booking_id
  LEFT JOIN guests g ON g.id = sf.guest_id
  LEFT JOIN rooms r ON r.id = sf.room_id
  WHERE sf.tenant_id = p_tenant_id
    AND sf.folio_type = 'room'
    AND b.metadata->>'group_id' = p_group_id;

  -- Build result
  v_result := jsonb_build_object(
    'master_folio', CASE 
      WHEN v_master_folio.id IS NOT NULL THEN
        jsonb_build_object(
          'id', v_master_folio.id,
          'folio_number', v_master_folio.folio_number,
          'folio_type', v_master_folio.folio_type,
          'booking_id', v_master_folio.booking_id,
          'guest_id', v_master_folio.guest_id,
          'room_id', v_master_folio.room_id,
          'total_charges', v_master_folio.total_charges,
          'total_payments', v_master_folio.total_payments,
          'balance', v_master_folio.balance,
          'status', v_master_folio.status,
          'created_at', v_master_folio.created_at
        )
      ELSE NULL
    END,
    'child_folios', COALESCE(v_child_folios, '[]'::jsonb),
    'aggregated_balances', COALESCE(v_aggregated, jsonb_build_object(
      'total_charges', 0,
      'total_payments', 0,
      'outstanding_balance', 0,
      'children_breakdown', '[]'::jsonb
    ))
  );

  RETURN v_result;
END;
$$;