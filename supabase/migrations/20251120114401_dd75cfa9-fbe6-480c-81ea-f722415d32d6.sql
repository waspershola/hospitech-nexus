-- GROUP-FIX-V1.1: Ensure trigger fires on INSERT for reserved bookings
DROP TRIGGER IF EXISTS sync_room_status_on_booking_change ON bookings;

CREATE TRIGGER sync_room_status_on_booking_change
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION sync_room_status_on_booking_change();

-- Backfill: Update rooms to 'reserved' for existing reserved bookings
UPDATE rooms r
SET status = 'reserved'
FROM bookings b
WHERE b.room_id = r.id
  AND b.tenant_id = r.tenant_id
  AND b.status = 'reserved'
  AND r.status = 'available'
  AND b.created_at > NOW() - INTERVAL '1 day';