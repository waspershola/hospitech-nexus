-- Phase 1B: Platform Management Foundation Schema (Tables, Functions, Policies)

-- Platform Users table (separate from tenant users)
CREATE TABLE IF NOT EXISTS platform_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role app_role NOT NULL,
  last_active TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform Tenants table (meta info about all tenants)
CREATE TABLE IF NOT EXISTS platform_tenants (
  id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  domain TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'cancelled')),
  plan_id UUID,
  owner_email TEXT NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform Plans table
CREATE TABLE IF NOT EXISTS platform_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  monthly_price NUMERIC NOT NULL DEFAULT 0,
  included_sms INTEGER NOT NULL DEFAULT 0,
  trial_days INTEGER NOT NULL DEFAULT 0,
  feature_flags JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform SMS Providers (centralized)
CREATE TABLE IF NOT EXISTS platform_sms_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_type TEXT NOT NULL CHECK (provider_type IN ('twilio', 'termii')),
  api_key_encrypted TEXT,
  api_secret_encrypted TEXT,
  default_sender_id TEXT,
  provider_settings JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform SMS Credit Pool (per-tenant credits)
CREATE TABLE IF NOT EXISTS platform_sms_credit_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  total_credits INTEGER NOT NULL DEFAULT 0,
  allocated_credits INTEGER NOT NULL DEFAULT 0,
  consumed_credits INTEGER NOT NULL DEFAULT 0,
  last_topup_at TIMESTAMPTZ,
  billing_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Platform SMS Templates (global + tenant overrides)
CREATE TABLE IF NOT EXISTS platform_sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  template_body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, event_key, language)
);

-- Tenant Provider Assignments (link tenants to platform providers)
CREATE TABLE IF NOT EXISTS tenant_provider_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES platform_sms_providers(id) ON DELETE CASCADE,
  sender_id TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, provider_id)
);

-- Platform Billing
CREATE TABLE IF NOT EXISTS platform_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cycle_start DATE NOT NULL,
  cycle_end DATE NOT NULL,
  amount_due NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  sms_used INTEGER NOT NULL DEFAULT 0,
  invoice_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform Usage Tracking
CREATE TABLE IF NOT EXISTS platform_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rooms_total INTEGER NOT NULL DEFAULT 0,
  bookings_monthly INTEGER NOT NULL DEFAULT 0,
  sms_sent INTEGER NOT NULL DEFAULT 0,
  api_calls INTEGER NOT NULL DEFAULT 0,
  last_sync TIMESTAMPTZ NOT NULL DEFAULT now(),
  usage_snapshot JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform Add-ons (marketplace catalog)
CREATE TABLE IF NOT EXISTS platform_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  pricing JSONB NOT NULL DEFAULT '{}'::jsonb,
  units_available INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform Add-on Purchases
CREATE TABLE IF NOT EXISTS platform_addon_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES platform_addons(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform Audit Stream (all platform actions)
CREATE TABLE IF NOT EXISTS platform_audit_stream (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_role app_role,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform Backups
CREATE TABLE IF NOT EXISTS platform_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('full', 'partial')),
  s3_reference TEXT,
  created_by UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Platform Email Providers
CREATE TABLE IF NOT EXISTS platform_email_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_type TEXT NOT NULL CHECK (provider_type IN ('sendgrid', 'ses', 'mailgun', 'resend')),
  api_key_encrypted TEXT,
  default_from TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform Support Tickets
CREATE TABLE IF NOT EXISTS platform_support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to UUID REFERENCES platform_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform Feature Flags
CREATE TABLE IF NOT EXISTS platform_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  description TEXT,
  default_enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_rules JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform Navigation Items (unified nav system)
CREATE TABLE IF NOT EXISTS platform_nav_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  icon TEXT NOT NULL,
  roles_allowed TEXT[] NOT NULL DEFAULT '{}',
  departments_allowed TEXT[] DEFAULT '{}',
  parent_id UUID REFERENCES platform_nav_items(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE platform_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_sms_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_sms_credit_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_provider_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_addon_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_audit_stream ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_email_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_nav_items ENABLE ROW LEVEL SECURITY;

-- Security definer function to check platform role
CREATE OR REPLACE FUNCTION has_platform_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM platform_users
    WHERE id = _user_id
      AND role = _role
  )
$$;

-- Security definer function to check if user is any platform admin
CREATE OR REPLACE FUNCTION is_platform_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM platform_users
    WHERE id = _user_id
      AND role IN ('super_admin', 'support_admin', 'billing_bot', 'marketplace_admin', 'monitoring_bot')
  )
$$;

-- RLS Policies

-- Platform Users: only super_admin can manage
CREATE POLICY "super_admin_manage_platform_users" ON platform_users
  FOR ALL USING (has_platform_role(auth.uid(), 'super_admin'));

CREATE POLICY "platform_users_read_self" ON platform_users
  FOR SELECT USING (id = auth.uid());

-- Platform Tenants: platform admins can view, super_admin can manage
CREATE POLICY "platform_admin_view_tenants" ON platform_tenants
  FOR SELECT USING (is_platform_admin(auth.uid()));

CREATE POLICY "super_admin_manage_tenants" ON platform_tenants
  FOR ALL USING (has_platform_role(auth.uid(), 'super_admin'));

-- Platform Plans: platform admins can view, super_admin can manage
CREATE POLICY "platform_admin_view_plans" ON platform_plans
  FOR SELECT USING (is_platform_admin(auth.uid()));

CREATE POLICY "super_admin_manage_plans" ON platform_plans
  FOR ALL USING (has_platform_role(auth.uid(), 'super_admin'));

-- Platform SMS Providers: super_admin only
CREATE POLICY "super_admin_manage_sms_providers" ON platform_sms_providers
  FOR ALL USING (has_platform_role(auth.uid(), 'super_admin'));

-- Platform SMS Credit Pool: tenants read own, platform admins manage
CREATE POLICY "tenants_read_own_credit_pool" ON platform_sms_credit_pool
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "platform_manage_credit_pools" ON platform_sms_credit_pool
  FOR ALL USING (
    has_platform_role(auth.uid(), 'super_admin') OR 
    has_platform_role(auth.uid(), 'billing_bot')
  );

-- Platform SMS Templates: tenants read/manage own, platform admins manage all
CREATE POLICY "tenants_manage_own_templates" ON platform_sms_templates
  FOR ALL USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "platform_manage_global_templates" ON platform_sms_templates
  FOR ALL USING (
    (tenant_id IS NULL AND has_platform_role(auth.uid(), 'super_admin'))
  );

CREATE POLICY "tenants_read_global_templates" ON platform_sms_templates
  FOR SELECT USING (tenant_id IS NULL);

-- Tenant Provider Assignments: tenants read own, platform admins manage
CREATE POLICY "tenants_read_assignments" ON tenant_provider_assignments
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "platform_manage_assignments" ON tenant_provider_assignments
  FOR ALL USING (has_platform_role(auth.uid(), 'super_admin'));

-- Platform Billing: platform admins manage, tenants read own
CREATE POLICY "tenants_read_own_billing" ON platform_billing
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "platform_manage_billing" ON platform_billing
  FOR ALL USING (
    has_platform_role(auth.uid(), 'super_admin') OR 
    has_platform_role(auth.uid(), 'billing_bot')
  );

-- Platform Usage: platform admins manage, tenants read own
CREATE POLICY "tenants_read_own_usage" ON platform_usage
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "platform_manage_usage" ON platform_usage
  FOR ALL USING (is_platform_admin(auth.uid()));

-- Platform Add-ons: all authenticated can read, super_admin/marketplace_admin can manage
CREATE POLICY "authenticated_read_addons" ON platform_addons
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "platform_manage_addons" ON platform_addons
  FOR ALL USING (
    has_platform_role(auth.uid(), 'super_admin') OR 
    has_platform_role(auth.uid(), 'marketplace_admin')
  );

-- Platform Add-on Purchases: tenants manage own, platform admins view all
CREATE POLICY "tenants_manage_own_purchases" ON platform_addon_purchases
  FOR ALL USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "platform_view_all_purchases" ON platform_addon_purchases
  FOR SELECT USING (is_platform_admin(auth.uid()));

-- Platform Audit Stream: insert-only for authenticated, read for platform admins
CREATE POLICY "authenticated_insert_audit" ON platform_audit_stream
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "platform_read_audit" ON platform_audit_stream
  FOR SELECT USING (is_platform_admin(auth.uid()));

-- Platform Backups: super_admin only
CREATE POLICY "super_admin_manage_backups" ON platform_backups
  FOR ALL USING (has_platform_role(auth.uid(), 'super_admin'));

-- Platform Email Providers: super_admin only
CREATE POLICY "super_admin_manage_email_providers" ON platform_email_providers
  FOR ALL USING (has_platform_role(auth.uid(), 'super_admin'));

-- Platform Support Tickets: tenants manage own, support admins manage all
CREATE POLICY "tenants_manage_own_tickets" ON platform_support_tickets
  FOR ALL USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "support_manage_all_tickets" ON platform_support_tickets
  FOR ALL USING (
    has_platform_role(auth.uid(), 'super_admin') OR 
    has_platform_role(auth.uid(), 'support_admin')
  );

-- Platform Feature Flags: platform admins read, super_admin manage
CREATE POLICY "platform_read_feature_flags" ON platform_feature_flags
  FOR SELECT USING (is_platform_admin(auth.uid()));

CREATE POLICY "super_admin_manage_feature_flags" ON platform_feature_flags
  FOR ALL USING (has_platform_role(auth.uid(), 'super_admin'));

-- Platform Navigation Items: tenants read own + global, super_admin manage
CREATE POLICY "tenants_read_nav" ON platform_nav_items
  FOR SELECT USING (
    tenant_id = get_user_tenant(auth.uid()) OR 
    tenant_id IS NULL
  );

CREATE POLICY "super_admin_manage_nav" ON platform_nav_items
  FOR ALL USING (has_platform_role(auth.uid(), 'super_admin'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_platform_sms_credit_pool_tenant ON platform_sms_credit_pool(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_sms_templates_tenant ON platform_sms_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_sms_templates_event ON platform_sms_templates(event_key);
CREATE INDEX IF NOT EXISTS idx_tenant_provider_assignments_tenant ON tenant_provider_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_billing_tenant ON platform_billing(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_usage_tenant ON platform_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_addon_purchases_tenant ON platform_addon_purchases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_stream_created ON platform_audit_stream(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_backups_tenant ON platform_backups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_support_tickets_tenant ON platform_support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_nav_items_tenant ON platform_nav_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_nav_items_parent ON platform_nav_items(parent_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_platform_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_platform_users_updated_at BEFORE UPDATE ON platform_users
  FOR EACH ROW EXECUTE FUNCTION update_platform_updated_at();

CREATE TRIGGER update_platform_tenants_updated_at BEFORE UPDATE ON platform_tenants
  FOR EACH ROW EXECUTE FUNCTION update_platform_updated_at();

CREATE TRIGGER update_platform_plans_updated_at BEFORE UPDATE ON platform_plans
  FOR EACH ROW EXECUTE FUNCTION update_platform_updated_at();

CREATE TRIGGER update_platform_sms_providers_updated_at BEFORE UPDATE ON platform_sms_providers
  FOR EACH ROW EXECUTE FUNCTION update_platform_updated_at();

CREATE TRIGGER update_platform_sms_credit_pool_updated_at BEFORE UPDATE ON platform_sms_credit_pool
  FOR EACH ROW EXECUTE FUNCTION update_platform_updated_at();

CREATE TRIGGER update_platform_sms_templates_updated_at BEFORE UPDATE ON platform_sms_templates
  FOR EACH ROW EXECUTE FUNCTION update_platform_updated_at();

CREATE TRIGGER update_platform_billing_updated_at BEFORE UPDATE ON platform_billing
  FOR EACH ROW EXECUTE FUNCTION update_platform_updated_at();

CREATE TRIGGER update_platform_addons_updated_at BEFORE UPDATE ON platform_addons
  FOR EACH ROW EXECUTE FUNCTION update_platform_updated_at();

CREATE TRIGGER update_platform_email_providers_updated_at BEFORE UPDATE ON platform_email_providers
  FOR EACH ROW EXECUTE FUNCTION update_platform_updated_at();

CREATE TRIGGER update_platform_support_tickets_updated_at BEFORE UPDATE ON platform_support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_platform_updated_at();

CREATE TRIGGER update_platform_feature_flags_updated_at BEFORE UPDATE ON platform_feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_platform_updated_at();

CREATE TRIGGER update_platform_nav_items_updated_at BEFORE UPDATE ON platform_nav_items
  FOR EACH ROW EXECUTE FUNCTION update_platform_updated_at();