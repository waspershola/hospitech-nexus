-- Phase 1: Database Schema Enhancements for Receivables & Wallet Credit Management

-- 1.1 Add missing columns to wallet_transactions for audit trail
ALTER TABLE wallet_transactions 
ADD COLUMN IF NOT EXISTS balance_after numeric(12,2),
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Add source types constraint
ALTER TABLE wallet_transactions
DROP CONSTRAINT IF EXISTS wallet_transactions_source_check;

ALTER TABLE wallet_transactions
ADD CONSTRAINT wallet_transactions_source_check
CHECK (source IN ('payment', 'charge', 'refund', 'manual', 'reconciliation', 'adjustment', 'overpayment', 'booking_apply'));

-- 1.2 Create dedicated receivables table for accounts receivable management
CREATE TABLE IF NOT EXISTS receivables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  guest_id uuid NULL REFERENCES guests(id) ON DELETE SET NULL,
  organization_id uuid NULL REFERENCES organizations(id) ON DELETE SET NULL,
  booking_id uuid NULL REFERENCES bookings(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'written_off', 'escalated')),
  due_date date NULL,
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid NULL REFERENCES auth.users(id),
  paid_at timestamptz NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  CONSTRAINT receivables_owner_check CHECK (
    (guest_id IS NOT NULL AND organization_id IS NULL) OR 
    (guest_id IS NULL AND organization_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_receivables_tenant ON receivables(tenant_id);
CREATE INDEX IF NOT EXISTS idx_receivables_guest ON receivables(guest_id) WHERE guest_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_receivables_org ON receivables(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_receivables_status ON receivables(status) WHERE status = 'open';

-- RLS Policies for receivables
ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS receivables_tenant_access ON receivables;
CREATE POLICY receivables_tenant_access ON receivables
  FOR ALL USING (tenant_id = get_user_tenant(auth.uid()));

-- 1.3 Create hotel payment preferences table
CREATE TABLE IF NOT EXISTS hotel_payment_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  allow_checkout_with_debt boolean DEFAULT false,
  auto_apply_wallet_on_booking boolean DEFAULT true,
  overpayment_default_action text DEFAULT 'wallet' CHECK (overpayment_default_action IN ('wallet', 'prompt', 'refund')),
  manager_approval_threshold numeric(12,2) DEFAULT 50000,
  receivable_aging_days integer DEFAULT 30,
  large_overpayment_threshold numeric(12,2) DEFAULT 50000,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_prefs_tenant ON hotel_payment_preferences(tenant_id);

ALTER TABLE hotel_payment_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_prefs_manage ON hotel_payment_preferences;
CREATE POLICY payment_prefs_manage ON hotel_payment_preferences
  FOR ALL USING (
    tenant_id = get_user_tenant(auth.uid()) AND
    (has_role(auth.uid(), tenant_id, 'owner'::app_role) OR has_role(auth.uid(), tenant_id, 'manager'::app_role))
  );

-- 1.4 Create finance_audit_events table for comprehensive audit logging
CREATE TABLE IF NOT EXISTS finance_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  user_id uuid NULL REFERENCES auth.users(id),
  target_id uuid NULL,
  payload jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_tenant ON finance_audit_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_type ON finance_audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON finance_audit_events(created_at DESC);

ALTER TABLE finance_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_events_tenant_read ON finance_audit_events;
CREATE POLICY audit_events_tenant_read ON finance_audit_events
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

DROP POLICY IF EXISTS audit_events_insert ON finance_audit_events;
CREATE POLICY audit_events_insert ON finance_audit_events
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

-- 1.5 Create audit trigger for receivables
CREATE OR REPLACE FUNCTION log_receivable_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO finance_audit_events (
    tenant_id,
    event_type,
    user_id,
    target_id,
    payload
  ) VALUES (
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'receivable_created'
      WHEN TG_OP = 'UPDATE' AND NEW.status = 'paid' THEN 'receivable_paid'
      WHEN TG_OP = 'UPDATE' AND NEW.status = 'written_off' THEN 'receivable_written_off'
      ELSE 'receivable_updated'
    END,
    auth.uid(),
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'amount', COALESCE(NEW.amount, OLD.amount),
      'old_status', OLD.status,
      'new_status', NEW.status,
      'guest_id', COALESCE(NEW.guest_id, OLD.guest_id),
      'booking_id', COALESCE(NEW.booking_id, OLD.booking_id)
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS receivable_audit_trigger ON receivables;
CREATE TRIGGER receivable_audit_trigger
  AFTER INSERT OR UPDATE ON receivables
  FOR EACH ROW EXECUTE FUNCTION log_receivable_change();

-- 1.6 Update updated_at trigger for new tables
DROP TRIGGER IF EXISTS update_receivables_updated_at ON receivables;
CREATE TRIGGER update_receivables_updated_at
  BEFORE UPDATE ON receivables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_prefs_updated_at ON hotel_payment_preferences;
CREATE TRIGGER update_payment_prefs_updated_at
  BEFORE UPDATE ON hotel_payment_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();