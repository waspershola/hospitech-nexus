-- Close stale folios from completed/cancelled bookings
UPDATE stay_folios
SET status = 'closed', updated_at = NOW()
WHERE booking_id IN (
  SELECT b.id FROM bookings b
  WHERE b.status IN ('completed', 'cancelled')
) AND status = 'open';

-- Create folios for Room 101 and Room 102 checked-in bookings
INSERT INTO stay_folios (
  tenant_id, booking_id, room_id, guest_id, status, 
  total_charges, total_payments, balance, created_at, updated_at
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
  NOW(),
  NOW()
FROM bookings b
WHERE b.id IN (
  'e16316b9-02c0-44f3-8d37-c174449fc4ba',  -- Room 101
  '254c667c-1de4-4fa4-9bc3-a9724966d437'   -- Room 102
)
AND NOT EXISTS (
  SELECT 1 FROM stay_folios sf WHERE sf.booking_id = b.id
);