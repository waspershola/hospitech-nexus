-- PHASE-6-BACKFILL-V1: Backfill QR request linkage in existing ledger entries
-- Safe operation: only updates NULL qr_request_id where metadata contains request_id

-- Backfill qr_request_id from metadata->>'request_id' where currently NULL
UPDATE ledger_entries le
SET qr_request_id = (le.metadata->>'request_id')::uuid
WHERE le.qr_request_id IS NULL
  AND le.metadata->>'request_id' IS NOT NULL
  AND le.metadata->>'request_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'; -- Validate UUID format