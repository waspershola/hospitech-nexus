-- Close stale folios from completed/cancelled bookings
UPDATE stay_folios
SET status = 'closed', updated_at = NOW()
WHERE booking_id IN (
  SELECT b.id FROM bookings b
  WHERE b.status IN ('completed', 'cancelled')
) AND status = 'open';

-- Create folios for ALL checked-in bookings that don't have folios
INSERT INTO stay_folios (
  tenant_id, booking_id, room_id, guest_id, status, 
  total_charges, total_payments, balance, metadata, created_at, updated_at
)
SELECT 
  b.tenant_id,
  b.id,
  b.room_id,
  b.guest_id,
  'open',
  COALESCE(b.total_amount, 0),
  0.00,
  COALESCE(b.total_amount, 0),
  jsonb_build_object('auto_created', 'migration_backfill', 'reason', 'missing_folio_on_checkin'),
  NOW(),
  NOW()
FROM bookings b
LEFT JOIN stay_folios sf ON sf.booking_id = b.id
WHERE b.status = 'checked_in'
  AND sf.id IS NULL;