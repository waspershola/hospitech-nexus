-- PHASE 1: Create missing folio for Room 202 (booking b424e08c-c3a7-432f-978d-37c07a6aaf55)

INSERT INTO stay_folios (
  tenant_id, 
  booking_id, 
  room_id, 
  guest_id, 
  status, 
  total_charges, 
  total_payments, 
  balance,
  metadata,
  created_at
)
SELECT 
  b.tenant_id,
  b.id,
  b.room_id,
  b.guest_id,
  'open',
  COALESCE(b.total_amount, 0)::numeric(14,2),
  0::numeric(14,2),
  COALESCE(b.total_amount, 0)::numeric(14,2),
  jsonb_build_object(
    'created_by', 'phase1_manual_fix',
    'booking_reference', b.booking_reference,
    'fixed_at', now()
  ),
  now()
FROM bookings b
WHERE b.id = 'b424e08c-c3a7-432f-978d-37c07a6aaf55'
  AND NOT EXISTS (
    SELECT 1 FROM stay_folios WHERE booking_id = b.id
  )
RETURNING id as folio_id, booking_id, total_charges, balance;

-- Verification: Confirm no checked-in bookings without folios
SELECT COUNT(*) as missing_folios_count
FROM bookings b
LEFT JOIN stay_folios sf ON sf.booking_id = b.id
WHERE b.status = 'checked_in' AND sf.id IS NULL;