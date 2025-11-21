-- Phase 1: Clean up ALL checked_in bookings without folios for PARK19 tenant
-- Version: FOLIO-CLEANUP-V2

-- Reset ALL bookings that are checked_in but have no folio
UPDATE bookings b
SET 
  status = 'reserved',
  metadata = jsonb_set(
    COALESCE(b.metadata, '{}'::jsonb),
    '{reset_reason}',
    '"Booking was in checked_in status without folio - reset for proper check-in (FOLIO-CLEANUP-V2)"'
  )
WHERE 
  b.tenant_id = '5cba9022-1f70-4b68-bb33-38e83194b0c2'
  AND b.status = 'checked_in'
  AND NOT EXISTS (
    SELECT 1 FROM stay_folios sf 
    WHERE sf.booking_id = b.id 
      AND sf.tenant_id = b.tenant_id
  );

-- Reset corresponding rooms to reserved if they're currently occupied
UPDATE rooms r
SET status = 'reserved'
WHERE 
  r.tenant_id = '5cba9022-1f70-4b68-bb33-38e83194b0c2'
  AND r.status = 'occupied'
  AND EXISTS (
    SELECT 1
    FROM bookings b
    WHERE 
      b.room_id = r.id
      AND b.tenant_id = r.tenant_id
      AND b.status = 'reserved'
      AND b.metadata->>'reset_reason' LIKE '%FOLIO-CLEANUP-V2%'
  );