-- PHASE 6: Create missing folio for Room 201 (booking 12b7c205-5837-4102-9075-fcf615172b6e)

INSERT INTO stay_folios (
  tenant_id, 
  booking_id, 
  guest_id, 
  room_id, 
  status, 
  total_charges, 
  total_payments, 
  balance
) 
SELECT 
  b.tenant_id,
  b.id,
  b.guest_id,
  b.room_id,
  'open',
  0,
  0,
  0
FROM bookings b
WHERE b.id = '12b7c205-5837-4102-9075-fcf615172b6e'
  AND NOT EXISTS (
    SELECT 1 FROM stay_folios WHERE booking_id = b.id
  );

-- Log the folio creation for audit
INSERT INTO finance_audit_events (
  tenant_id,
  event_type,
  target_id,
  payload
)
SELECT 
  b.tenant_id,
  'folio_manual_creation',
  f.id,
  jsonb_build_object(
    'booking_id', b.id,
    'booking_reference', b.booking_reference,
    'room_number', r.number,
    'reason', 'Data cleanup - missing folio for checked-in booking'
  )
FROM bookings b
JOIN rooms r ON r.id = b.room_id
JOIN stay_folios f ON f.booking_id = b.id
WHERE b.id = '12b7c205-5837-4102-9075-fcf615172b6e';
