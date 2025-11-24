-- Phase 1: Database Foundation for QR Billing Task Sync
-- Marker: QR-BILLING-SYNC-PHASE-1-V1

-- Add billing tracking columns to requests table
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS billed_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS billed_folio_id UUID REFERENCES stay_folios(id),
  ADD COLUMN IF NOT EXISTS billed_transaction_id UUID REFERENCES folio_transactions(id),
  ADD COLUMN IF NOT EXISTS billed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Unique partial index to prevent double-billing (tenant-scoped)
-- Only enforces uniqueness when billing_status is 'posted_to_folio' or 'paid_direct'
CREATE UNIQUE INDEX IF NOT EXISTS uq_requests_billing_ref_completed
  ON requests (tenant_id, billing_reference_code)
  WHERE billing_status IN ('posted_to_folio', 'paid_direct');

-- Index for efficient billing status queries
CREATE INDEX IF NOT EXISTS idx_requests_billing_status_tenant
  ON requests (tenant_id, billing_status)
  WHERE billing_status IS NOT NULL;

COMMENT ON COLUMN requests.billed_amount IS 'Amount actually billed to folio (may differ from order total)';
COMMENT ON COLUMN requests.billed_folio_id IS 'Folio where charge was posted';
COMMENT ON COLUMN requests.billed_transaction_id IS 'folio_transactions.id linking to charge';
COMMENT ON COLUMN requests.billed_at IS 'Timestamp when charge posted to folio';
COMMENT ON COLUMN requests.paid_at IS 'Timestamp when folio payment collected';