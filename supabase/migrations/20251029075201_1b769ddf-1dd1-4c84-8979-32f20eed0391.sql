-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  wallet_type text NOT NULL CHECK (wallet_type IN ('guest', 'department', 'organization')),
  owner_id uuid,
  name text,
  department text,
  balance numeric(14,2) DEFAULT 0 NOT NULL,
  currency text DEFAULT 'NGN' NOT NULL,
  last_transaction_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallets_tenant ON wallets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wallets_owner ON wallets(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wallets_type ON wallets(wallet_type);

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid REFERENCES wallets(id) ON DELETE CASCADE NOT NULL,
  payment_id uuid REFERENCES payments(id),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('credit', 'debit')),
  amount numeric(14,2) NOT NULL,
  description text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_txn_wallet ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_payment ON wallet_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_tenant ON wallet_transactions(tenant_id);

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  contact_person text,
  contact_email text,
  wallet_id uuid REFERENCES wallets(id),
  credit_limit numeric(14,2) DEFAULT 0,
  allow_negative_balance boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orgs_tenant ON organizations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orgs_wallet ON organizations(wallet_id);

-- Create organization_wallet_rules table
CREATE TABLE IF NOT EXISTS organization_wallet_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('per_guest', 'per_department', 'total_wallet_cap')),
  entity_ref text,
  limit_amount numeric(14,2) NOT NULL,
  period text NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'none')),
  active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_rules_org ON organization_wallet_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_rules_active ON organization_wallet_rules(active) WHERE active = true;

-- Extend payments table
ALTER TABLE payments 
  ADD COLUMN IF NOT EXISTS transaction_ref text,
  ADD COLUMN IF NOT EXISTS guest_id uuid,
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS expected_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS payment_type text CHECK (payment_type IN ('partial', 'full', 'overpayment')),
  ADD COLUMN IF NOT EXISTS method_provider text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS wallet_id uuid REFERENCES wallets(id),
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS recorded_by uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_txn_ref ON payments(transaction_ref) WHERE transaction_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_guest ON payments(guest_id) WHERE guest_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_wallet ON payments(wallet_id) WHERE wallet_id IS NOT NULL;

-- Finance providers table
CREATE TABLE IF NOT EXISTS finance_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('pos', 'online', 'transfer', 'cash')),
  api_key text,
  api_secret text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  fee_percent numeric(5,2) DEFAULT 0,
  meta jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_providers_tenant ON finance_providers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_providers_active ON finance_providers(status) WHERE status = 'active';

-- Finance locations table
CREATE TABLE IF NOT EXISTS finance_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  department text,
  provider_id uuid REFERENCES finance_providers(id),
  wallet_id uuid REFERENCES wallets(id),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_locations_tenant ON finance_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_locations_provider ON finance_locations(provider_id);

-- Finance provider rules table
CREATE TABLE IF NOT EXISTS finance_provider_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  provider_id uuid REFERENCES finance_providers(id) ON DELETE CASCADE NOT NULL,
  location_id uuid REFERENCES finance_locations(id),
  department text,
  auto_reconcile boolean DEFAULT false,
  max_txn_limit numeric(12,2),
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_rules_provider ON finance_provider_rules(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_rules_location ON finance_provider_rules(location_id);

-- Finance reconciliation records table
CREATE TABLE IF NOT EXISTS finance_reconciliation_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  provider_id uuid REFERENCES finance_providers(id),
  reference text NOT NULL,
  internal_txn_id uuid REFERENCES payments(id),
  amount numeric(12,2) NOT NULL,
  status text DEFAULT 'unmatched' CHECK (status IN ('matched', 'unmatched', 'partial', 'overpaid')),
  source text NOT NULL CHECK (source IN ('api', 'csv')),
  matched_by uuid,
  reconciled_at timestamptz,
  raw_data jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recon_tenant ON finance_reconciliation_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recon_status ON finance_reconciliation_records(status);
CREATE INDEX IF NOT EXISTS idx_recon_ref ON finance_reconciliation_records(reference);

-- Finance reconciliation audit table
CREATE TABLE IF NOT EXISTS finance_reconciliation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  reconciliation_id uuid REFERENCES finance_reconciliation_records(id),
  action text NOT NULL,
  performed_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recon_audit_recon ON finance_reconciliation_audit(reconciliation_id);

-- Finance analytics snapshots table
CREATE TABLE IF NOT EXISTS finance_analytics_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  department text,
  total_income numeric(12,2) DEFAULT 0,
  total_expense numeric(12,2) DEFAULT 0,
  discrepancy numeric(12,2) DEFAULT 0,
  matched_txn_count int DEFAULT 0,
  unmatched_txn_count int DEFAULT 0,
  overpayment_count int DEFAULT 0,
  generated_by uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, date, department)
);

CREATE INDEX IF NOT EXISTS idx_analytics_tenant_date ON finance_analytics_snapshots(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_department ON finance_analytics_snapshots(department);

-- RLS Policies for wallets
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallets_select_tenant" ON wallets;
CREATE POLICY "wallets_select_tenant" ON wallets
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

DROP POLICY IF EXISTS "wallets_insert_tenant" ON wallets;
CREATE POLICY "wallets_insert_tenant" ON wallets
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

DROP POLICY IF EXISTS "wallets_update_tenant" ON wallets;
CREATE POLICY "wallets_update_tenant" ON wallets
  FOR UPDATE USING (tenant_id = get_user_tenant(auth.uid()));

-- RLS Policies for wallet_transactions
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet_txn_select" ON wallet_transactions;
CREATE POLICY "wallet_txn_select" ON wallet_transactions
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

DROP POLICY IF EXISTS "wallet_txn_insert" ON wallet_transactions;
CREATE POLICY "wallet_txn_insert" ON wallet_transactions
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

-- RLS Policies for organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orgs_select" ON organizations;
CREATE POLICY "orgs_select" ON organizations
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

DROP POLICY IF EXISTS "orgs_manage" ON organizations;
CREATE POLICY "orgs_manage" ON organizations
  FOR ALL USING (
    tenant_id = get_user_tenant(auth.uid()) AND 
    (has_role(auth.uid(), tenant_id, 'owner'::app_role) OR 
     has_role(auth.uid(), tenant_id, 'manager'::app_role))
  );

-- RLS Policies for organization_wallet_rules
ALTER TABLE organization_wallet_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_rules_select" ON organization_wallet_rules;
CREATE POLICY "org_rules_select" ON organization_wallet_rules
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

DROP POLICY IF EXISTS "org_rules_manage" ON organization_wallet_rules;
CREATE POLICY "org_rules_manage" ON organization_wallet_rules
  FOR ALL USING (
    tenant_id = get_user_tenant(auth.uid()) AND 
    (has_role(auth.uid(), tenant_id, 'owner'::app_role) OR 
     has_role(auth.uid(), tenant_id, 'manager'::app_role))
  );

-- RLS Policies for finance_providers
ALTER TABLE finance_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "providers_select" ON finance_providers;
CREATE POLICY "providers_select" ON finance_providers
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

DROP POLICY IF EXISTS "providers_manage" ON finance_providers;
CREATE POLICY "providers_manage" ON finance_providers
  FOR ALL USING (
    tenant_id = get_user_tenant(auth.uid()) AND 
    (has_role(auth.uid(), tenant_id, 'owner'::app_role) OR 
     has_role(auth.uid(), tenant_id, 'manager'::app_role))
  );

-- RLS Policies for finance_locations
ALTER TABLE finance_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "locations_select" ON finance_locations;
CREATE POLICY "locations_select" ON finance_locations
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

DROP POLICY IF EXISTS "locations_manage" ON finance_locations;
CREATE POLICY "locations_manage" ON finance_locations
  FOR ALL USING (
    tenant_id = get_user_tenant(auth.uid()) AND 
    (has_role(auth.uid(), tenant_id, 'owner'::app_role) OR 
     has_role(auth.uid(), tenant_id, 'manager'::app_role))
  );

-- RLS Policies for finance_provider_rules
ALTER TABLE finance_provider_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provider_rules_select" ON finance_provider_rules;
CREATE POLICY "provider_rules_select" ON finance_provider_rules
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

DROP POLICY IF EXISTS "provider_rules_manage" ON finance_provider_rules;
CREATE POLICY "provider_rules_manage" ON finance_provider_rules
  FOR ALL USING (
    tenant_id = get_user_tenant(auth.uid()) AND 
    (has_role(auth.uid(), tenant_id, 'owner'::app_role) OR 
     has_role(auth.uid(), tenant_id, 'manager'::app_role))
  );

-- RLS Policies for finance_reconciliation_records
ALTER TABLE finance_reconciliation_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recon_select" ON finance_reconciliation_records;
CREATE POLICY "recon_select" ON finance_reconciliation_records
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

DROP POLICY IF EXISTS "recon_manage" ON finance_reconciliation_records;
CREATE POLICY "recon_manage" ON finance_reconciliation_records
  FOR ALL USING (tenant_id = get_user_tenant(auth.uid()));

-- RLS Policies for finance_reconciliation_audit
ALTER TABLE finance_reconciliation_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recon_audit_select" ON finance_reconciliation_audit;
CREATE POLICY "recon_audit_select" ON finance_reconciliation_audit
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

DROP POLICY IF EXISTS "recon_audit_insert" ON finance_reconciliation_audit;
CREATE POLICY "recon_audit_insert" ON finance_reconciliation_audit
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

-- RLS Policies for finance_analytics_snapshots
ALTER TABLE finance_analytics_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analytics_select" ON finance_analytics_snapshots;
CREATE POLICY "analytics_select" ON finance_analytics_snapshots
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

DROP POLICY IF EXISTS "analytics_manage" ON finance_analytics_snapshots;
CREATE POLICY "analytics_manage" ON finance_analytics_snapshots
  FOR ALL USING (
    tenant_id = get_user_tenant(auth.uid()) AND 
    (has_role(auth.uid(), tenant_id, 'owner'::app_role) OR 
     has_role(auth.uid(), tenant_id, 'manager'::app_role))
  );

-- Database function to validate organization limits
CREATE OR REPLACE FUNCTION validate_org_limits(
  _org_id uuid,
  _guest_id uuid,
  _department text,
  _amount numeric
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rule_record RECORD;
  current_usage numeric;
  result jsonb;
BEGIN
  result := jsonb_build_object('allowed', true);
  
  FOR rule_record IN 
    SELECT * FROM organization_wallet_rules 
    WHERE organization_id = _org_id 
      AND active = true
  LOOP
    IF rule_record.rule_type = 'per_guest' AND rule_record.entity_ref = _guest_id::text THEN
      SELECT COALESCE(SUM(amount), 0) INTO current_usage
      FROM wallet_transactions wt
      JOIN wallets w ON wt.wallet_id = w.id
      WHERE w.owner_id = _org_id
        AND wt.created_at >= CASE 
          WHEN rule_record.period = 'daily' THEN now() - interval '1 day'
          WHEN rule_record.period = 'weekly' THEN now() - interval '7 days'
          WHEN rule_record.period = 'monthly' THEN now() - interval '30 days'
          ELSE now() - interval '100 years'
        END;
      
      IF current_usage + _amount > rule_record.limit_amount THEN
        result := jsonb_build_object(
          'allowed', false,
          'code', 'LIMIT_EXCEEDED',
          'detail', format('Per-guest limit exceeded. Current: %s, Limit: %s', current_usage, rule_record.limit_amount)
        );
        RETURN result;
      END IF;
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$;

-- Trigger function to update wallet balance
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.type = 'credit' THEN
    UPDATE wallets 
    SET balance = balance + NEW.amount,
        last_transaction_at = NEW.created_at,
        updated_at = now()
    WHERE id = NEW.wallet_id;
  ELSIF NEW.type = 'debit' THEN
    UPDATE wallets 
    SET balance = balance - NEW.amount,
        last_transaction_at = NEW.created_at,
        updated_at = now()
    WHERE id = NEW.wallet_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_wallet_balance ON wallet_transactions;
CREATE TRIGGER trigger_update_wallet_balance
AFTER INSERT ON wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION update_wallet_balance();