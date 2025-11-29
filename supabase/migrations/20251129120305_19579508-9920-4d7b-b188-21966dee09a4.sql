-- LEDGER-BACKFILL-V6: Create DEBIT ledger entries for folio charges without ledger entries

INSERT INTO ledger_entries (
  tenant_id,
  transaction_type,
  transaction_category,
  amount,
  description,
  department,
  source_type,
  booking_id,
  guest_id,
  folio_id,
  status,
  reconciliation_status,
  created_at,
  currency,
  metadata
)
SELECT
  ft.tenant_id,
  'debit'::ledger_transaction_type,
  'room_charge' AS transaction_category,
  ft.amount,
  ft.description,
  COALESCE(ft.department, 'ROOMS') AS department,
  'checkin-guest' AS source_type,
  sf.booking_id,
  b.guest_id,
  ft.folio_id,
  'completed'::ledger_status,
  'pending'::ledger_reconciliation_status,
  ft.created_at,
  'NGN' AS currency,
  jsonb_build_object(
    'backfill', 'LEDGER-BACKFILL-V6',
    'transaction_id', ft.id,
    'folio_number', sf.folio_number,
    'room_number', r.number
  ) AS metadata
FROM folio_transactions ft
JOIN stay_folios sf ON sf.id = ft.folio_id
JOIN bookings b ON b.id = sf.booking_id
LEFT JOIN rooms r ON r.id = sf.room_id
WHERE ft.transaction_type = 'charge'
  AND NOT EXISTS (
    SELECT 1 FROM ledger_entries le 
    WHERE le.folio_id = ft.folio_id 
    AND le.amount = ft.amount 
    AND le.transaction_type = 'debit'
    AND le.tenant_id = ft.tenant_id
    AND ABS(EXTRACT(EPOCH FROM (le.created_at - ft.created_at))) < 60
  )
  AND ft.created_at >= NOW() - INTERVAL '30 days';