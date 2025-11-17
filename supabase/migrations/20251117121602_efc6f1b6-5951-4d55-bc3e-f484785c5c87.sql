-- PHASE 1: Remove auto-sync trigger (violates PMS manual-only principle)
DROP TRIGGER IF EXISTS sync_room_status_trigger ON bookings;
DROP FUNCTION IF EXISTS sync_room_status_with_bookings();