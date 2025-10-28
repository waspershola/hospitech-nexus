-- Phase 1: Database Schema Extension for Luxury Configuration Center
-- Create all configuration tables with tenant-scoped RLS policies

-- ============================================================================
-- Table 1: hotel_configurations (Key-Value Store)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.hotel_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, key)
);

CREATE INDEX idx_hotel_configurations_tenant ON public.hotel_configurations(tenant_id);
CREATE INDEX idx_hotel_configurations_key ON public.hotel_configurations(key);

ALTER TABLE public.hotel_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant config"
ON public.hotel_configurations FOR SELECT
USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Owners/Managers can manage config"
ON public.hotel_configurations FOR ALL
USING (
  tenant_id = get_user_tenant(auth.uid()) 
  AND (
    has_role(auth.uid(), tenant_id, 'owner') 
    OR has_role(auth.uid(), tenant_id, 'manager')
  )
);

-- ============================================================================
-- Table 2: hotel_branding (Visual Identity)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.hotel_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  primary_color text DEFAULT 'hsl(0 65% 51%)',
  secondary_color text DEFAULT 'hsl(51 100% 50%)',
  accent_color text DEFAULT 'hsl(51 85% 65%)',
  font_heading text DEFAULT 'Playfair Display',
  font_body text DEFAULT 'Inter',
  logo_url text,
  receipt_header text,
  receipt_footer text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hotel_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant branding"
ON public.hotel_branding FOR SELECT
USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Owners/Managers can manage branding"
ON public.hotel_branding FOR ALL
USING (
  tenant_id = get_user_tenant(auth.uid()) 
  AND (
    has_role(auth.uid(), tenant_id, 'owner') 
    OR has_role(auth.uid(), tenant_id, 'manager')
  )
);

-- ============================================================================
-- Table 3: hotel_financials (Fiscal Controls)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.hotel_financials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  currency text NOT NULL DEFAULT 'NGN',
  currency_symbol text NOT NULL DEFAULT '₦',
  symbol_position text NOT NULL DEFAULT 'before',
  decimal_separator text NOT NULL DEFAULT '.',
  thousand_separator text NOT NULL DEFAULT ',',
  decimal_places integer NOT NULL DEFAULT 2,
  vat_rate numeric(5,2) NOT NULL DEFAULT 0,
  vat_inclusive boolean NOT NULL DEFAULT false,
  service_charge numeric(5,2) NOT NULL DEFAULT 0,
  service_charge_inclusive boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hotel_financials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant financials"
ON public.hotel_financials FOR SELECT
USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Owners/Managers can manage financials"
ON public.hotel_financials FOR ALL
USING (
  tenant_id = get_user_tenant(auth.uid()) 
  AND (
    has_role(auth.uid(), tenant_id, 'owner') 
    OR has_role(auth.uid(), tenant_id, 'manager')
  )
);

-- ============================================================================
-- Table 4: hotel_audit_logs (Change Tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.hotel_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  before_data jsonb,
  after_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hotel_audit_logs_tenant ON public.hotel_audit_logs(tenant_id);
CREATE INDEX idx_hotel_audit_logs_created ON public.hotel_audit_logs(created_at DESC);
CREATE INDEX idx_hotel_audit_logs_user ON public.hotel_audit_logs(user_id);

ALTER TABLE public.hotel_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant audit logs"
ON public.hotel_audit_logs FOR SELECT
USING (
  tenant_id = get_user_tenant(auth.uid())
  AND (
    has_role(auth.uid(), tenant_id, 'owner') 
    OR has_role(auth.uid(), tenant_id, 'manager')
  )
);

CREATE POLICY "System can insert audit logs"
ON public.hotel_audit_logs FOR INSERT
WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

-- ============================================================================
-- Table 5: email_settings (Communication)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  smtp_enabled boolean NOT NULL DEFAULT false,
  smtp_host text,
  smtp_port integer,
  smtp_user text,
  smtp_password text,
  from_name text NOT NULL DEFAULT 'Hotel',
  from_email text NOT NULL DEFAULT 'noreply@hotel.com',
  reply_to text,
  email_branding_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant email settings"
ON public.email_settings FOR SELECT
USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Owners/Managers can manage email settings"
ON public.email_settings FOR ALL
USING (
  tenant_id = get_user_tenant(auth.uid()) 
  AND (
    has_role(auth.uid(), tenant_id, 'owner') 
    OR has_role(auth.uid(), tenant_id, 'manager')
  )
);

-- ============================================================================
-- Table 6: document_templates (Receipts & Invoices)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_type text NOT NULL,
  prefix text NOT NULL DEFAULT '',
  next_number integer NOT NULL DEFAULT 1,
  number_length integer NOT NULL DEFAULT 6,
  format text NOT NULL DEFAULT 'A4',
  include_qr boolean NOT NULL DEFAULT true,
  include_signature boolean NOT NULL DEFAULT false,
  template_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, template_type)
);

CREATE INDEX idx_document_templates_tenant ON public.document_templates(tenant_id);

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant templates"
ON public.document_templates FOR SELECT
USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Owners/Managers can manage templates"
ON public.document_templates FOR ALL
USING (
  tenant_id = get_user_tenant(auth.uid()) 
  AND (
    has_role(auth.uid(), tenant_id, 'owner') 
    OR has_role(auth.uid(), tenant_id, 'manager')
  )
);

-- ============================================================================
-- Helper Function: Audit Logging Trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION public.log_config_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.hotel_audit_logs (
    tenant_id,
    user_id,
    action,
    table_name,
    record_id,
    before_data,
    after_data
  )
  VALUES (
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- Attach Audit Triggers to Configuration Tables
-- ============================================================================
CREATE TRIGGER audit_hotel_configurations
AFTER INSERT OR UPDATE OR DELETE ON public.hotel_configurations
FOR EACH ROW EXECUTE FUNCTION public.log_config_change();

CREATE TRIGGER audit_hotel_branding
AFTER INSERT OR UPDATE OR DELETE ON public.hotel_branding
FOR EACH ROW EXECUTE FUNCTION public.log_config_change();

CREATE TRIGGER audit_hotel_financials
AFTER INSERT OR UPDATE OR DELETE ON public.hotel_financials
FOR EACH ROW EXECUTE FUNCTION public.log_config_change();

CREATE TRIGGER audit_email_settings
AFTER INSERT OR UPDATE OR DELETE ON public.email_settings
FOR EACH ROW EXECUTE FUNCTION public.log_config_change();

CREATE TRIGGER audit_document_templates
AFTER INSERT OR UPDATE OR DELETE ON public.document_templates
FOR EACH ROW EXECUTE FUNCTION public.log_config_change();

-- ============================================================================
-- Update Timestamp Triggers
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_hotel_configurations_updated_at
BEFORE UPDATE ON public.hotel_configurations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hotel_branding_updated_at
BEFORE UPDATE ON public.hotel_branding
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hotel_financials_updated_at
BEFORE UPDATE ON public.hotel_financials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_settings_updated_at
BEFORE UPDATE ON public.email_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_templates_updated_at
BEFORE UPDATE ON public.document_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();