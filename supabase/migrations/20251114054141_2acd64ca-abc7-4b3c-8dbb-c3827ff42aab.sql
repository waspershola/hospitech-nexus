-- Rollback bookings that were auto-completed by the October 2025 migrations
-- Only affects bookings that were incorrectly auto-completed by the system
-- This restores bookings to checked_in status so staff can manually check them out

UPDATE bookings
SET 
  status = 'checked_in',
  metadata = COALESCE(metadata, '{}'::jsonb) - 'auto_completed_at' - 'auto_completed_reason' 
    || jsonb_build_object(
      'auto_complete_rollback', now()::text,
      'rollback_reason', 'Removed automatic checkout - manual checkout required'
    )
WHERE 
  metadata->>'auto_completed_reason' IN (
    'Data cleanup - checkout date passed',
    'Immediate cleanup - checkout date arrived',
    'Date-based cleanup - checkout date arrived'
  )
  AND status = 'completed'
  AND check_out >= CURRENT_DATE - INTERVAL '30 days'
  AND check_out <= CURRENT_DATE + INTERVAL '7 days';