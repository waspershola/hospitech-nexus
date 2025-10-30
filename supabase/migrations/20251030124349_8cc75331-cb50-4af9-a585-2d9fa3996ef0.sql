
-- Fix: Compare DATES only, not timestamps
-- This completes bookings where the checkout DATE has arrived (regardless of time)

UPDATE bookings
SET status = 'completed',
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'auto_completed_at', now()::text,
      'auto_completed_reason', 'Date-based cleanup - checkout date arrived'
    )
WHERE check_out::date <= CURRENT_DATE
  AND status IN ('reserved', 'checked_in')
  AND status NOT IN ('completed', 'cancelled');

-- Verify the update
SELECT 
  COUNT(*) as bookings_completed,
  MIN(check_out::date) as earliest_checkout,
  MAX(check_out::date) as latest_checkout
FROM bookings
WHERE metadata->>'auto_completed_reason' = 'Date-based cleanup - checkout date arrived';
