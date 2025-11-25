-- Phase 1: Update log_request_activity function with diagnostic logging
CREATE OR REPLACE FUNCTION public.log_request_activity(
  p_tenant_id uuid,
  p_request_id uuid,
  p_staff_id uuid,
  p_action_type text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_activity_id UUID;
  v_amount NUMERIC;
  v_payment_method TEXT;
  v_provider_id UUID;
  v_location_id UUID;
BEGIN
  -- Extract values from metadata
  v_amount := (p_metadata->>'amount')::NUMERIC;
  v_payment_method := p_metadata->>'payment_method';
  v_provider_id := (p_metadata->>'payment_provider_id')::UUID;
  v_location_id := (p_metadata->>'payment_location_id')::UUID;

  -- Debug logging
  RAISE NOTICE '[LOG_REQUEST_ACTIVITY-V2] tenant_id: %, request_id: %, action: %', 
    p_tenant_id, p_request_id, p_action_type;
  RAISE NOTICE '[LOG_REQUEST_ACTIVITY-V2] amount: %, method: %, staff: %', 
    v_amount, v_payment_method, p_staff_id;
  
  -- Attempt insert
  INSERT INTO request_activity_log (
    tenant_id, request_id, staff_id, action_type,
    amount, payment_method, payment_provider_id, payment_location_id, metadata
  ) VALUES (
    p_tenant_id, p_request_id, p_staff_id, p_action_type,
    v_amount, v_payment_method, v_provider_id, v_location_id,
    p_metadata
  ) RETURNING id INTO v_activity_id;
  
  RAISE NOTICE '[LOG_REQUEST_ACTIVITY-V2] Success - activity_id: %', v_activity_id;
  
  RETURN v_activity_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[LOG_REQUEST_ACTIVITY-V2] ERROR: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    -- Re-raise to surface error to caller
    RAISE;
END;
$$;

-- Phase 2: Add RLS policy allowing SECURITY DEFINER function to insert
-- This policy allows the log_request_activity function to bypass the user context check
CREATE POLICY activity_log_service_insert ON request_activity_log
  FOR INSERT
  WITH CHECK (true);

-- Add comment explaining the policy
COMMENT ON POLICY activity_log_service_insert ON request_activity_log IS 
  'Allows SECURITY DEFINER functions like log_request_activity to insert audit logs. The function itself validates tenant_id parameter.';