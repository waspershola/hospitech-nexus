-- Phase 4: Server-Side Filtering Performance Optimization (V3 - Fixed Column Names)
-- Add indexes for frequently filtered columns in ledger_entries table
-- Version: LEDGER-PHASE4-INDEXES-V3

-- Enable pg_trgm extension for fuzzy text search (must be done first)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Additional index on transaction_type (already has basic index from Phase 1)
CREATE INDEX IF NOT EXISTS idx_ledger_entries_payment_method 
ON ledger_entries(tenant_id, payment_method) 
WHERE payment_method IS NOT NULL;

-- Index on staff_id_initiated for staff filtering
CREATE INDEX IF NOT EXISTS idx_ledger_entries_staff_initiated 
ON ledger_entries(tenant_id, staff_id_initiated) 
WHERE staff_id_initiated IS NOT NULL;

-- Index on staff_id_confirmed for staff filtering
CREATE INDEX IF NOT EXISTS idx_ledger_entries_staff_confirmed 
ON ledger_entries(tenant_id, staff_id_confirmed) 
WHERE staff_id_confirmed IS NOT NULL;

-- GIN index on ledger_reference for text search performance
CREATE INDEX IF NOT EXISTS idx_ledger_entries_ledger_reference_trgm 
ON ledger_entries USING gin(ledger_reference gin_trgm_ops);

-- GIN index on guest_name for text search performance
CREATE INDEX IF NOT EXISTS idx_ledger_entries_guest_name_trgm 
ON ledger_entries USING gin(guest_name gin_trgm_ops);

-- Composite index for date + status (enhancing existing indexes)
CREATE INDEX IF NOT EXISTS idx_ledger_entries_date_status_v2
ON ledger_entries(tenant_id, created_at DESC, status);

-- Composite index for date + transaction_type
CREATE INDEX IF NOT EXISTS idx_ledger_entries_date_type_v2
ON ledger_entries(tenant_id, created_at DESC, transaction_type);

COMMENT ON INDEX idx_ledger_entries_ledger_reference_trgm IS 'Enables fast fuzzy search on ledger reference codes';
COMMENT ON INDEX idx_ledger_entries_guest_name_trgm IS 'Enables fast fuzzy search on guest names';
COMMENT ON INDEX idx_ledger_entries_staff_initiated IS 'Optimizes staff filtering on initiated transactions';
COMMENT ON INDEX idx_ledger_entries_staff_confirmed IS 'Optimizes staff filtering on confirmed transactions';