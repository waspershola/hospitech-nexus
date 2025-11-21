-- GROUP-BILLING-FIX-V1: Phase 6 - Data Cleanup for Test Tenant
-- This migration fixes the broken WEDDING 2 group data in the test tenant

-- Reset WEDDING 2 master folio charges (ID: c799fe21-f1f0-4ead-88c4-9c040f30eb39)
UPDATE stay_folios
SET 
  total_charges = 0,
  total_payments = 0,
  balance = 0,
  updated_at = NOW()
WHERE id = 'c799fe21-f1f0-4ead-88c4-9c040f30eb39'
  AND tenant_id = '5cba9022-1f70-4b68-bb33-38e83194b0c2'
  AND folio_type = 'group_master';

-- Delete incorrect charge transactions from master folio
-- (These were incorrectly posted at booking creation time)
DELETE FROM folio_transactions
WHERE folio_id = 'c799fe21-f1f0-4ead-88c4-9c040f30eb39'
  AND tenant_id = '5cba9022-1f70-4b68-bb33-38e83194b0c2'
  AND transaction_type = 'charge';

-- Unlink master folio from specific booking (d2a081f6-e5ef-41d5-80b7-25e00e70ca3c)
-- Master folios should NOT be linked to any specific room/booking
UPDATE stay_folios
SET 
  booking_id = NULL,
  room_id = NULL,
  updated_at = NOW()
WHERE id = 'c799fe21-f1f0-4ead-88c4-9c040f30eb39'
  AND tenant_id = '5cba9022-1f70-4b68-bb33-38e83194b0c2'
  AND folio_type = 'group_master';

-- Log the cleanup for audit trail
INSERT INTO finance_audit_events (
  tenant_id,
  event_type,
  user_id,
  target_id,
  payload
) VALUES (
  '5cba9022-1f70-4b68-bb33-38e83194b0c2',
  'group_billing_data_cleanup',
  NULL,
  'c799fe21-f1f0-4ead-88c4-9c040f30eb39',
  jsonb_build_object(
    'action', 'reset_master_folio',
    'reason', 'GROUP-BILLING-FIX-V1 Phase 6 - Fixing triple-charge issue',
    'group_id', '7ec5d0ea-4c46-486d-b93c-62c61a8b5f94',
    'group_name', 'WEDDING 2',
    'old_charges', 90000,
    'new_charges', 0
  )
);