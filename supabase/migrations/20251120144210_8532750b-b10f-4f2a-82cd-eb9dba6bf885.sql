-- PHASE 1: Fix create_group_master_folio RPC to INSERT into group_bookings
-- Issue: RPC creates stay_folios but NEVER inserts into group_bookings table
-- This causes get_group_master_folio to fail (no group_bookings row exists)

CREATE OR REPLACE FUNCTION public.create_group_master_folio(
  p_tenant_id uuid,
  p_group_id text,
  p_master_booking_id uuid,
  p_guest_id uuid,
  p_group_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- 🔥 FIX: INSERT into group_bookings table
  -- This was MISSING - causing get_group_master_folio to fail
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
    NULL, -- Will be updated later if specified
    p_master_booking_id,
    v_folio_id,
    'open',
    1 -- Initial size, will be updated by trigger
  )
  ON CONFLICT (group_id) 
  DO UPDATE SET
    master_folio_id = v_folio_id,
    master_booking_id = p_master_booking_id,
    updated_at = NOW();

  -- 🔥 FIX: Return folio_id in response
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

COMMENT ON FUNCTION public.create_group_master_folio IS 'CREATE-BOOKING-V3.6-FIX: Creates group master folio AND inserts into group_bookings table';