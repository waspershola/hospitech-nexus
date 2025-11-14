-- Fix Room 101 and all bookings with incorrect checkout times

-- Step 1: Complete the specific Room 101 orphaned booking
UPDATE bookings
SET 
  status = 'completed',
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'auto_completed_at', now()::text,
    'auto_completed_reason', 'Never checked in - reservation abandoned',
    'completed_by', 'system_cleanup'
  )
WHERE id = '48981021-aac8-4f5c-9eec-0c1221d7ab3c'
  AND status = 'reserved';

-- Step 2: Fix all existing bookings to use proper 12:00 PM checkout time
-- Only update bookings that don't already have 12:00 as checkout time
UPDATE bookings
SET 
  check_out = (DATE(check_out) || ' 12:00:00')::timestamptz,
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'checkout_time_fixed', now()::text,
    'original_checkout_time', check_out::text
  )
WHERE 
  status IN ('reserved', 'checked_in')
  AND EXTRACT(HOUR FROM check_out) != 12
  AND metadata->>'checkout_time_fixed' IS NULL;