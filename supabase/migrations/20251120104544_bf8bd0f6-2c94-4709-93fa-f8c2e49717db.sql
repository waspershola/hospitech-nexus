-- Fix Manual-Only PMS Principle: Comprehensive Fix
-- Date: 2025-11-20

-- Fix sync trigger to NEVER auto-release rooms
CREATE OR REPLACE FUNCTION sync_room_status_with_bookings()
RETURNS TRIGGER AS $$
DECLARE
  checked_in_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO checked_in_count
  FROM bookings
  WHERE room_id = COALESCE(NEW.room_id, OLD.room_id)
    AND status = 'checked_in';
  
  IF checked_in_count > 0 THEN
    UPDATE rooms SET status = 'occupied' 
    WHERE id = COALESCE(NEW.room_id, OLD.room_id)
      AND status NOT IN ('maintenance', 'out_of_order');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enhance prevent_auto_checkout
CREATE OR REPLACE FUNCTION prevent_auto_checkout()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.metadata->'emergency_rollback' IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    IF NEW.metadata->>'checked_out_by' IS NULL THEN
      RAISE EXCEPTION 'Cannot complete booking: Must be checked out by staff via proper checkout flow';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create diagnostics RPC
CREATE OR REPLACE FUNCTION booking_room_integrity_diagnostics(p_tenant_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rooms_mismatch JSONB;
  v_checked_in_without_folio JSONB;
  v_groups_without_master JSONB;
BEGIN
  SELECT jsonb_agg(row_to_json(t)) INTO v_rooms_mismatch
  FROM (
    SELECT r.id AS room_id, r.number, r.status AS room_status, b.id AS booking_id,
           b.booking_reference, b.status AS booking_status
    FROM rooms r JOIN bookings b ON b.room_id = r.id
    WHERE b.tenant_id = p_tenant_id AND r.tenant_id = p_tenant_id
      AND b.status = 'checked_in' AND r.status != 'occupied'
    LIMIT 100
  ) t;
  
  SELECT jsonb_agg(row_to_json(t)) INTO v_checked_in_without_folio
  FROM (
    SELECT b.id AS booking_id, b.booking_reference, r.number AS room_number
    FROM bookings b
    JOIN rooms r ON r.id = b.room_id
    LEFT JOIN stay_folios f ON f.booking_id = b.id AND f.status = 'open'
    WHERE b.tenant_id = p_tenant_id AND b.status = 'checked_in' AND f.id IS NULL
    LIMIT 100
  ) t;
  
  SELECT jsonb_agg(row_to_json(t)) INTO v_groups_without_master
  FROM (
    SELECT b.metadata->>'group_id' AS group_id, COUNT(DISTINCT b.id) AS booking_count
    FROM bookings b LEFT JOIN stay_folios sf ON sf.booking_id = b.id
    WHERE b.tenant_id = p_tenant_id AND b.metadata ? 'group_id'
    GROUP BY b.metadata->>'group_id'
    HAVING NOT BOOL_OR(sf.folio_type = 'group_master')
    LIMIT 100
  ) t;
  
  RETURN jsonb_build_object(
    'rooms_mismatch', COALESCE(v_rooms_mismatch, '[]'::jsonb),
    'checked_in_without_folio', COALESCE(v_checked_in_without_folio, '[]'::jsonb),
    'groups_without_master', COALESCE(v_groups_without_master, '[]'::jsonb)
  );
END;
$$;