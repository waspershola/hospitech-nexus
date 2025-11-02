-- =========================================
-- Phase 2: Fix sync_room_status_with_bookings() trigger logic
-- =========================================
DROP FUNCTION IF EXISTS public.sync_room_status_with_bookings() CASCADE;

CREATE OR REPLACE FUNCTION public.sync_room_status_with_bookings()
RETURNS TRIGGER AS $$
DECLARE
  today_checked_in RECORD;
  reserved_booking RECORD;
  is_manual_override boolean;
  current_room RECORD;
BEGIN
  -- Get current room details including metadata
  SELECT * INTO current_room
  FROM rooms
  WHERE id = COALESCE(NEW.room_id, OLD.room_id);
  
  -- Check if room has manual status override
  is_manual_override := COALESCE((current_room.metadata->>'manual_status_override')::boolean, false);
  
  -- Skip auto-sync if manual override is set
  IF is_manual_override THEN
    RETURN NEW;
  END IF;

  -- Priority 1: Currently checked-in booking (active TODAY)
  SELECT id, guest_id INTO today_checked_in
  FROM bookings
  WHERE room_id = COALESCE(NEW.room_id, OLD.room_id)
    AND status = 'checked_in'
    AND check_in::date <= CURRENT_DATE
    AND check_out::date > CURRENT_DATE
  ORDER BY check_in DESC
  LIMIT 1;

  -- Priority 2: Reserved booking (today or future)
  IF today_checked_in.id IS NULL THEN
    SELECT id, guest_id INTO reserved_booking
    FROM bookings
    WHERE room_id = COALESCE(NEW.room_id, OLD.room_id)
      AND status = 'reserved'
      AND check_out::date > CURRENT_DATE
    ORDER BY check_in ASC
    LIMIT 1;
  END IF;

  -- Update room based on priority (only if not manually overridden)
  IF today_checked_in.id IS NOT NULL THEN
    -- Currently occupied
    UPDATE rooms
    SET status = 'occupied',
        current_reservation_id = today_checked_in.id,
        current_guest_id = today_checked_in.guest_id
    WHERE id = COALESCE(NEW.room_id, OLD.room_id)
      AND COALESCE((metadata->>'manual_status_override')::boolean, false) = false;
  ELSIF reserved_booking.id IS NOT NULL THEN
    -- Reserved (not yet checked in)
    UPDATE rooms
    SET status = 'reserved',
        current_reservation_id = reserved_booking.id,
        current_guest_id = reserved_booking.guest_id
    WHERE id = COALESCE(NEW.room_id, OLD.room_id)
      AND COALESCE((metadata->>'manual_status_override')::boolean, false) = false;
  ELSE
    -- No active bookings - clear references (but respect maintenance/cleaning)
    UPDATE rooms
    SET status = CASE 
      WHEN status IN ('maintenance', 'out_of_order') THEN status
      ELSE 'available'
    END,
        current_reservation_id = NULL,
        current_guest_id = NULL
    WHERE id = COALESCE(NEW.room_id, OLD.room_id)
      AND status NOT IN ('cleaning')
      AND COALESCE((metadata->>'manual_status_override')::boolean, false) = false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger
DROP TRIGGER IF EXISTS sync_room_status_trigger ON bookings;
CREATE TRIGGER sync_room_status_trigger
AFTER INSERT OR UPDATE OR DELETE ON bookings
FOR EACH ROW
EXECUTE FUNCTION sync_room_status_with_bookings();