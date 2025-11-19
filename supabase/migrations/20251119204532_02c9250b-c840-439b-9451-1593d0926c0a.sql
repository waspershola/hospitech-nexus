-- Fix create_group_master_folio to accept text group_id and cast internally
-- Version: GROUP-MASTER-V1.1-TEXT-UUID-FIX

CREATE OR REPLACE FUNCTION create_group_master_folio(
  p_tenant_id uuid,
  p_group_id text,  -- Changed from uuid to text to handle JS client serialization
  p_master_booking_id uuid,
  p_guest_id uuid,
  p_group_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_uuid uuid;
  v_folio_id uuid;
  v_folio_number text;
  v_existing_group_id uuid;
  v_existing_master_folio_id uuid;
BEGIN
  -- Cast text to uuid with validation
  BEGIN
    v_group_uuid := p_group_id::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid UUID format for group_id: %', p_group_id;
  END;

  -- Check if group_bookings record already exists
  SELECT id, master_folio_id 
  INTO v_existing_group_id, v_existing_master_folio_id
  FROM group_bookings
  WHERE group_id = v_group_uuid AND tenant_id = p_tenant_id;

  -- If group_bookings exists and has master_folio_id, return existing folio
  IF v_existing_group_id IS NOT NULL AND v_existing_master_folio_id IS NOT NULL THEN
    SELECT folio_number INTO v_folio_number
    FROM stay_folios
    WHERE id = v_existing_master_folio_id;

    RETURN jsonb_build_object(
      'id', v_existing_master_folio_id,
      'folio_number', v_folio_number,
      'already_existed', true
    );
  END IF;

  -- Generate folio number
  v_folio_number := 'GMF-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(gen_random_uuid()::text, 1, 6));

  -- Create master folio
  INSERT INTO stay_folios (
    tenant_id,
    guest_id,
    booking_id,
    folio_number,
    folio_type,
    folio_status,
    total_charges,
    total_payments,
    balance
  ) VALUES (
    p_tenant_id,
    p_guest_id,
    p_master_booking_id,
    v_folio_number,
    'group_master',
    'open',
    0,
    0,
    0
  )
  RETURNING id INTO v_folio_id;

  -- Create or update group_bookings record
  IF v_existing_group_id IS NOT NULL THEN
    -- Update existing group_bookings with master_folio_id
    UPDATE group_bookings
    SET 
      master_folio_id = v_folio_id,
      master_booking_id = p_master_booking_id,
      updated_at = now()
    WHERE id = v_existing_group_id;
  ELSE
    -- Create new group_bookings record
    INSERT INTO group_bookings (
      tenant_id,
      group_id,
      group_name,
      master_booking_id,
      master_folio_id,
      status
    ) VALUES (
      p_tenant_id,
      v_group_uuid,
      p_group_name,
      p_master_booking_id,
      v_folio_id,
      'active'
    );
  END IF;

  RETURN jsonb_build_object(
    'id', v_folio_id,
    'folio_number', v_folio_number,
    'already_existed', false
  );
END;
$$;