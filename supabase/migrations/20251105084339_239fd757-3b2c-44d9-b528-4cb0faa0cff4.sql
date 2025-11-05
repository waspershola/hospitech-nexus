-- Create SMS alert settings table
CREATE TABLE IF NOT EXISTS public.tenant_sms_alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  alert_enabled BOOLEAN NOT NULL DEFAULT true,
  alert_threshold_percent INTEGER NOT NULL DEFAULT 20,
  alert_threshold_absolute INTEGER,
  notify_email BOOLEAN NOT NULL DEFAULT true,
  notify_sms BOOLEAN NOT NULL DEFAULT false,
  alert_recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_alert_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_threshold_percent CHECK (alert_threshold_percent > 0 AND alert_threshold_percent <= 100)
);

-- Create SMS alert logs table
CREATE TABLE IF NOT EXISTS public.tenant_sms_alert_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  quota_remaining INTEGER NOT NULL,
  quota_total INTEGER NOT NULL,
  message TEXT,
  recipients JSONB,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_sms_alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_sms_alert_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for alert settings
CREATE POLICY "sms_alert_settings_select"
  ON public.tenant_sms_alert_settings
  FOR SELECT
  USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "sms_alert_settings_manage"
  ON public.tenant_sms_alert_settings
  FOR ALL
  USING (
    tenant_id = get_user_tenant(auth.uid()) 
    AND (has_role(auth.uid(), tenant_id, 'owner') OR has_role(auth.uid(), tenant_id, 'manager'))
  );

-- RLS policies for alert logs
CREATE POLICY "sms_alert_logs_select"
  ON public.tenant_sms_alert_logs
  FOR SELECT
  USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "sms_alert_logs_insert"
  ON public.tenant_sms_alert_logs
  FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

-- Add update trigger for alert settings
CREATE TRIGGER update_sms_alert_settings_updated_at
  BEFORE UPDATE ON public.tenant_sms_alert_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_sms_alert_settings_tenant ON public.tenant_sms_alert_settings(tenant_id);
CREATE INDEX idx_sms_alert_logs_tenant ON public.tenant_sms_alert_logs(tenant_id, sent_at DESC);