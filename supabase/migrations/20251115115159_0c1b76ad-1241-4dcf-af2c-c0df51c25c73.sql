-- Phase 1: Database Integrity Layer
-- This migration adds hard constraints to prevent room state corruption

-- 1.1: Prevent duplicate rooms per tenant
ALTER TABLE rooms
ADD CONSTRAINT unique_room_number_per_tenant
UNIQUE (tenant_id, number);

-- 1.2: Prevent multiple checked-in bookings for same room
CREATE OR REPLACE FUNCTION prevent_multiple_checkins()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'checked_in' THEN
    IF EXISTS (
      SELECT 1 FROM bookings
      WHERE room_id = NEW.room_id
        AND status = 'checked_in'
        AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Room already has an active checked-in booking';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_single_checkin
BEFORE INSERT OR UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION prevent_multiple_checkins();

-- 1.3: Prevent invalid room status transitions
-- CRITICAL: This prevents rooms from becoming "available" while occupied
CREATE OR REPLACE FUNCTION validate_room_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Cannot set room to available if there's a checked-in booking
  IF NEW.status = 'available' THEN
    IF EXISTS (
      SELECT 1 FROM bookings
      WHERE room_id = NEW.id
        AND status = 'checked_in'
    ) THEN
      RAISE EXCEPTION 'Cannot set room to available while booking is still checked in';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_room_status
BEFORE UPDATE ON rooms
FOR EACH ROW EXECUTE FUNCTION validate_room_status_transition();

-- 1.4: Enhanced audit logging for room status changes
CREATE OR REPLACE FUNCTION log_room_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO room_status_history (
      tenant_id, 
      room_id, 
      old_status, 
      new_status, 
      changed_by,
      metadata
    )
    VALUES (
      NEW.tenant_id, 
      NEW.id, 
      OLD.status, 
      NEW.status, 
      auth.uid(),
      jsonb_build_object(
        'old_current_reservation_id', OLD.current_reservation_id,
        'new_current_reservation_id', NEW.current_reservation_id,
        'old_current_guest_id', OLD.current_guest_id,
        'new_current_guest_id', NEW.current_guest_id,
        'timestamp', now()
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace existing trigger with enhanced version
DROP TRIGGER IF EXISTS log_room_status_changes ON rooms;
CREATE TRIGGER log_room_status_changes
AFTER UPDATE ON rooms
FOR EACH ROW EXECUTE FUNCTION log_room_status_change();