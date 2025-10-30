-- Phase 1: Add canonical room state fields
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS current_guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS current_reservation_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS housekeeping_status TEXT DEFAULT 'clean' CHECK (housekeeping_status IN ('clean', 'needs_cleaning', 'in_progress'));

CREATE INDEX IF NOT EXISTS idx_rooms_current_guest ON rooms(current_guest_id);
CREATE INDEX IF NOT EXISTS idx_rooms_current_reservation ON rooms(current_reservation_id);

-- Phase 2: Update trigger to maintain canonical fields
CREATE OR REPLACE FUNCTION sync_room_status_with_bookings()
RETURNS TRIGGER AS $$
DECLARE
  active_booking RECORD;
  checked_in_booking RECORD;
BEGIN
  -- Find the most recent checked-in booking with future checkout
  SELECT id, guest_id INTO checked_in_booking
  FROM bookings
  WHERE room_id = COALESCE(NEW.room_id, OLD.room_id)
    AND status = 'checked_in'
    AND check_out::date > CURRENT_DATE
  ORDER BY check_in DESC
  LIMIT 1;

  -- If no checked-in booking, find most recent reserved booking
  IF NOT FOUND THEN
    SELECT id, guest_id INTO active_booking
    FROM bookings
    WHERE room_id = COALESCE(NEW.room_id, OLD.room_id)
      AND status = 'reserved'
      AND check_out::date > CURRENT_DATE
    ORDER BY check_in DESC
    LIMIT 1;
  END IF;

  -- Update room based on booking state
  IF checked_in_booking.id IS NOT NULL THEN
    UPDATE rooms 
    SET 
      status = 'occupied',
      current_reservation_id = checked_in_booking.id,
      current_guest_id = checked_in_booking.guest_id
    WHERE id = COALESCE(NEW.room_id, OLD.room_id);
  ELSIF active_booking.id IS NOT NULL THEN
    UPDATE rooms 
    SET 
      status = 'reserved',
      current_reservation_id = active_booking.id,
      current_guest_id = active_booking.guest_id
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger with new function
DROP TRIGGER IF EXISTS sync_room_status_on_booking_change ON bookings;
CREATE TRIGGER sync_room_status_on_booking_change
AFTER INSERT OR UPDATE OR DELETE ON bookings
FOR EACH ROW
EXECUTE FUNCTION sync_room_status_with_bookings();

-- Phase 6: Fix duplicate bookings issue
WITH ranked_bookings AS (
  SELECT 
    id,
    room_id,
    ROW_NUMBER() OVER (PARTITION BY room_id, check_in, check_out ORDER BY created_at DESC) as rn
  FROM bookings
  WHERE status = 'reserved'
    AND check_out::date > CURRENT_DATE
)
UPDATE bookings
SET status = 'cancelled',
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('cancelled_reason', 'duplicate_booking_cleanup', 'cancelled_at', now())
WHERE id IN (
  SELECT id FROM ranked_bookings WHERE rn > 1
);

-- Phase 7: Backfill canonical fields for existing rooms
UPDATE rooms r
SET 
  current_reservation_id = active_booking.id,
  current_guest_id = active_booking.guest_id
FROM (
  SELECT DISTINCT ON (room_id) 
    room_id, id, guest_id
  FROM bookings
  WHERE status IN ('checked_in', 'reserved')
    AND check_out::date > CURRENT_DATE
  ORDER BY room_id, 
    CASE WHEN status = 'checked_in' THEN 1 ELSE 2 END,
    check_in DESC
) active_booking
WHERE r.id = active_booking.room_id;