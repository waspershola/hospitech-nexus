-- Create SMS usage logs table for tracking all sent messages
CREATE TABLE IF NOT EXISTS public.tenant_sms_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  recipient TEXT NOT NULL,
  message_preview TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  provider TEXT,
  cost NUMERIC NOT NULL DEFAULT 0,
  segments INTEGER NOT NULL DEFAULT 1,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  booking_id UUID,
  guest_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create analytics view for easy querying
CREATE OR REPLACE VIEW public.sms_analytics_summary AS
SELECT 
  tenant_id,
  DATE_TRUNC('day', sent_at) as date,
  event_key,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  SUM(cost) as total_cost,
  SUM(segments) as total_segments,
  ROUND(AVG(EXTRACT(EPOCH FROM (delivered_at - sent_at))), 2) as avg_delivery_time_seconds
FROM public.tenant_sms_usage_logs
GROUP BY tenant_id, DATE_TRUNC('day', sent_at), event_key;

-- Enable RLS
ALTER TABLE public.tenant_sms_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for usage logs
CREATE POLICY "sms_usage_logs_select"
  ON public.tenant_sms_usage_logs
  FOR SELECT
  USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "sms_usage_logs_insert"
  ON public.tenant_sms_usage_logs
  FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

-- Create indexes for better performance
CREATE INDEX idx_sms_usage_tenant_date ON public.tenant_sms_usage_logs(tenant_id, sent_at DESC);
CREATE INDEX idx_sms_usage_event ON public.tenant_sms_usage_logs(tenant_id, event_key);
CREATE INDEX idx_sms_usage_status ON public.tenant_sms_usage_logs(tenant_id, status);