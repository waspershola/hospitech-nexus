-- PHASE-3: SLA Tracking & Overdue Alerts
-- Add responded_at timestamp to track when staff first responds to requests

-- Add responded_at column to requests table
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- Add index for efficient overdue queries
CREATE INDEX IF NOT EXISTS idx_requests_overdue 
ON public.requests(tenant_id, status, created_at) 
WHERE status IN ('pending', 'in_progress');

-- Add SLA configuration to hotel_configurations
-- Insert default 15-minute SLA for all tenants that don't have it
INSERT INTO hotel_configurations (tenant_id, key, value)
SELECT t.id, 'request_sla_minutes', '15'::jsonb
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM hotel_configurations hc 
  WHERE hc.tenant_id = t.id AND hc.key = 'request_sla_minutes'
);

-- Add comment for documentation
COMMENT ON COLUMN public.requests.responded_at IS 'PHASE-3: Timestamp when staff first changed status from pending (for SLA tracking)';
