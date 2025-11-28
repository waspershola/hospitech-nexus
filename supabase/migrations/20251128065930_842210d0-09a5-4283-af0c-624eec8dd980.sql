-- Add missing description column to ledger_entries table
-- This column is required by insert_ledger_entry RPC function
-- Migration: LEDGER-DESCRIPTION-COLUMN-V1

ALTER TABLE ledger_entries 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment for documentation
COMMENT ON COLUMN ledger_entries.description IS 'Human-readable description of the ledger entry (e.g., "Payment received", "QR service charge")';