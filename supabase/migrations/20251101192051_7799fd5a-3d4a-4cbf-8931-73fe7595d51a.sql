-- PHASE 3: Fix guest stats trigger to update on all booking statuses

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS on_booking_status_change ON bookings;

-- Recreate the function with improved logic
CREATE OR REPLACE FUNCTION public.update_guest_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update guest stats when booking status changes to checked_out or reserved
  IF NEW.status IN ('checked_out', 'reserved', 'checked_in') AND (OLD.status IS NULL OR OLD.status != NEW.status) THEN
    UPDATE guests
    SET 
      total_bookings = (
        SELECT COUNT(*) 
        FROM bookings 
        WHERE guest_id = NEW.guest_id 
        AND status IN ('reserved', 'checked_in', 'checked_out')
      ),
      last_stay_date = (
        SELECT MAX(check_out) 
        FROM bookings 
        WHERE guest_id = NEW.guest_id 
        AND status = 'checked_out'
      ),
      total_spent = (
        SELECT COALESCE(SUM(amount), 0) 
        FROM payments 
        WHERE guest_id = NEW.guest_id 
        AND status = 'completed'
      )
    WHERE id = NEW.guest_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_booking_status_change
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_guest_stats();

-- Add index for date-based booking queries (performance optimization)
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(check_in, check_out, status);
CREATE INDEX IF NOT EXISTS idx_bookings_room_dates ON bookings(room_id, check_in, check_out, status);