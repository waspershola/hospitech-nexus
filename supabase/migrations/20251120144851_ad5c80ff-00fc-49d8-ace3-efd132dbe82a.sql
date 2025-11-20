-- Fix: Ensure folio_id is returned as UUID text, not object
-- GROUP-MASTER-V1.1-FOLIO-ID-FIX

DROP FUNCTION IF EXISTS create_group_master_folio(uuid, text, uuid, uuid, text);

CREATE OR REPLACE FUNCTION create_group_master_folio(
  p_tenant_id UUID,
  p_group_id TEXT,
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
  v_existing_folio_id UUID;  -- 🔥 FIX: Store just the UUID, not entire record
BEGIN
  -- Check if master folio already exists for this group (idempotent)
  SELECT id INTO v_existing_folio_id  -- 🔥 FIX: Select only ID column
  FROM stay_folios
  WHERE tenant_id = p_tenant_id
    AND folio_type = 'group_master'
    AND metadata->>'group_id' = p_group_id;

  IF FOUND THEN
    -- Get folio number for existing folio
    SELECT folio_number INTO v_folio_number
    FROM stay_folios
    WHERE id = v_existing_folio_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'folio_id', v_existing_folio_id::text,  -- 🔥 FIX: Explicit cast to text
      'folio_number', v_folio_number,
      'message', 'Master folio already exists',
      'existing', true
    );
  END IF;

  -- Generate folio number
  v_folio_number := 'MASTER-' || UPPER(SUBSTRING(p_group_id, 1, 8));

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
      'is_master', true
    )
  )
  RETURNING id INTO v_folio_id;

  -- Insert into group_bookings table
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
    p_master_booking_id,
    v_folio_id,
    'open',
    1
  )
  ON CONFLICT (group_id) 
  DO UPDATE SET
    master_folio_id = v_folio_id,
    master_booking_id = p_master_booking_id,
    updated_at = NOW();

  -- Return folio_id as text string
  RETURN jsonb_build_object(
    'success', true,
    'folio_id', v_folio_id::text,  -- 🔥 FIX: Explicit cast to text
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