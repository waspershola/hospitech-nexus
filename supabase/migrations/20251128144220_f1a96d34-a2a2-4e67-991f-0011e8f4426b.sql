-- LEDGER-PHASE-2C-V4: Backfill FK dimensions for existing ledger entries
-- Populates payment_method_id, payment_provider_id, payment_location_id, and source_type

-- Step 1: Backfill payment_method_id by matching payment_method text
UPDATE ledger_entries le
SET payment_method_id = pm.id
FROM payment_methods pm
WHERE le.payment_method_id IS NULL
  AND le.payment_method IS NOT NULL
  AND pm.method_name = le.payment_method
  AND pm.tenant_id = le.tenant_id;

-- Step 2: Backfill payment_provider_id by matching payment_provider text
UPDATE ledger_entries le
SET payment_provider_id = fp.id
FROM finance_providers fp
WHERE le.payment_provider_id IS NULL
  AND le.payment_provider IS NOT NULL
  AND fp.name = le.payment_provider
  AND fp.tenant_id = le.tenant_id;

-- Step 3: Backfill payment_location_id by matching payment_location text
UPDATE ledger_entries le
SET payment_location_id = fl.id
FROM finance_locations fl
WHERE le.payment_location_id IS NULL
  AND le.payment_location IS NOT NULL
  AND fl.name = le.payment_location
  AND fl.tenant_id = le.tenant_id;

-- Step 4: Backfill source_type based on transaction_category and reference columns
UPDATE ledger_entries
SET source_type = CASE
  WHEN transaction_category IN ('folio_charge', 'folio_payment') OR folio_id IS NOT NULL THEN 'folio'
  WHEN transaction_category IN ('qr_service', 'qr_charge') OR qr_request_id IS NOT NULL THEN 'qr_request'
  WHEN transaction_category IN ('wallet_topup', 'wallet_deduction') OR wallet_transaction_id IS NOT NULL THEN 'wallet'
  WHEN payment_id IS NOT NULL THEN 'payment'
  WHEN booking_id IS NOT NULL THEN 'booking'
  ELSE 'other'
END
WHERE source_type IS NULL OR source_type = '';