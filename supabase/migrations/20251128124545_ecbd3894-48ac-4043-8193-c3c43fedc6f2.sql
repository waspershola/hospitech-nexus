-- ============================================
-- PHASE 2C: CASH DRAWER EXPECTED BALANCE SYSTEM
-- Migration: Add cash drawer sessions with ledger integration
-- Version: CASH-DRAWER-LEDGER-V1
-- ============================================

-- Create cash_drawer_sessions table if not exists
CREATE TABLE IF NOT EXISTS public.cash_drawer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE RESTRICT,
  shift_code TEXT NOT NULL CHECK (shift_code IN ('morning', 'afternoon', 'evening', 'night')),
  location_id UUID REFERENCES public.finance_locations(id) ON DELETE SET NULL,
  
  -- Session timing
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  
  -- Cash amounts
  opening_float NUMERIC(12, 2) NOT NULL DEFAULT 0,
  expected_cash NUMERIC(12, 2) NOT NULL DEFAULT 0, -- Calculated from ledger
  counted_cash NUMERIC(12, 2), -- Entered by staff at close
  variance NUMERIC(12, 2), -- counted - expected
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'approved', 'flagged')),
  
  -- Approval
  approved_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.cash_drawer_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's cash drawer sessions"
  ON public.cash_drawer_sessions
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can insert cash drawer sessions for their tenant"
  ON public.cash_drawer_sessions
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can update cash drawer sessions for their tenant"
  ON public.cash_drawer_sessions
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.staff WHERE user_id = auth.uid()
    )
  );

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_cash_drawer_sessions_tenant_id ON public.cash_drawer_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_drawer_sessions_staff_id ON public.cash_drawer_sessions(staff_id);
CREATE INDEX IF NOT EXISTS idx_cash_drawer_sessions_status ON public.cash_drawer_sessions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cash_drawer_sessions_opened_at ON public.cash_drawer_sessions(tenant_id, opened_at DESC);

-- Create RPC to calculate expected cash from ledger
CREATE OR REPLACE FUNCTION public.calculate_expected_cash_from_ledger(
  p_tenant_id UUID,
  p_staff_id UUID,
  p_shift_code TEXT,
  p_opened_at TIMESTAMPTZ,
  p_closed_at TIMESTAMPTZ
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expected_cash NUMERIC := 0;
BEGIN
  -- Sum all cash transactions for this staff, shift, and time range
  SELECT COALESCE(SUM(amount), 0)
  INTO v_expected_cash
  FROM ledger_entries
  WHERE tenant_id = p_tenant_id
    AND payment_method = 'cash'
    AND status = 'completed'
    AND created_at >= p_opened_at
    AND created_at <= COALESCE(p_closed_at, now())
    AND (
      staff_id_initiated = p_staff_id 
      OR staff_id_confirmed = p_staff_id
    )
    AND (p_shift_code IS NULL OR shift = p_shift_code);
  
  RETURN v_expected_cash;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_cash_drawer_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_cash_drawer_sessions_timestamp
  BEFORE UPDATE ON public.cash_drawer_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cash_drawer_timestamp();

-- Grant execute permission on RPC
GRANT EXECUTE ON FUNCTION public.calculate_expected_cash_from_ledger TO authenticated;

COMMENT ON TABLE public.cash_drawer_sessions IS 'Phase 2C: Cash drawer sessions with ledger-calculated expected balances';
COMMENT ON FUNCTION public.calculate_expected_cash_from_ledger IS 'Calculates expected cash from ledger entries for a staff member and shift';