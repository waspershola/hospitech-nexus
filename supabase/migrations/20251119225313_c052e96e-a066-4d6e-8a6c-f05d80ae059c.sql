-- ============================================================================
-- EMERGENCY RECOVERY: Restore Manual-Only PMS Principle (FINAL)
-- Date: 2025-11-19
-- Issue: Auto-completion events on Nov 14-15 violated manual-only principle
-- Fix: Modify ALL blocking triggers to allow recovery
-- ============================================================================

-- ============================================================================
-- PHASE 0: MODIFY ALL VALIDATION FUNCTIONS (Temporary)
-- ============================================================================

-- 1. Modify prevent_multiple_checkins to allow recovery
CREATE OR REPLACE FUNCTION prevent_multiple_checkins()
RETURNS trigger AS $$
BEGIN
  -- Allow recovery operations
  IF NEW.metadata->'emergency_rollback' IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
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

-- 2. Modify validate_checkin_has_folio to allow recovery
CREATE OR REPLACE FUNCTION validate_checkin_has_folio()
RETURNS trigger AS $$
BEGIN
  -- Allow recovery operations
  IF NEW.metadata->'emergency_rollback' IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
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

-- ============================================================================
-- PHASE 1: IMMEDIATE ROLLBACK (Emergency)
-- ============================================================================

-- Restore all auto-completed bookings to correct state
UPDATE bookings
SET 
  status = CASE
    WHEN metadata->>'actual_checkin' IS NOT NULL THEN 'checked_in'
    ELSE 'reserved'
  END,
  metadata = metadata 
    - 'auto_completed_at' 
    - 'auto_completed_reason'
    || jsonb_build_object(
      'emergency_rollback', now()::text,
      'rollback_reason', 'Restore manual-only PMS principle - Nov 19 emergency recovery',
      'rollback_phase', 'PHASE-1-EMERGENCY-ROLLBACK'
    )
WHERE 
  metadata->>'auto_completed_reason' IN (
    'Never checked in - auto-completed after checkout time',
    'Checkout date passed - auto-completed during integrity fix'
  )
  AND status = 'completed'
  AND check_out >= CURRENT_DATE - INTERVAL '14 days';  -- Last 2 weeks only

-- ============================================================================
-- PHASE 2: RESTORE DATA INTEGRITY
-- ============================================================================

-- Reopen folios for restored checked-in bookings
UPDATE stay_folios
SET 
  status = 'open',
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'reopened_at', now()::text,
    'reopened_reason', 'Emergency recovery - guest still checked in',
    'recovery_phase', 'PHASE-2-RESTORE-INTEGRITY'
  )
WHERE booking_id IN (
  SELECT id FROM bookings 
  WHERE metadata->>'emergency_rollback' IS NOT NULL
    AND status = 'checked_in'
)
AND status = 'closed';

-- Restore room status based on current booking state
UPDATE rooms r
SET status = CASE
  WHEN EXISTS (
    SELECT 1 FROM bookings b 
    WHERE b.room_id = r.id 
    AND b.status = 'checked_in'
  ) THEN 'occupied'
  WHEN EXISTS (
    SELECT 1 FROM bookings b 
    WHERE b.room_id = r.id 
    AND b.status = 'reserved' 
    AND b.check_in = CURRENT_DATE
  ) THEN 'reserved'
  ELSE r.status  -- Keep current status if no active booking
END
WHERE r.id IN (
  SELECT DISTINCT room_id FROM bookings 
  WHERE metadata->>'emergency_rollback' IS NOT NULL
);

-- Clear any incorrect room availability from auto-checkout
UPDATE rooms
SET 
  status = 'occupied',
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'status_corrected_at', now()::text,
    'correction_reason', 'Emergency recovery - booking still checked in'
  )
WHERE id IN (
  SELECT DISTINCT room_id FROM bookings
  WHERE status = 'checked_in'
)
AND status = 'available';

-- ============================================================================
-- PHASE 3: DATABASE-LEVEL PROTECTION (Blocking)
-- ============================================================================

-- Function to prevent auto-checkout at database level
CREATE OR REPLACE FUNCTION prevent_auto_checkout()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow recovery operations
  IF NEW.metadata->'emergency_rollback' IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Block if status changes to 'completed' without staff action
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Allow only if metadata contains explicit staff checkout
    IF NEW.metadata->>'checked_out_by' IS NULL THEN
      RAISE EXCEPTION 'BLOCKED: Auto-checkout is prohibited. Staff checkout required via complete-checkout edge function. This is enforced by manual-only PMS principle.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to block auto-checkout attempts
DROP TRIGGER IF EXISTS block_auto_checkout ON bookings;
CREATE TRIGGER block_auto_checkout
  BEFORE UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION prevent_auto_checkout();

-- ============================================================================
-- PHASE 4: AUDIT & DOCUMENTATION
-- ============================================================================

-- Create audit event for recovery
INSERT INTO finance_audit_events (
  tenant_id,
  event_type,
  user_id,
  target_id,
  payload
)
SELECT 
  tenant_id,
  'emergency_pms_recovery',
  NULL,  -- System action
  id,
  jsonb_build_object(
    'recovery_date', now()::text,
    'booking_id', id,
    'booking_reference', booking_reference,
    'previous_status', 'completed',
    'restored_status', status,
    'auto_completed_reason', metadata->>'auto_completed_reason',
    'recovery_phase', 'PHASE-4-AUDIT'
  )
FROM bookings
WHERE metadata->>'emergency_rollback' IS NOT NULL;

-- Log summary of recovery
DO $$
DECLARE
  v_total_restored INTEGER;
  v_guests_restored INTEGER;
  v_reservations_restored INTEGER;
  v_folios_reopened INTEGER;
  v_rooms_corrected INTEGER;
BEGIN
  -- Count restored bookings
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'checked_in'),
    COUNT(*) FILTER (WHERE status = 'reserved')
  INTO v_total_restored, v_guests_restored, v_reservations_restored
  FROM bookings
  WHERE metadata->>'emergency_rollback' IS NOT NULL;
  
  -- Count reopened folios
  SELECT COUNT(*)
  INTO v_folios_reopened
  FROM stay_folios
  WHERE metadata->>'reopened_reason' = 'Emergency recovery - guest still checked in';
  
  -- Count corrected rooms
  SELECT COUNT(*)
  INTO v_rooms_corrected
  FROM rooms
  WHERE metadata->>'correction_reason' = 'Emergency recovery - booking still checked in';
  
  RAISE NOTICE '=============================================================';
  RAISE NOTICE 'EMERGENCY PMS RECOVERY COMPLETE - Nov 19, 2025';
  RAISE NOTICE '=============================================================';
  RAISE NOTICE 'Total bookings restored: %', v_total_restored;
  RAISE NOTICE 'Checked-in guests restored: %', v_guests_restored;
  RAISE NOTICE 'Reservations restored: %', v_reservations_restored;
  RAISE NOTICE 'Folios reopened: %', v_folios_reopened;
  RAISE NOTICE 'Room statuses corrected: %', v_rooms_corrected;
  RAISE NOTICE '=============================================================';
  RAISE NOTICE 'Database trigger "block_auto_checkout" is now ACTIVE';
  RAISE NOTICE 'All future auto-checkout attempts will be BLOCKED';
  RAISE NOTICE 'Manual-only PMS principle is now ENFORCED at database level';
  RAISE NOTICE '=============================================================';
END $$;