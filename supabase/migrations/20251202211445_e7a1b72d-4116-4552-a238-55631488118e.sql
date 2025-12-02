-- SAFE-AVAILABILITY-CHECK-V1: Date-only comparison for same-day turnover support
-- A room checking out on Dec 3 IS available for check-in on Dec 3

CREATE OR REPLACE FUNCTION public.check_room_availability_for_dates(
  p_tenant_id UUID,
  p_room_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_conflict RECORD;
  v_has_conflict BOOLEAN;
BEGIN
  -- Find any conflicting active booking using DATE comparison
  -- Overlap rule: existing.check_in_date < new.check_out_date AND existing.check_out_date > new.check_in_date
  SELECT b.id, b.booking_reference, b.status,
         (b.check_in::date) as check_in_date,
         (b.check_out::date) as check_out_date
  INTO v_conflict
  FROM bookings b
  WHERE b.tenant_id = p_tenant_id
    AND b.room_id = p_room_id
    AND b.status IN ('reserved', 'checked_in', 'confirmed')
    AND (p_exclude_booking_id IS NULL OR b.id != p_exclude_booking_id)
    AND (b.check_in::date) < p_check_out  -- existing check_in DATE < new check_out DATE
    AND (b.check_out::date) > p_check_in  -- existing check_out DATE > new check_in DATE
  LIMIT 1;
  
  v_has_conflict := v_conflict.id IS NOT NULL;
  
  RETURN jsonb_build_object(
    'available', NOT v_has_conflict,
    'conflict_booking_id', v_conflict.id,
    'conflict_booking_ref', v_conflict.booking_reference,
    'conflict_status', v_conflict.status,
    'conflict_check_in', v_conflict.check_in_date,
    'conflict_check_out', v_conflict.check_out_date,
    'version', 'SAFE-AVAILABILITY-CHECK-V1'
  );
END;
$function$;

-- Batch version for multiple rooms (used by group booking)
CREATE OR REPLACE FUNCTION public.check_rooms_availability_for_dates(
  p_tenant_id UUID,
  p_room_ids UUID[],
  p_check_in DATE,
  p_check_out DATE,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb := '[]'::jsonb;
  v_room_id UUID;
  v_conflict RECORD;
BEGIN
  -- SAFE-AVAILABILITY-CHECK-V1: Batch check for multiple rooms
  FOREACH v_room_id IN ARRAY p_room_ids
  LOOP
    SELECT b.id, b.booking_reference, b.status,
           (b.check_in::date) as check_in_date,
           (b.check_out::date) as check_out_date
    INTO v_conflict
    FROM bookings b
    WHERE b.tenant_id = p_tenant_id
      AND b.room_id = v_room_id
      AND b.status IN ('reserved', 'checked_in', 'confirmed')
      AND (p_exclude_booking_id IS NULL OR b.id != p_exclude_booking_id)
      AND (b.check_in::date) < p_check_out
      AND (b.check_out::date) > p_check_in
    LIMIT 1;
    
    v_result := v_result || jsonb_build_object(
      'room_id', v_room_id,
      'available', v_conflict.id IS NULL,
      'conflict_booking_id', v_conflict.id,
      'conflict_booking_ref', v_conflict.booking_reference
    );
    
    v_conflict := NULL;
  END LOOP;
  
  RETURN jsonb_build_object(
    'results', v_result,
    'version', 'SAFE-AVAILABILITY-CHECK-V1'
  );
END;
$function$;