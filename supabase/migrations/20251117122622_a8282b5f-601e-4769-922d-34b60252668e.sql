-- PHASE 6: Data Cleanup & Integrity Fixes

-- Step 1: Fix room status mismatches (Rooms 105, 109 should be 'occupied' not 'reserved')
UPDATE rooms
SET status = 'occupied'
WHERE number IN ('105', '109')
  AND id IN (
    SELECT r.id 
    FROM rooms r
    JOIN bookings b ON b.room_id = r.id
    WHERE b.status = 'checked_in' AND r.status = 'reserved'
  );

-- Step 2: Add trigger to prevent checked_in bookings without folios
CREATE OR REPLACE FUNCTION validate_checkin_has_folio()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate when status is being changed TO 'checked_in'
  IF NEW.status = 'checked_in' AND (OLD.status IS NULL OR OLD.status != 'checked_in') THEN
    -- Check if folio exists
    IF NOT EXISTS (
      SELECT 1 FROM stay_folios 
      WHERE booking_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Cannot check in: Folio must be created first for booking %', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on bookings table
DROP TRIGGER IF EXISTS trg_validate_checkin_folio ON bookings;
CREATE TRIGGER trg_validate_checkin_folio
  BEFORE UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_checkin_has_folio();

-- Step 3: Add trigger to keep room status in sync with booking status
CREATE OR REPLACE FUNCTION sync_room_status_on_checkin()
RETURNS TRIGGER AS $$
BEGIN
  -- When booking status changes TO 'checked_in', ensure room is 'occupied'
  IF NEW.status = 'checked_in' AND (OLD.status IS NULL OR OLD.status != 'checked_in') THEN
    UPDATE rooms 
    SET status = 'occupied'
    WHERE id = NEW.room_id AND status != 'occupied';
  END IF;
  
  -- When booking status changes TO 'completed', ensure room is 'cleaning'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE rooms 
    SET status = 'cleaning'
    WHERE id = NEW.room_id AND status = 'occupied';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on bookings table
DROP TRIGGER IF EXISTS trg_sync_room_status_on_checkin ON bookings;
CREATE TRIGGER trg_sync_room_status_on_checkin
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION sync_room_status_on_checkin();

-- Add comment explaining the integrity rules
COMMENT ON FUNCTION validate_checkin_has_folio() IS 'Ensures a folio exists before allowing booking status to change to checked_in';
COMMENT ON FUNCTION sync_room_status_on_checkin() IS 'Keeps room status synchronized with booking status changes (checked_in->occupied, completed->cleaning)';
