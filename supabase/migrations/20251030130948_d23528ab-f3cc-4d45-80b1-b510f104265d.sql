-- Phase 3: Create function and trigger to auto-sync room status with bookings
CREATE OR REPLACE FUNCTION sync_room_status_with_bookings()
RETURNS TRIGGER AS $$
DECLARE
  active_booking_count INTEGER;
  checked_in_count INTEGER;
BEGIN
  -- Count active bookings for the room
  SELECT 
    COUNT(*) FILTER (WHERE status IN ('reserved', 'checked_in') AND check_out::date > CURRENT_DATE),
    COUNT(*) FILTER (WHERE status = 'checked_in' AND check_out::date > CURRENT_DATE)
  INTO active_booking_count, checked_in_count
  FROM bookings
  WHERE room_id = COALESCE(NEW.room_id, OLD.room_id)
    AND status NOT IN ('completed', 'cancelled');

  -- Update room status based on booking state
  IF checked_in_count > 0 THEN
    UPDATE rooms SET status = 'occupied' WHERE id = COALESCE(NEW.room_id, OLD.room_id);
  ELSIF active_booking_count > 0 THEN
    UPDATE rooms SET status = 'reserved' WHERE id = COALESCE(NEW.room_id, OLD.room_id);
  ELSE
    -- Only set to available if room is not in maintenance or cleaning
    UPDATE rooms 
    SET status = 'available' 
    WHERE id = COALESCE(NEW.room_id, OLD.room_id)
      AND status NOT IN ('maintenance', 'cleaning', 'out_of_order');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on bookings table
DROP TRIGGER IF EXISTS sync_room_status_on_booking_change ON bookings;
CREATE TRIGGER sync_room_status_on_booking_change
AFTER INSERT OR UPDATE OR DELETE ON bookings
FOR EACH ROW
EXECUTE FUNCTION sync_room_status_with_bookings();

-- Phase 4: Clean up existing inconsistent data
UPDATE rooms r
SET status = CASE
  -- If room has checked-in booking with future checkout
  WHEN EXISTS (
    SELECT 1 FROM bookings b 
    WHERE b.room_id = r.id 
    AND b.status = 'checked_in'
    AND b.check_out::date > CURRENT_DATE
  ) THEN 'occupied'
  
  -- If room has reserved booking with future checkout
  WHEN EXISTS (
    SELECT 1 FROM bookings b 
    WHERE b.room_id = r.id 
    AND b.status = 'reserved'
    AND b.check_out::date > CURRENT_DATE
  ) THEN 'reserved'
  
  -- If room is in maintenance or cleaning, keep that status
  WHEN r.status IN ('maintenance', 'cleaning', 'out_of_order') THEN r.status
  
  -- Otherwise, set to available
  ELSE 'available'
END
WHERE r.status != CASE
  WHEN EXISTS (
    SELECT 1 FROM bookings b 
    WHERE b.room_id = r.id 
    AND b.status = 'checked_in'
    AND b.check_out::date > CURRENT_DATE
  ) THEN 'occupied'
  WHEN EXISTS (
    SELECT 1 FROM bookings b 
    WHERE b.room_id = r.id 
    AND b.status = 'reserved'
    AND b.check_out::date > CURRENT_DATE
  ) THEN 'reserved'
  WHEN r.status IN ('maintenance', 'cleaning', 'out_of_order') THEN r.status
  ELSE 'available'
END;