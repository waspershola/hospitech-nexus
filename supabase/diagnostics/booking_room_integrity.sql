-- ============================================================================
-- BOOKING / ROOM INTEGRITY DIAGNOSTICS (READ-ONLY)
-- Date: 2025-11-20
-- Purpose: Diagnostic queries to identify data integrity issues
-- Usage: Run these queries manually or via booking_room_integrity_diagnostics RPC
-- ============================================================================

-- Query 1: Rooms with checked-in bookings but room status != 'occupied'
-- This indicates frontend/backend sync issue
SELECT
  r.id AS room_id,
  r.number AS room_number,
  r.status AS room_status,
  b.id AS booking_id,
  b.booking_reference,
  b.status AS booking_status,
  b.check_in,
  b.check_out,
  b.metadata->>'actual_checkin' AS actual_checkin
FROM rooms r
JOIN bookings b ON b.room_id = r.id
WHERE b.status = 'checked_in'
  AND r.status != 'occupied'
ORDER BY r.number, b.check_in;

-- Query 2: Bookings that were auto-completed
-- This identifies violations of manual-only PMS principle
SELECT
  id AS booking_id,
  booking_reference,
  room_id,
  status,
  check_in,
  check_out,
  metadata->>'auto_completed_at' AS auto_completed_at,
  metadata->>'auto_completed_reason' AS auto_completed_reason,
  metadata->>'emergency_rollback' AS was_rolled_back
FROM bookings
WHERE metadata->>'auto_completed_at' IS NOT NULL
ORDER BY metadata->>'auto_completed_at' DESC
LIMIT 100;

-- Query 3: Current state overview per room
-- Shows latest booking status for each room
SELECT
  r.id AS room_id,
  r.number,
  r.status AS room_status,
  COALESCE(latest_booking.status, 'none') AS latest_booking_status,
  latest_booking.check_in,
  latest_booking.check_out,
  latest_booking.booking_reference
FROM rooms r
LEFT JOIN LATERAL (
  SELECT *
  FROM bookings b
  WHERE b.room_id = r.id
  ORDER BY b.created_at DESC
  LIMIT 1
) latest_booking ON TRUE
ORDER BY r.number;

-- Query 4: Checked-in bookings without folios
-- This is a critical data integrity issue
SELECT
  b.id AS booking_id,
  b.booking_reference,
  b.check_in,
  b.check_out,
  r.number AS room_number,
  g.name AS guest_name,
  b.total_amount,
  b.metadata->>'actual_checkin' AS actual_checkin,
  CASE 
    WHEN b.metadata ? 'folio_id' THEN 'Has folio_id in metadata'
    ELSE 'Missing folio_id'
  END AS folio_metadata_status
FROM bookings b
JOIN rooms r ON r.id = b.room_id
JOIN guests g ON g.id = b.guest_id
LEFT JOIN stay_folios f ON f.booking_id = b.id AND f.status = 'open'
WHERE b.status = 'checked_in'
  AND f.id IS NULL
ORDER BY b.check_in;

-- Query 5: Overstay bookings (past checkout, still checked in)
-- These should show as 'overstay' in UI, NOT auto-release to available
SELECT
  b.id AS booking_id,
  b.booking_reference,
  r.number AS room_number,
  r.status AS room_status,
  b.check_in,
  b.check_out,
  CURRENT_DATE - b.check_out::date AS days_past_checkout,
  b.metadata->>'actual_checkin' AS actual_checkin
FROM bookings b
JOIN rooms r ON r.id = b.room_id
WHERE b.status = 'checked_in'
  AND b.check_out::date < CURRENT_DATE
ORDER BY b.check_out;

-- Query 6: Active triggers inventory
-- Shows all triggers that affect bookings and rooms
SELECT
  t.tgname AS trigger_name,
  c.relname AS table_name,
  p.proname AS function_name,
  pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE c.relname IN ('bookings', 'rooms')
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- Query 7: Room status distribution
-- Shows overall system health
SELECT
  status,
  COUNT(*) AS count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM rooms
GROUP BY status
ORDER BY count DESC;

-- Query 8: Booking status distribution
-- Shows overall booking health
SELECT
  status,
  COUNT(*) AS count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM bookings
WHERE check_out::date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY status
ORDER BY count DESC;
