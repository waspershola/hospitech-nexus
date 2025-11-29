-- LEDGER-BACKFILL-V7: Backfill room_number, payment_provider, payment_location for existing entries
-- Populate NULL values where IDs exist but names are missing

UPDATE ledger_entries le
SET 
  room_number = r.number,
  room_category = rc.name
FROM rooms r
LEFT JOIN room_categories rc ON rc.id = r.category_id
WHERE le.room_number IS NULL
  AND r.id = (
    SELECT room_id FROM bookings b 
    WHERE b.id = le.booking_id 
    AND b.tenant_id = le.tenant_id
    LIMIT 1
  )
  AND r.tenant_id = le.tenant_id;

UPDATE ledger_entries le
SET payment_provider = fp.name
FROM finance_providers fp
WHERE le.payment_provider IS NULL
  AND le.payment_provider_id IS NOT NULL
  AND fp.id = le.payment_provider_id
  AND fp.tenant_id = le.tenant_id;

UPDATE ledger_entries le
SET payment_location = fl.name
FROM finance_locations fl
WHERE le.payment_location IS NULL
  AND le.payment_location_id IS NOT NULL
  AND fl.id = le.payment_location_id
  AND fl.tenant_id = le.tenant_id;