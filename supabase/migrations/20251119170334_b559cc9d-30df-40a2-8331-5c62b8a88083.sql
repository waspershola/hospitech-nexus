-- Phase 4: Room Availability Database Optimization
-- Add indexes to improve room availability query performance
-- Version: ROOM-AVAILABILITY-OPT-V1

-- Index on bookings for room availability queries (room_id, status, date range)
-- This dramatically speeds up the overlapping booking checks
CREATE INDEX IF NOT EXISTS idx_bookings_availability_check 
ON bookings(room_id, status, check_in, check_out, tenant_id)
WHERE status IN ('reserved', 'checked_in', 'confirmed');

-- Index for date range queries to quickly find overlapping bookings
CREATE INDEX IF NOT EXISTS idx_bookings_date_range 
ON bookings(check_in, check_out, tenant_id)
WHERE status IN ('reserved', 'checked_in', 'confirmed');

-- Composite index for tenant-specific room availability queries
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_room_dates 
ON bookings(tenant_id, room_id, check_in, check_out)
WHERE status IN ('reserved', 'checked_in', 'confirmed');

-- Add helpful comment explaining the optimization
COMMENT ON INDEX idx_bookings_availability_check IS 
'Optimizes room availability checks by indexing active bookings for quick overlapping date queries';

COMMENT ON INDEX idx_bookings_date_range IS 
'Speeds up date range overlap detection for availability validation';

COMMENT ON INDEX idx_bookings_tenant_room_dates IS 
'Accelerates tenant-specific room availability queries for multi-room group bookings';