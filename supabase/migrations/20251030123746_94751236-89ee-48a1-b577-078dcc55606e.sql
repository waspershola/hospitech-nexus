
-- Immediate cleanup for checkouts that have passed (including today)
-- This updates bookings where checkout date is today or earlier

UPDATE bookings
SET status = 'completed',
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'auto_completed_at', now()::text,
      'auto_completed_reason', 'Immediate cleanup - checkout date arrived'
    )
WHERE check_out <= CURRENT_TIMESTAMP
  AND status IN ('reserved', 'checked_in')
  AND status != 'completed'
  AND status != 'cancelled';
