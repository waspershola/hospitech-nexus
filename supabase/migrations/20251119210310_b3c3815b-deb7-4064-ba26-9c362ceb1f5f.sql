-- Fix group booking helper functions to avoid uuid = text comparison errors
-- VERSION: GROUP-BOOKING-FIX-V2-UUID-TEXT

CREATE OR REPLACE FUNCTION public.update_group_size()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update group_size when booking is added to a group
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.metadata->>'group_id' IS NOT NULL THEN
    UPDATE group_bookings
    SET 
      group_size = (
        SELECT COUNT(*)
        FROM bookings
        WHERE tenant_id = NEW.tenant_id
          AND metadata->>'group_id' = NEW.metadata->>'group_id'
          AND status NOT IN ('cancelled')
      ),
      updated_at = NOW()
    WHERE tenant_id = NEW.tenant_id
      -- Cast group_id (uuid) to text to match metadata->>'group_id' (text)
      AND group_id::text = NEW.metadata->>'group_id';
  END IF;

  -- Update group_size when booking is removed from a group
  IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') AND OLD.metadata->>'group_id' IS NOT NULL THEN
    UPDATE group_bookings
    SET 
      group_size = (
        SELECT COUNT(*)
        FROM bookings
        WHERE tenant_id = OLD.tenant_id
          AND metadata->>'group_id' = OLD.metadata->>'group_id'
          AND status NOT IN ('cancelled')
      ),
      updated_at = NOW()
    WHERE tenant_id = OLD.tenant_id
      -- Cast group_id (uuid) to text to match metadata->>'group_id' (text)
      AND group_id::text = OLD.metadata->>'group_id';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;


CREATE OR REPLACE FUNCTION public.sync_group_booking_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_group_id text;
  v_all_statuses text[];
  v_new_status text;
BEGIN
  v_group_id := COALESCE(NEW.metadata->>'group_id', OLD.metadata->>'group_id');
  
  IF v_group_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Get all booking statuses for this group
  SELECT ARRAY_AGG(DISTINCT status) INTO v_all_statuses
  FROM bookings
  WHERE tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
    AND metadata->>'group_id' = v_group_id;

  -- Determine group status based on booking statuses
  IF 'cancelled' = ALL(v_all_statuses) THEN
    v_new_status := 'cancelled';
  ELSIF 'completed' = ALL(v_all_statuses) THEN
    v_new_status := 'completed';
  ELSIF 'checked_in' = ANY(v_all_statuses) THEN
    v_new_status := 'in_house';
  ELSIF 'reserved' = ALL(v_all_statuses) THEN
    v_new_status := 'reserved';
  ELSE
    v_new_status := 'partial';
  END IF;

  -- Update group_bookings status
  UPDATE group_bookings
  SET 
    status = v_new_status,
    updated_at = NOW()
  WHERE tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
    -- Cast group_id (uuid) to text to match v_group_id (text)
    AND group_id::text = v_group_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;