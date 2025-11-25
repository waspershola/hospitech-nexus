-- =====================================================
-- FOLIO-PREFETCH-V1: Performance Indexes for Folio System
-- =====================================================
-- Description: Add composite indexes to optimize time-ordered folio transaction 
-- and payment queries. Improves Front Desk drawer performance by reducing 
-- query latency for folio data fetching.
--
-- Risk Level: Very Low (additive only, idempotent)
-- Impact: Faster folio queries without changing any business logic
-- =====================================================

-- Optimize time-ordered transaction fetches by folio
-- This index supports queries like: SELECT * FROM folio_transactions WHERE folio_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_folio_transactions_folio_created
  ON public.folio_transactions (folio_id, created_at DESC);

-- Optimize payment lookups by booking with time ordering
-- This index supports queries like: SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_payments_booking_created  
  ON public.payments (booking_id, created_at DESC);

-- Add comments documenting the optimization
COMMENT ON INDEX idx_folio_transactions_folio_created IS 'FOLIO-PREFETCH-V1: Optimizes time-ordered folio transaction queries for Front Desk drawer performance';
COMMENT ON INDEX idx_payments_booking_created IS 'FOLIO-PREFETCH-V1: Optimizes booking payment queries with time ordering for faster folio balance calculations';