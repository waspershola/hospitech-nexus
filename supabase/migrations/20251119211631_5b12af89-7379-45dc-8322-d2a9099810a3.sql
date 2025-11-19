-- Drop and recreate create_group_master_folio function with correct column name
-- VERSION: GROUP-MASTER-V1.3-FIX-STATUS-COLUMN

DROP FUNCTION IF EXISTS public.create_group_master_folio(uuid, text, uuid, uuid, text);

CREATE FUNCTION public.create_group_master_folio(
  p_tenant_id uuid,
  p_group_id text,
  p_master_booking_id uuid,
  p_guest_id uuid,
  p_group_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_group_booking RECORD;
  v_existing_master_folio RECORD;
  v_folio_number TEXT;
  v_new_folio_id UUID;
  v_booking RECORD;
  v_room_id UUID;
BEGIN
  -- Idempotency check: If group already has a master folio, return it
  SELECT * INTO v_existing_group_booking
  FROM group_bookings
  WHERE group_id::text = p_group_id
    AND tenant_id = p_tenant_id;
  
  IF FOUND AND v_existing_group_booking.master_folio_id IS NOT NULL THEN
    -- Return existing master folio
    SELECT * INTO v_existing_master_folio
    FROM stay_folios
    WHERE id = v_existing_group_booking.master_folio_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'master_folio_id', v_existing_master_folio.id,
      'folio_number', v_existing_master_folio.folio_number,
      'already_existed', true
    );
  END IF;
  
  -- Get booking details
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_master_booking_id
    AND tenant_id = p_tenant_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Master booking not found'
    );
  END IF;
  
  v_room_id := v_booking.room_id;
  
  -- Generate folio number with GMF prefix
  SELECT 'GMF-' || 
         TO_CHAR(NOW(), 'YYYY') || '-' || 
         TO_CHAR(NOW(), 'MM') || '-' || 
         LPAD((
           SELECT COALESCE(MAX(
             SUBSTRING(folio_number FROM 'GMF-\d{4}-\d{2}-(\d+)')::INTEGER
           ), 0) + 1
           FROM stay_folios
           WHERE tenant_id = p_tenant_id
             AND folio_number LIKE 'GMF-' || TO_CHAR(NOW(), 'YYYY') || '-' || TO_CHAR(NOW(), 'MM') || '-%'
         )::TEXT, 4, '0')
  INTO v_folio_number;
  
  -- Create master folio with correct column name 'status'
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
  ) VALUES (
    p_tenant_id,
    p_master_booking_id,
    p_guest_id,
    v_room_id,
    v_folio_number,
    'group_master',
    'open',
    0,
    0,
    0,
    jsonb_build_object(
      'group_id', p_group_id,
      'group_name', p_group_name,
      'is_group_master', true
    )
  )
  RETURNING id INTO v_new_folio_id;
  
  -- Insert or update group_bookings record
  INSERT INTO group_bookings (
    tenant_id,
    group_id,
    group_name,
    master_booking_id,
    master_folio_id,
    status
  ) VALUES (
    p_tenant_id,
    p_group_id::uuid,
    p_group_name,
    p_master_booking_id,
    v_new_folio_id,
    'active'
  )
  ON CONFLICT (group_id) 
  DO UPDATE SET
    master_booking_id = EXCLUDED.master_booking_id,
    master_folio_id = EXCLUDED.master_folio_id,
    status = 'active',
    updated_at = NOW();
  
  -- Log audit event
  INSERT INTO finance_audit_events (
    tenant_id,
    event_type,
    user_id,
    target_id,
    payload
  ) VALUES (
    p_tenant_id,
    'group_master_folio_created',
    auth.uid(),
    v_new_folio_id,
    jsonb_build_object(
      'group_id', p_group_id,
      'group_name', p_group_name,
      'master_booking_id', p_master_booking_id,
      'folio_number', v_folio_number,
      'method', 'create_group_master_folio',
      'version', 'GROUP-MASTER-V1.3-FIX-STATUS-COLUMN'
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'master_folio_id', v_new_folio_id,
    'folio_number', v_folio_number,
    'already_existed', false
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'sqlstate', SQLSTATE
  );
END;
$function$;