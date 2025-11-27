-- =====================================================
-- ENTERPRISE ACCOUNTING LEDGER MODULE - PHASE 1 (FIXED)
-- Database Foundation: ledger_entries, ledger_batches, ledger_audit_logs
-- =====================================================

-- ENUMS
CREATE TYPE ledger_transaction_type AS ENUM (
  'debit', 'credit', 'refund', 'reversal', 'wallet_topup', 'wallet_deduction', 
  'pos', 'transfer', 'cash', 'invoice'
);

CREATE TYPE ledger_status AS ENUM ('completed', 'pending', 'refunded', 'failed');
CREATE TYPE ledger_reconciliation_status AS ENUM ('reconciled', 'pending', 'disputed');
CREATE TYPE ledger_shift AS ENUM ('morning', 'afternoon', 'evening', 'night');

-- TABLE: ledger_entries
CREATE TABLE public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  folio_id UUID REFERENCES public.stay_folios(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  group_booking_id UUID REFERENCES public.group_bookings(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  wallet_transaction_id UUID REFERENCES public.wallet_transactions(id) ON DELETE SET NULL,
  qr_request_id UUID REFERENCES public.requests(id) ON DELETE SET NULL,
  
  guest_name TEXT,
  room_number TEXT,
  room_category TEXT,
  
  transaction_type ledger_transaction_type NOT NULL,
  transaction_category TEXT NOT NULL,
  payment_method TEXT,
  payment_provider TEXT,
  payment_location TEXT,
  department TEXT,
  shift ledger_shift,
  
  staff_id_initiated UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  staff_id_confirmed UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  tax_amount NUMERIC(10,2) DEFAULT 0,
  service_charge_amount NUMERIC(10,2) DEFAULT 0,
  
  status ledger_status NOT NULL DEFAULT 'pending',
  reconciliation_status ledger_reconciliation_status NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ledger_entries_tenant ON public.ledger_entries(tenant_id);
CREATE INDEX idx_ledger_entries_created_at ON public.ledger_entries(created_at DESC);
CREATE INDEX idx_ledger_entries_tenant_date ON public.ledger_entries(tenant_id, created_at DESC);
CREATE INDEX idx_ledger_entries_folio ON public.ledger_entries(folio_id) WHERE folio_id IS NOT NULL;
CREATE INDEX idx_ledger_entries_booking ON public.ledger_entries(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX idx_ledger_entries_guest ON public.ledger_entries(guest_id) WHERE guest_id IS NOT NULL;
CREATE INDEX idx_ledger_entries_payment ON public.ledger_entries(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX idx_ledger_entries_status ON public.ledger_entries(tenant_id, status);
CREATE INDEX idx_ledger_entries_reconciliation ON public.ledger_entries(tenant_id, reconciliation_status);
CREATE INDEX idx_ledger_entries_type ON public.ledger_entries(tenant_id, transaction_type);
CREATE INDEX idx_ledger_entries_category ON public.ledger_entries(tenant_id, transaction_category);
CREATE INDEX idx_ledger_entries_department ON public.ledger_entries(tenant_id, department) WHERE department IS NOT NULL;
CREATE INDEX idx_ledger_entries_shift ON public.ledger_entries(tenant_id, shift) WHERE shift IS NOT NULL;

ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY ledger_entries_tenant_select ON public.ledger_entries
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY ledger_entries_tenant_insert ON public.ledger_entries
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant(auth.uid()) AND auth.uid() IS NOT NULL);

CREATE POLICY ledger_entries_tenant_update ON public.ledger_entries
  FOR UPDATE USING (tenant_id = get_user_tenant(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

-- TABLE: ledger_batches
CREATE TABLE public.ledger_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  batch_date DATE NOT NULL,
  batch_type TEXT NOT NULL DEFAULT 'night_audit',
  total_transactions INTEGER NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_credits NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_debits NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, batch_date, batch_type)
);

CREATE INDEX idx_ledger_batches_tenant ON public.ledger_batches(tenant_id);
CREATE INDEX idx_ledger_batches_date ON public.ledger_batches(batch_date DESC);
CREATE INDEX idx_ledger_batches_status ON public.ledger_batches(tenant_id, status);

ALTER TABLE public.ledger_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY ledger_batches_tenant_select ON public.ledger_batches
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY ledger_batches_tenant_insert ON public.ledger_batches
  FOR INSERT WITH CHECK (
    tenant_id = get_user_tenant(auth.uid()) 
    AND (has_role(auth.uid(), tenant_id, 'owner') OR has_role(auth.uid(), tenant_id, 'manager') OR has_role(auth.uid(), tenant_id, 'accountant'))
  );

CREATE POLICY ledger_batches_tenant_update ON public.ledger_batches
  FOR UPDATE USING (
    tenant_id = get_user_tenant(auth.uid()) 
    AND (has_role(auth.uid(), tenant_id, 'owner') OR has_role(auth.uid(), tenant_id, 'manager') OR has_role(auth.uid(), tenant_id, 'accountant'))
  );

-- TABLE: ledger_audit_logs
CREATE TABLE public.ledger_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ledger_entry_id UUID REFERENCES public.ledger_entries(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  staff_name TEXT,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  device_info TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_audit_logs_tenant ON public.ledger_audit_logs(tenant_id);
CREATE INDEX idx_ledger_audit_logs_entry ON public.ledger_audit_logs(ledger_entry_id);
CREATE INDEX idx_ledger_audit_logs_staff ON public.ledger_audit_logs(staff_id) WHERE staff_id IS NOT NULL;
CREATE INDEX idx_ledger_audit_logs_timestamp ON public.ledger_audit_logs(timestamp DESC);
CREATE INDEX idx_ledger_audit_logs_action ON public.ledger_audit_logs(tenant_id, action);

ALTER TABLE public.ledger_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY ledger_audit_logs_tenant_select ON public.ledger_audit_logs
  FOR SELECT USING (
    tenant_id = get_user_tenant(auth.uid()) 
    AND (has_role(auth.uid(), tenant_id, 'owner') OR has_role(auth.uid(), tenant_id, 'manager') OR has_role(auth.uid(), tenant_id, 'accountant'))
  );

CREATE POLICY ledger_audit_logs_system_insert ON public.ledger_audit_logs
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

-- TRIGGERS
CREATE OR REPLACE FUNCTION update_ledger_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ledger_entries_updated_at
  BEFORE UPDATE ON public.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION update_ledger_updated_at();

CREATE TRIGGER trigger_ledger_batches_updated_at
  BEFORE UPDATE ON public.ledger_batches
  FOR EACH ROW EXECUTE FUNCTION update_ledger_updated_at();