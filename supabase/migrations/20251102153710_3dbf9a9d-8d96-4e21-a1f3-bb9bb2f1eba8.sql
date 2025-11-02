-- Clear all booking-related data and reset rooms
-- Delete in correct order to avoid foreign key violations

-- 1. Delete audit records first
DELETE FROM finance_reconciliation_audit;

-- 2. Delete reconciliation records
DELETE FROM finance_reconciliation_records;

-- 3. Delete wallet transactions (references payments)
DELETE FROM wallet_transactions;

-- 4. Delete payments
DELETE FROM payments;

-- 5. Delete booking charges
DELETE FROM booking_charges;

-- 6. Delete receivables
DELETE FROM receivables;

-- 7. Delete bookings
DELETE FROM bookings;

-- 8. Delete all guests
DELETE FROM guests;

-- 9. Reset all rooms to available status
UPDATE rooms 
SET 
  status = 'available',
  current_reservation_id = NULL,
  current_guest_id = NULL,
  metadata = COALESCE(metadata, '{}'::jsonb) - 'manual_status_override' - 'last_sync_check';