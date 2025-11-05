-- SMS Notification System - Phase 0: Database Schema

-- =====================================================
-- Table: tenant_sms_settings
-- SMS provider configuration per tenant
-- =====================================================
CREATE TABLE tenant_sms_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'twilio', -- 'twilio' | 'termii' | 'africastalking'
  sender_id TEXT, -- From number/sender ID
  api_key_encrypted TEXT, -- Encrypted API key
  api_secret_encrypted TEXT, -- Encrypted API secret (for Twilio)
  auto_send_booking_confirmation BOOLEAN DEFAULT false,
  auto_send_checkin_reminder BOOLEAN DEFAULT false,
  auto_send_checkout_reminder BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id)
);

-- =====================================================
-- Table: tenant_sms_quota
-- SMS quota tracking per tenant
-- =====================================================
CREATE TABLE tenant_sms_quota (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  quota_total INTEGER NOT NULL DEFAULT 0,
  quota_used INTEGER NOT NULL DEFAULT 0,
  quota_reset_date TIMESTAMPTZ,
  last_purchase_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id)
);

-- =====================================================
-- Table: sms_templates
-- SMS message templates for different events
-- =====================================================
CREATE TABLE sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL, -- 'booking_confirmed' | 'checkin_reminder' | 'checkout_reminder' | 'payment_received' | 'custom'
  template_body TEXT NOT NULL, -- Handlebars template with {{guestName}}, {{roomNumber}}, etc.
  is_active BOOLEAN DEFAULT true,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, event_key, language)
);

-- =====================================================
-- Table: sms_logs
-- Audit trail of all SMS sends
-- =====================================================
CREATE TABLE sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  to_number TEXT NOT NULL,
  message_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'failed' | 'delivered'
  provider TEXT,
  provider_message_id TEXT,
  cost_credits INTEGER DEFAULT 1, -- How many SMS credits used (multi-part = multiple)
  event_key TEXT,
  booking_id UUID REFERENCES bookings(id),
  guest_id UUID REFERENCES guests(id),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- Table: sms_marketplace_items
-- Marketplace items for SMS credits/bundles
-- =====================================================
CREATE TABLE sms_marketplace_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL, -- 'sms_bundle_100' | 'sms_bundle_500' | 'sms_monthly_1000'
  name TEXT NOT NULL,
  description TEXT,
  credits_amount INTEGER NOT NULL, -- How many SMS credits
  price_amount NUMERIC NOT NULL, -- Price in currency units (NGN)
  currency TEXT DEFAULT 'NGN',
  item_type TEXT NOT NULL DEFAULT 'one_time', -- 'one_time' | 'recurring'
  validity_days INTEGER, -- NULL for one-time, 30 for monthly
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- Table: tenant_sms_purchases
-- Purchase records for SMS bundles
-- =====================================================
CREATE TABLE tenant_sms_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  marketplace_item_id UUID REFERENCES sms_marketplace_items(id),
  credits_purchased INTEGER NOT NULL,
  amount_paid NUMERIC NOT NULL,
  currency TEXT DEFAULT 'NGN',
  payment_id UUID REFERENCES payments(id),
  status TEXT DEFAULT 'completed', -- 'pending' | 'completed' | 'failed'
  purchased_by UUID,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- =====================================================
-- RLS Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE tenant_sms_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_sms_quota ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_sms_purchases ENABLE ROW LEVEL SECURITY;

-- tenant_sms_settings: Owners/Managers can manage
CREATE POLICY sms_settings_manage ON tenant_sms_settings
  FOR ALL USING (
    tenant_id = get_user_tenant(auth.uid()) AND (
      has_role(auth.uid(), tenant_id, 'owner'::app_role) OR 
      has_role(auth.uid(), tenant_id, 'manager'::app_role)
    )
  );

-- tenant_sms_quota: Users can view, system can update
CREATE POLICY sms_quota_view ON tenant_sms_quota
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY sms_quota_system_update ON tenant_sms_quota
  FOR ALL USING (true);

-- sms_templates: Owners/Managers can manage
CREATE POLICY sms_templates_manage ON sms_templates
  FOR ALL USING (
    tenant_id = get_user_tenant(auth.uid()) AND (
      has_role(auth.uid(), tenant_id, 'owner'::app_role) OR 
      has_role(auth.uid(), tenant_id, 'manager'::app_role)
    )
  );

-- sms_logs: Finance roles can view
CREATE POLICY sms_logs_view ON sms_logs
  FOR SELECT USING (
    tenant_id = get_user_tenant(auth.uid()) AND (
      has_role(auth.uid(), tenant_id, 'owner'::app_role) OR 
      has_role(auth.uid(), tenant_id, 'manager'::app_role) OR
      has_role(auth.uid(), tenant_id, 'finance'::app_role) OR
      has_role(auth.uid(), tenant_id, 'accountant'::app_role)
    )
  );

CREATE POLICY sms_logs_insert ON sms_logs
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

-- sms_marketplace_items: Public read for active items
CREATE POLICY sms_marketplace_view ON sms_marketplace_items
  FOR SELECT USING (is_active = true);

-- tenant_sms_purchases: Owners/Managers can view their purchases
CREATE POLICY sms_purchases_view ON tenant_sms_purchases
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY sms_purchases_insert ON tenant_sms_purchases
  FOR INSERT WITH CHECK (
    tenant_id = get_user_tenant(auth.uid()) AND (
      has_role(auth.uid(), tenant_id, 'owner'::app_role) OR 
      has_role(auth.uid(), tenant_id, 'manager'::app_role)
    )
  );

-- =====================================================
-- Indexes for performance
-- =====================================================

CREATE INDEX idx_sms_logs_tenant_created ON sms_logs(tenant_id, created_at DESC);
CREATE INDEX idx_sms_logs_status ON sms_logs(status) WHERE status = 'pending';
CREATE INDEX idx_sms_logs_booking ON sms_logs(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX idx_sms_quota_tenant ON tenant_sms_quota(tenant_id);
CREATE INDEX idx_sms_purchases_tenant ON tenant_sms_purchases(tenant_id, purchased_at DESC);
CREATE INDEX idx_sms_templates_tenant_event ON sms_templates(tenant_id, event_key);

-- =====================================================
-- Triggers
-- =====================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_tenant_sms_settings_updated_at
  BEFORE UPDATE ON tenant_sms_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_sms_quota_updated_at
  BEFORE UPDATE ON tenant_sms_quota
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sms_templates_updated_at
  BEFORE UPDATE ON sms_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Seed default marketplace items
-- =====================================================

INSERT INTO sms_marketplace_items (key, name, description, credits_amount, price_amount, currency, item_type, validity_days, is_active)
VALUES
  ('sms_bundle_100', '100 SMS Credits', 'One-time bundle of 100 SMS messages', 100, 5000, 'NGN', 'one_time', NULL, true),
  ('sms_bundle_500', '500 SMS Credits', 'One-time bundle of 500 SMS messages (10% discount)', 500, 22500, 'NGN', 'one_time', NULL, true),
  ('sms_bundle_1000', '1,000 SMS Credits', 'One-time bundle of 1,000 SMS messages (15% discount)', 1000, 42500, 'NGN', 'one_time', NULL, true),
  ('sms_bundle_2500', '2,500 SMS Credits', 'One-time bundle of 2,500 SMS messages (20% discount)', 2500, 100000, 'NGN', 'one_time', NULL, true),
  ('sms_monthly_1000', 'Monthly Plan - 1,000 SMS', 'Recurring monthly plan with 1,000 SMS messages', 1000, 40000, 'NGN', 'recurring', 30, true),
  ('sms_monthly_5000', 'Monthly Plan - 5,000 SMS', 'Recurring monthly plan with 5,000 SMS messages (12% discount)', 5000, 176000, 'NGN', 'recurring', 30, true);

-- =====================================================
-- Seed default SMS templates
-- These will be copied to new tenants as defaults
-- =====================================================

COMMENT ON TABLE sms_templates IS 'Default templates per tenant. System can seed these on tenant creation with event_key patterns.';

-- Add helpful comments
COMMENT ON COLUMN tenant_sms_settings.api_key_encrypted IS 'Should be encrypted using Supabase Vault in production';
COMMENT ON COLUMN tenant_sms_settings.api_secret_encrypted IS 'Should be encrypted using Supabase Vault in production';
COMMENT ON COLUMN sms_logs.cost_credits IS 'Number of SMS credits consumed (multi-part messages count as multiple)';
COMMENT ON COLUMN sms_marketplace_items.validity_days IS 'NULL for one-time bundles, 30 for monthly recurring';
COMMENT ON COLUMN tenant_sms_quota.quota_reset_date IS 'Date when quota resets for recurring plans';