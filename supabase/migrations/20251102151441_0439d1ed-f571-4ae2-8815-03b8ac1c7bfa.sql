-- =========================================
-- Phase 4: One-time fix for mismatched room statuses
-- =========================================

-- Fix rooms that should be reserved but show as available
UPDATE rooms r
SET 
  status = 'reserved',
  current_reservation_id = b.id,
  current_guest_id = b.guest_id
FROM bookings b
WHERE r.id = b.room_id
  AND b.status = 'reserved'
  AND b.check_out::date > CURRENT_DATE
  AND r.status = 'available'
  AND COALESCE((r.metadata->>'manual_status_override')::boolean, false) = false;

-- Fix rooms that show reserved but have no active reservations
UPDATE rooms r
SET 
  status = 'available',
  current_reservation_id = NULL,
  current_guest_id = NULL
WHERE r.status = 'reserved'
  AND NOT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.room_id = r.id
      AND b.status IN ('reserved', 'checked_in')
      AND b.check_out::date > CURRENT_DATE
  )
  AND COALESCE((r.metadata->>'manual_status_override')::boolean, false) = false;