-- Update all bookings where checkout date has passed but status is still active
-- This fixes historical data where bookings weren't marked as completed

UPDATE bookings
SET status = 'completed',
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'auto_completed_at', now()::text,
      'auto_completed_reason', 'Data cleanup - checkout date passed'
    )
WHERE check_out < CURRENT_DATE
  AND status IN ('reserved', 'checked_in')
  AND status != 'completed'
  AND status != 'cancelled';

-- Add comment to explain the migration
COMMENT ON TABLE bookings IS 'Bookings table stores guest room reservations. Status is automatically set to completed when checkout date passes.';