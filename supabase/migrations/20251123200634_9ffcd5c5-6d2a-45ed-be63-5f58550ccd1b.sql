-- PHASE-3-DATABASE-V1: Create request activity log table and transfer columns

-- Create request_activity_log table for comprehensive audit trail
CREATE TABLE IF NOT EXISTS request_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'assigned', 'started_handling', 'payment_collected', 'charged_to_folio',
    'complimentary', 'status_changed', 'completed', 'transferred_to_frontdesk',
    'phone_verified', 'phone_mismatch'
  )),
  amount NUMERIC,
  payment_method TEXT,
  payment_provider_id UUID REFERENCES finance_providers(id),
  payment_location_id UUID REFERENCES finance_locations(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add transfer columns to requests table
ALTER TABLE requests ADD COLUMN IF NOT EXISTS transferred_to_frontdesk BOOLEAN DEFAULT false;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS transferred_by UUID REFERENCES auth.users(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_request_activity_log_request ON request_activity_log(request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_activity_log_tenant ON request_activity_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_transferred ON requests(transferred_to_frontdesk, transferred_at) WHERE transferred_to_frontdesk = true;

-- Enable RLS on request_activity_log
ALTER TABLE request_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for request_activity_log
CREATE POLICY "activity_log_tenant_read" ON request_activity_log
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "activity_log_staff_insert" ON request_activity_log
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

-- Helper RPC for logging request activities
CREATE OR REPLACE FUNCTION log_request_activity(
  p_tenant_id UUID,
  p_request_id UUID,
  p_staff_id UUID,
  p_action_type TEXT,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO request_activity_log (
    tenant_id, request_id, staff_id, action_type, 
    amount, payment_method, payment_provider_id, payment_location_id, metadata
  ) VALUES (
    p_tenant_id, p_request_id, p_staff_id, p_action_type,
    (p_metadata->>'amount')::NUMERIC,
    p_metadata->>'payment_method',
    (p_metadata->>'payment_provider_id')::UUID,
    (p_metadata->>'payment_location_id')::UUID,
    p_metadata
  ) RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;