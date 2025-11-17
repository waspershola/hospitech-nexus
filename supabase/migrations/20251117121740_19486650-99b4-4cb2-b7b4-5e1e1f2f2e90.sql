-- PHASE 5: Complete overdue bookings (data cleanup)
-- Complete bookings that are past checkout date but still marked as checked_in

UPDATE bookings
SET status = 'completed',
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'auto_completed', true,
      'completed_at', NOW(),
      'completed_reason', 'past_checkout_data_cleanup'
    )
WHERE status = 'checked_in'
  AND check_out < CURRENT_DATE;

-- Set corresponding rooms to cleaning status
UPDATE rooms r
SET status = 'cleaning'
FROM bookings b
WHERE b.room_id = r.id
  AND b.status = 'completed'
  AND b.metadata->>'auto_completed' = 'true'
  AND r.status = 'occupied';