-- ============================================
-- GROUP BOOKING + GROUP MASTER FOLIO FIXES
-- Version: GROUP-FIX-V1
-- ============================================

-- Fix 1: Ensure create_group_master_folio is idempotent and works correctly
CREATE OR REPLACE FUNCTION create_group_master_folio(
  p_tenant_id UUID,
  p_group_id UUID,
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
  v_result JSONB;
BEGIN
  -- Check if master folio already exists for this group
  SELECT id INTO v_folio_id
  FROM stay_folios
  WHERE tenant_id = p_tenant_id
    AND folio_type = 'group_master'
    AND (metadata->>'group_id')::UUID = p_group_id;
  
  IF v_folio_id IS NOT NULL THEN
    -- Master folio already exists, return it (idempotent)
    RAISE NOTICE '[create_group_master_folio] Master folio already exists: %', v_folio_id;
    SELECT jsonb_build_object(
      'id', id,
      'folio_number', folio_number,
      'already_existed', true
    ) INTO v_result
    FROM stay_folios
    WHERE id = v_folio_id;
    
    RETURN v_result;
  END IF;
  
  -- Generate folio number for group master
  SELECT generate_folio_number(p_tenant_id, p_master_booking_id, 'group_master') INTO v_folio_number;
  
  -- Create new group master folio
  INSERT INTO stay_folios (
    tenant_id,
    booking_id,
    guest_id,
    folio_type,
    folio_number,
    is_primary,
    status,
    total_charges,
    total_payments,
    balance,
    metadata
  ) VALUES (
    p_tenant_id,
    p_master_booking_id,
    p_guest_id,
    'group_master',
    v_folio_number,
    true,
    'open',
    0,
    0,
    0,
    jsonb_build_object(
      'group_id', p_group_id::TEXT,
      'group_name', p_group_name,
      'created_at_booking', true
    )
  )
  RETURNING id INTO v_folio_id;
  
  RAISE NOTICE '[create_group_master_folio] Created master folio: %', v_folio_id;
  
  RETURN jsonb_build_object(
    'id', v_folio_id,
    'folio_number', v_folio_number,
    'already_existed', false
  );
END;
$$;

-- Fix 2: Ensure rooms become "reserved" when booking status is "reserved"
-- Update the sync trigger to handle reserved status
CREATE OR REPLACE FUNCTION sync_room_status_on_booking_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only sync if status actually changed
  IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    
    IF NEW.status = 'checked_in' THEN
      -- Mark room as occupied on check-in
      UPDATE rooms
      SET status = 'occupied'
      WHERE id = NEW.room_id AND tenant_id = NEW.tenant_id;
      
      RAISE NOTICE '[sync_room_status] Room % marked as occupied', NEW.room_id;
      
    ELSIF NEW.status = 'reserved' THEN
      -- Mark room as reserved when booking is reserved
      UPDATE rooms
      SET status = 'reserved'
      WHERE id = NEW.room_id AND tenant_id = NEW.tenant_id;
      
      RAISE NOTICE '[sync_room_status] Room % marked as reserved', NEW.room_id;
      
    ELSIF NEW.status = 'completed' AND OLD.status = 'checked_in' THEN
      -- Only mark as dirty if transitioning from checked_in to completed
      -- (Manual checkout process)
      UPDATE rooms
      SET status = 'dirty'
      WHERE id = NEW.room_id AND tenant_id = NEW.tenant_id;
      
      RAISE NOTICE '[sync_room_status] Room % marked as dirty after checkout', NEW.room_id;
      
    ELSIF NEW.status = 'cancelled' THEN
      -- Mark room as available when booking is cancelled
      UPDATE rooms
      SET status = 'available'
      WHERE id = NEW.room_id AND tenant_id = NEW.tenant_id;
      
      RAISE NOTICE '[sync_room_status] Room % marked as available after cancellation', NEW.room_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger to ensure it fires
DROP TRIGGER IF EXISTS sync_room_status_on_booking_change ON bookings;
CREATE TRIGGER sync_room_status_on_booking_change
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION sync_room_status_on_booking_change();

-- Fix 3: Update get_group_master_folio to work with group_id correctly
CREATE OR REPLACE FUNCTION get_group_master_folio(
  p_tenant_id UUID,
  p_group_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_master_folio JSONB;
  v_child_folios JSONB;
  v_aggregated JSONB;
BEGIN
  -- Get master folio
  SELECT jsonb_build_object(
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
    'created_at', sf.created_at
  ) INTO v_master_folio
  FROM stay_folios sf
  WHERE sf.tenant_id = p_tenant_id
    AND sf.folio_type = 'group_master'
    AND (sf.metadata->>'group_id')::UUID = p_group_id
  LIMIT 1;
  
  -- Get all child folios linked to this master
  SELECT COALESCE(jsonb_agg(
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
  ), '[]'::jsonb) INTO v_child_folios
  FROM stay_folios sf
  LEFT JOIN bookings b ON b.id = sf.booking_id
  LEFT JOIN guests g ON g.id = sf.guest_id
  LEFT JOIN rooms r ON r.id = sf.room_id
  WHERE sf.tenant_id = p_tenant_id
    AND sf.folio_type IN ('room', 'incidental')
    AND (b.metadata->>'group_id')::UUID = p_group_id;
  
  -- Calculate aggregated balances
  SELECT jsonb_build_object(
    'total_charges', COALESCE(SUM(sf.total_charges), 0),
    'total_payments', COALESCE(SUM(sf.total_payments), 0),
    'outstanding_balance', COALESCE(SUM(sf.balance), 0),
    'children_breakdown', COALESCE(jsonb_agg(
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
    ), '[]'::jsonb)
  ) INTO v_aggregated
  FROM stay_folios sf
  LEFT JOIN rooms r ON r.id = sf.room_id
  LEFT JOIN guests g ON g.id = sf.guest_id
  LEFT JOIN bookings b ON b.id = sf.booking_id
  WHERE sf.tenant_id = p_tenant_id
    AND sf.folio_type IN ('room', 'incidental')
    AND (b.metadata->>'group_id')::UUID = p_group_id;
  
  -- Return combined result
  RETURN jsonb_build_object(
    'master_folio', COALESCE(v_master_folio, 'null'::jsonb),
    'child_folios', COALESCE(v_child_folios, '[]'::jsonb),
    'aggregated_balances', COALESCE(v_aggregated, jsonb_build_object(
      'total_charges', 0,
      'total_payments', 0,
      'outstanding_balance', 0,
      'children_breakdown', '[]'::jsonb
    ))
  );
END;
$$;