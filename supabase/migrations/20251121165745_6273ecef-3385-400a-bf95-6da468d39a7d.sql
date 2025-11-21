-- Phase 5 (Option B): Reset broken bookings (Rooms 101 & 108) to allow proper check-in
-- Version: FOLIO-CLEANUP-V1

-- Reset bookings to 'reserved' status so staff can properly check-in
UPDATE bookings
SET 
  status = 'reserved',
  metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{reset_reason}',
    '"Booking was in checked_in status without folio - reset for proper check-in"'
  )
WHERE id IN (
  '46d42a99-26b3-451d-9850-3840566184fb',  -- Room 101
  '800cd1e0-abd1-41f7-b7b6-f96a959dadbf'   -- Room 108
)
AND tenant_id = '5cba9022-1f70-4b68-bb33-38e83194b0c2';

-- Update room statuses back to reserved
UPDATE rooms
SET status = 'reserved'
WHERE number IN ('101', '108')
  AND tenant_id = '5cba9022-1f70-4b68-bb33-38e83194b0c2';