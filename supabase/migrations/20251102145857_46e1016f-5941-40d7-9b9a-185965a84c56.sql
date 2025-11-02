-- Phase 8: Fix database trigger to respect manual status overrides

-- First, add metadata column to rooms if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rooms' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE rooms ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Update the sync_room_status_with_bookings trigger to check for manual override
CREATE OR REPLACE FUNCTION public.sync_room_status_with_bookings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  today_checked_in RECORD;
  today_arrival RECORD;
  future_booking RECORD;
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

  -- Update room based on priority (only if not manually overridden)
  IF today_checked_in.id IS NOT NULL THEN
    -- Currently occupied
    UPDATE rooms 
    SET 
      status = 'occupied',
      current_reservation_id = today_checked_in.id,
      current_guest_id = today_checked_in.guest_id
    WHERE id = COALESCE(NEW.room_id, OLD.room_id)
      AND COALESCE((metadata->>'manual_status_override')::boolean, false) = false;
  ELSIF today_arrival.id IS NOT NULL THEN
    -- Arrival today
    UPDATE rooms 
    SET 
      status = 'reserved',
      current_reservation_id = today_arrival.id,
      current_guest_id = today_arrival.guest_id
    WHERE id = COALESCE(NEW.room_id, OLD.room_id)
      AND COALESCE((metadata->>'manual_status_override')::boolean, false) = false;
  ELSIF future_booking.id IS NOT NULL THEN
    -- Future booking (lowest priority)
    UPDATE rooms 
    SET 
      status = 'reserved',
      current_reservation_id = future_booking.id,
      current_guest_id = future_booking.guest_id
    WHERE id = COALESCE(NEW.room_id, OLD.room_id)
      AND COALESCE((metadata->>'manual_status_override')::boolean, false) = false;
  ELSE
    -- No active bookings - clear references (but respect maintenance/cleaning)
    UPDATE rooms 
    SET 
      status = CASE 
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
$function$;