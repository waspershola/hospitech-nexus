
-- LEDGER-BACKFILL-V5: Lookup staff.id from payments.recorded_by (user_id)

-- Part 1: Create CREDIT ledger entries for payments without ledger entries
INSERT INTO ledger_entries (
  tenant_id,
  transaction_type,
  transaction_category,
  amount,
  description,
  payment_method,
  payment_method_id,
  payment_provider_id,
  payment_location_id,
  department,
  source_type,
  booking_id,
  guest_id,
  staff_id_initiated,
  payment_id,
  folio_id,
  status,
  reconciliation_status,
  created_at,
  currency,
  metadata
)
SELECT
  p.tenant_id,
  'credit'::ledger_transaction_type,
  'payment' AS transaction_category,
  p.amount,
  COALESCE('Payment: ' || p.transaction_ref, 'Payment recorded'),
  p.method,
  p.payment_method_id,
  p.payment_provider_id,
  p.payment_location_id,
  COALESCE(p.department, 'frontdesk') AS department,
  'payment' AS source_type,
  p.booking_id,
  p.guest_id,
  s.id AS staff_id_initiated,  -- Lookup staff.id from user_id
  p.id AS payment_id,
  p.stay_folio_id AS folio_id,
  CASE 
    WHEN p.status IN ('success', 'completed') THEN 'completed'::ledger_status
    ELSE 'pending'::ledger_status
  END AS status,
  'pending'::ledger_reconciliation_status AS reconciliation_status,
  p.created_at,
  'NGN' AS currency,
  jsonb_build_object(
    'backfill', 'LEDGER-BACKFILL-V5',
    'payment_status', p.status,
    'transaction_ref', p.transaction_ref
  ) AS metadata
FROM payments p
LEFT JOIN staff s ON s.tenant_id = p.tenant_id AND s.user_id = p.recorded_by
WHERE NOT EXISTS (
  SELECT 1 FROM ledger_entries le 
  WHERE le.payment_id = p.id 
  AND le.tenant_id = p.tenant_id
)
AND p.status IN ('success', 'completed')
AND p.created_at >= NOW() - INTERVAL '30 days';

-- Part 2: Update existing ledger entries to populate NULL payment_method_id
UPDATE ledger_entries le
SET payment_method_id = pm.id
FROM payment_methods pm
WHERE le.tenant_id = pm.tenant_id
  AND le.payment_method IS NOT NULL
  AND le.payment_method_id IS NULL
  AND LOWER(pm.method_name) = LOWER(le.payment_method);

-- Part 3: Fix source_type values
UPDATE ledger_entries
SET source_type = 'qr-request'
WHERE source_type = 'qr_request';

UPDATE ledger_entries
SET source_type = 'checkin-guest'
WHERE source_type = 'checkin_guest';

UPDATE ledger_entries
SET source_type = 'checkin-guest'
WHERE source_type = 'folio'
  AND transaction_category = 'room_charge';
