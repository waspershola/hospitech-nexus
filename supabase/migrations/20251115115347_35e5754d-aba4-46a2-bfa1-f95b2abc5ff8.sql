-- Fix: Update log_room_status_change to not use metadata column
CREATE OR REPLACE FUNCTION log_room_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO room_status_history (
      tenant_id, 
      room_id, 
      old_status, 
      new_status, 
      changed_by
    )
    VALUES (
      NEW.tenant_id, 
      NEW.id, 
      OLD.status, 
      NEW.status, 
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Phase 3: Data Cleanup (One-Time Migration)
-- Fix duplicate rooms and complete old bookings

-- 3.1: Archive duplicate Room 105 (orphaned record)
UPDATE rooms
SET 
  number = '105-DUPLICATE-ARCHIVED',
  status = 'maintenance',
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'archived', true,
    'archived_at', now(),
    'original_number', '105',
    'reason', 'Duplicate room detected during integrity fix'
  )
WHERE id = 'a3c6ea26-07be-49bd-abf6-0a5eedfabcc0';

-- 3.2: Complete old checked-in bookings where checkout date has passed
UPDATE bookings
SET 
  status = 'completed',
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'auto_completed', true,
    'auto_completed_at', now(),
    'auto_completed_reason', 'Checkout date passed - auto-completed during integrity fix'
  )
WHERE status = 'checked_in'
  AND check_out < CURRENT_DATE;