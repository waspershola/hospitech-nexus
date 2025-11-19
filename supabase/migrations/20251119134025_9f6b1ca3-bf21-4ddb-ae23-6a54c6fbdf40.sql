-- Phase 6: Tenant Isolation Audit - RLS Policy Enhancement
-- Version: TENANT-ISOLATION-V6
-- Purpose: Ensure all folio-related tables have comprehensive RLS policies with tenant_id checks

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view folios for their tenant" ON stay_folios;
DROP POLICY IF EXISTS "Users can create folios for their tenant" ON stay_folios;
DROP POLICY IF EXISTS "Users can update folios for their tenant" ON stay_folios;

DROP POLICY IF EXISTS "Users can view folio transactions for their tenant" ON folio_transactions;
DROP POLICY IF EXISTS "Users can create folio transactions for their tenant" ON folio_transactions;
DROP POLICY IF EXISTS "Users can update folio transactions for their tenant" ON folio_transactions;

-- Stay Folios RLS Policies
CREATE POLICY "Users can view folios for their tenant"
  ON stay_folios
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create folios for their tenant"
  ON stay_folios
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update folios for their tenant"
  ON stay_folios
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Folio Transactions RLS Policies
CREATE POLICY "Users can view folio transactions for their tenant"
  ON folio_transactions
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create folio transactions for their tenant"
  ON folio_transactions
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update folio transactions for their tenant"
  ON folio_transactions
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Add indexes for tenant_id queries on folio tables for performance
CREATE INDEX IF NOT EXISTS idx_stay_folios_tenant_booking 
  ON stay_folios(tenant_id, booking_id);

CREATE INDEX IF NOT EXISTS idx_stay_folios_tenant_status 
  ON stay_folios(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_folio_transactions_tenant_folio 
  ON folio_transactions(tenant_id, folio_id);

CREATE INDEX IF NOT EXISTS idx_folio_transactions_tenant_type 
  ON folio_transactions(tenant_id, transaction_type);

-- Verify RLS is enabled on both tables
ALTER TABLE stay_folios ENABLE ROW LEVEL SECURITY;
ALTER TABLE folio_transactions ENABLE ROW LEVEL SECURITY;