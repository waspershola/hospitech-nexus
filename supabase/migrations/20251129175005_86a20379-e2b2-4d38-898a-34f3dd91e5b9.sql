-- Migration: Fix Double Room Charge Issue (Phase 1)
-- Description: Recalculates folio totals from actual transactions to fix doubled charges
-- Version: PHASE-1-DOUBLE-CHARGE-FIX
-- Date: 2025-11-29

-- Step 1: Recalculate total_charges from actual folio_transactions (charges only)
UPDATE stay_folios sf
SET 
  total_charges = COALESCE((
    SELECT SUM(amount)
    FROM folio_transactions ft
    WHERE ft.folio_id = sf.id
      AND ft.transaction_type = 'charge'
  ), 0),
  updated_at = NOW()
WHERE 
  -- Only update folios where total_charges doesn't match actual transaction sum
  sf.total_charges != COALESCE((
    SELECT SUM(amount)
    FROM folio_transactions ft
    WHERE ft.folio_id = sf.id
      AND ft.transaction_type = 'charge'
  ), 0);

-- Step 2: Recalculate total_payments from actual folio_transactions (payments/credits only)
UPDATE stay_folios sf
SET 
  total_payments = COALESCE((
    SELECT SUM(amount)
    FROM folio_transactions ft
    WHERE ft.folio_id = sf.id
      AND ft.transaction_type IN ('payment', 'credit')
  ), 0),
  updated_at = NOW()
WHERE 
  -- Only update folios where total_payments doesn't match actual transaction sum
  sf.total_payments != COALESCE((
    SELECT SUM(amount)
    FROM folio_transactions ft
    WHERE ft.folio_id = sf.id
      AND ft.transaction_type IN ('payment', 'credit')
  ), 0);

-- Step 3: Recalculate balance as total_charges - total_payments
UPDATE stay_folios
SET 
  balance = COALESCE(total_charges, 0) - COALESCE(total_payments, 0),
  updated_at = NOW()
WHERE 
  -- Only update where balance calculation is incorrect
  balance != (COALESCE(total_charges, 0) - COALESCE(total_payments, 0));

-- Step 4: For folios with charges but no transactions, create the missing transaction
-- This handles cases where folio was created with initial total_charges but folio_post_charge failed
INSERT INTO folio_transactions (
  tenant_id,
  folio_id,
  transaction_type,
  amount,
  description,
  reference_type,
  reference_id,
  department,
  created_by,
  metadata
)
SELECT 
  sf.tenant_id,
  sf.id as folio_id,
  'charge'::text as transaction_type,
  sf.total_charges as amount,
  CONCAT('Room charge - ', b.booking_reference) as description,
  'booking'::text as reference_type,
  sf.booking_id as reference_id,
  'rooms'::text as department,
  NULL as created_by,
  jsonb_build_object(
    'migration', 'PHASE-1-DOUBLE-CHARGE-FIX',
    'reason', 'backfill_missing_transaction',
    'folio_number', sf.folio_number,
    'booking_reference', b.booking_reference
  ) as metadata
FROM stay_folios sf
JOIN bookings b ON b.id = sf.booking_id
WHERE 
  sf.total_charges > 0
  AND NOT EXISTS (
    SELECT 1 
    FROM folio_transactions ft 
    WHERE ft.folio_id = sf.id 
      AND ft.transaction_type = 'charge'
      AND ft.reference_type = 'booking'
      AND ft.reference_id = sf.booking_id
  );