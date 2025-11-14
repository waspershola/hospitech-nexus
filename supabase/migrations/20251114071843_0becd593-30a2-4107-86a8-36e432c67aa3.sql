-- Step 1: Complete orphaned past reserved bookings that were never checked in
-- These bookings have passed their checkout time but are still in 'reserved' status
-- Changing status will trigger the sync_room_status_with_bookings() function
UPDATE bookings
SET 
  status = 'completed',
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'auto_completed_at', now()::text,
    'auto_completed_reason', 'Never checked in - auto-completed after checkout time'
  )
WHERE 
  status = 'reserved'
  AND check_out < CURRENT_TIMESTAMP
  AND metadata->>'auto_completed_at' IS NULL;

-- Step 2: Force re-sync for all checked-in bookings
-- We'll temporarily toggle a metadata flag to trigger the trigger
UPDATE bookings
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('_force_sync', now()::text)
WHERE status = 'checked_in';