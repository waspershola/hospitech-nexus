-- Payment→Folio Pipeline Verification Queries
-- Run these after deploying create-payment V2.2.1 and backfill migration

-- 1. Check for remaining orphaned payments (should be 0)
SELECT COUNT(*) AS remaining_orphaned_payments
FROM payments p
JOIN bookings b ON b.id = p.booking_id
JOIN stay_folios sf ON sf.booking_id = b.id AND sf.status = 'open'
WHERE p.stay_folio_id IS NULL
  AND b.status IN ('checked_in', 'completed');
-- Expected: 0

-- 2. Verify recent test payment was linked correctly
SELECT 
  p.id,
  p.transaction_ref,
  p.amount,
  p.stay_folio_id,
  p.created_at,
  sf.total_payments,
  sf.balance,
  b.booking_reference
FROM payments p
LEFT JOIN stay_folios sf ON sf.id = p.stay_folio_id
LEFT JOIN bookings b ON b.id = p.booking_id
WHERE p.created_at > NOW() - INTERVAL '10 minutes'
ORDER BY p.created_at DESC
LIMIT 5;
-- Expected: stay_folio_id NOT NULL, folio balance decreased

-- 3. Check folio transaction entries were created
SELECT 
  ft.id,
  ft.folio_id,
  ft.transaction_type,
  ft.amount,
  ft.reference_type,
  ft.reference_id,
  ft.created_at,
  ft.description
FROM folio_transactions ft
WHERE ft.created_at > NOW() - INTERVAL '1 hour'
ORDER BY ft.created_at DESC
LIMIT 20;
-- Expected: New entries with transaction_type='payment'

-- 4. Verify folio balance accuracy for all open folios
SELECT 
  sf.id AS folio_id,
  b.booking_reference,
  r.number AS room_number,
  sf.total_charges,
  sf.total_payments,
  sf.balance,
  (SELECT COUNT(*) FROM folio_transactions WHERE folio_id = sf.id AND transaction_type = 'charge') AS charge_count,
  (SELECT COUNT(*) FROM folio_transactions WHERE folio_id = sf.id AND transaction_type = 'payment') AS payment_count,
  sf.updated_at
FROM stay_folios sf
JOIN bookings b ON b.id = sf.booking_id
JOIN rooms r ON r.id = sf.room_id
WHERE sf.status = 'open'
ORDER BY sf.updated_at DESC
LIMIT 10;
-- Expected: All balances = total_charges - total_payments

-- 5. Check for any folio inconsistencies
SELECT 
  sf.id,
  b.booking_reference,
  sf.total_charges,
  sf.total_payments,
  sf.balance,
  COALESCE((SELECT SUM(amount) FROM folio_transactions WHERE folio_id = sf.id AND transaction_type = 'charge'), 0) AS actual_charges,
  COALESCE((SELECT SUM(amount) FROM folio_transactions WHERE folio_id = sf.id AND transaction_type = 'payment'), 0) AS actual_payments
FROM stay_folios sf
JOIN bookings b ON b.id = sf.booking_id
WHERE sf.status = 'open'
  AND (
    sf.total_charges != COALESCE((SELECT SUM(amount) FROM folio_transactions WHERE folio_id = sf.id AND transaction_type = 'charge'), 0)
    OR sf.total_payments != COALESCE((SELECT SUM(amount) FROM folio_transactions WHERE folio_id = sf.id AND transaction_type = 'payment'), 0)
  );
-- Expected: Empty result (no inconsistencies)

-- 6. Summary stats
SELECT 
  COUNT(*) AS total_open_folios,
  SUM(total_charges) AS total_charges_all,
  SUM(total_payments) AS total_payments_all,
  SUM(balance) AS total_balance_all,
  AVG(balance) AS avg_balance,
  COUNT(CASE WHEN balance > 0 THEN 1 END) AS folios_with_balance
FROM stay_folios
WHERE status = 'open';
-- Expected: Reasonable numbers matching business expectations
