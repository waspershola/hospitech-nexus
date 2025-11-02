-- Phase 1: Fix sync_room_status_with_bookings to prioritize TODAY's bookings
-- This ensures Room 203 shows the correct guest for TODAY, not future bookings

CREATE OR REPLACE FUNCTION public.sync_room_status_with_bookings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  today_checked_in RECORD;
  today_arrival RECORD;
  future_booking RECORD;
BEGIN
  -- Priority 1: Currently checked-in booking (active TODAY)
  SELECT id, guest_id INTO today_checked_in
  FROM bookings
  WHERE room_id = COALESCE(NEW.room_id, OLD.room_id)
    AND status = 'checked_in'
    AND check_in::date <= CURRENT_DATE
    AND check_out::date > CURRENT_DATE
  ORDER BY check_in DESC
  LIMIT 1;

  -- Priority 2: Today's arrival (check-in = today, reserved status)
  IF NOT FOUND THEN
    SELECT id, guest_id INTO today_arrival
    FROM bookings
    WHERE room_id = COALESCE(NEW.room_id, OLD.room_id)
      AND status = 'reserved'
      AND check_in::date = CURRENT_DATE
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  -- Priority 3: Future booking (only if no current or today booking)
  IF NOT FOUND AND today_arrival.id IS NULL THEN
    SELECT id, guest_id INTO future_booking
    FROM bookings
    WHERE room_id = COALESCE(NEW.room_id, OLD.room_id)
      AND status = 'reserved'
      AND check_in::date > CURRENT_DATE
      AND check_out::date > CURRENT_DATE
    ORDER BY check_in ASC
    LIMIT 1;
  END IF;

  -- Update room based on priority
  IF today_checked_in.id IS NOT NULL THEN
    -- Currently occupied
    UPDATE rooms 
    SET 
      status = 'occupied',
      current_reservation_id = today_checked_in.id,
      current_guest_id = today_checked_in.guest_id
    WHERE id = COALESCE(NEW.room_id, OLD.room_id);
  ELSIF today_arrival.id IS NOT NULL THEN
    -- Arrival today
    UPDATE rooms 
    SET 
      status = 'reserved',
      current_reservation_id = today_arrival.id,
      current_guest_id = today_arrival.guest_id
    WHERE id = COALESCE(NEW.room_id, OLD.room_id);
  ELSIF future_booking.id IS NOT NULL THEN
    -- Future booking (lowest priority)
    UPDATE rooms 
    SET 
      status = 'reserved',
      current_reservation_id = future_booking.id,
      current_guest_id = future_booking.guest_id
    WHERE id = COALESCE(NEW.room_id, OLD.room_id);
  ELSE
    -- No active bookings - clear references
    UPDATE rooms 
    SET 
      status = CASE 
        WHEN status IN ('maintenance', 'out_of_order') THEN status
        ELSE 'available'
      END,
      current_reservation_id = NULL,
      current_guest_id = NULL
    WHERE id = COALESCE(NEW.room_id, OLD.room_id)
      AND status NOT IN ('cleaning');
  END IF;

  RETURN NEW;
END;
$$;