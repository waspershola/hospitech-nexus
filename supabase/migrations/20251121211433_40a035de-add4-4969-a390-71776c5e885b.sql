-- Migration: Manager PIN Approval System Foundation
-- Version: PIN-FOUNDATION-V1
-- Purpose: Add PIN storage to staff table, create approval_logs audit table, and token generation functions

-- ============================================================================
-- PART 1: Add Manager PIN columns to staff table
-- ============================================================================

ALTER TABLE public.staff 
ADD COLUMN IF NOT EXISTS manager_pin_hash TEXT,
ADD COLUMN IF NOT EXISTS pin_set_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pin_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pin_last_changed TIMESTAMPTZ;

COMMENT ON COLUMN staff.manager_pin_hash IS 'BCrypt hash of 6-digit manager PIN for approval workflows';
COMMENT ON COLUMN staff.pin_set_at IS 'Timestamp when PIN was first set';
COMMENT ON COLUMN staff.pin_attempts IS 'Failed PIN attempts counter (resets on success or after 15min lockout)';
COMMENT ON COLUMN staff.pin_locked_until IS 'Account locked until this timestamp after 3 failed attempts (15 minutes)';
COMMENT ON COLUMN staff.pin_last_changed IS 'Timestamp of last PIN change for security audit';

-- ============================================================================
-- PART 2: Create approval_logs table for audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.approval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_reference UUID,
  amount NUMERIC,
  reason TEXT NOT NULL,
  pin_valid BOOLEAN NOT NULL,
  pin_attempts INT DEFAULT 1,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_approval_logs_tenant ON approval_logs(tenant_id);
CREATE INDEX idx_approval_logs_approver ON approval_logs(approver_id);
CREATE INDEX idx_approval_logs_created_at ON approval_logs(created_at DESC);
CREATE INDEX idx_approval_logs_action_type ON approval_logs(action_type);
CREATE INDEX idx_approval_logs_action_reference ON approval_logs(action_reference) WHERE action_reference IS NOT NULL;

COMMENT ON TABLE approval_logs IS 'Audit trail for all manager PIN approval events';
COMMENT ON COLUMN approval_logs.action_type IS 'Type of action requiring approval (overpayment, rebate, force_cancel, etc.)';
COMMENT ON COLUMN approval_logs.action_reference IS 'UUID reference to the entity being approved (booking, payment, folio, etc.)';
COMMENT ON COLUMN approval_logs.pin_valid IS 'Whether the PIN entered was correct';
COMMENT ON COLUMN approval_logs.pin_attempts IS 'Number of attempts made before success/lockout';

ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY approval_logs_tenant_read ON approval_logs
  FOR SELECT
  USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY approval_logs_service_insert ON approval_logs
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- PART 3: Create approval token generation and validation functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_approval_token(
  p_approver_id UUID,
  p_tenant_id UUID,
  p_action_type TEXT,
  p_action_reference UUID DEFAULT NULL,
  p_amount NUMERIC DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  v_token := encode(gen_random_bytes(32), 'base64');
  v_expires_at := NOW() + INTERVAL '10 minutes';
  
  UPDATE staff 
  SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{approval_token}',
    jsonb_build_object(
      'token', v_token,
      'expires_at', v_expires_at::TEXT,
      'action_type', p_action_type,
      'action_reference', p_action_reference,
      'amount', p_amount,
      'generated_at', NOW()::TEXT
    )
  )
  WHERE id = p_approver_id 
    AND tenant_id = p_tenant_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to generate approval token: staff member not found';
  END IF;
  
  RETURN v_token;
END;
$$;

COMMENT ON FUNCTION generate_approval_token IS 'Generates a short-lived (10min) approval token after successful PIN validation';

CREATE OR REPLACE FUNCTION public.validate_approval_token(
  p_token TEXT,
  p_approver_id UUID,
  p_tenant_id UUID,
  p_action_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_token JSONB;
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT metadata->'approval_token' INTO v_stored_token
  FROM staff
  WHERE id = p_approver_id 
    AND tenant_id = p_tenant_id;
  
  IF v_stored_token IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF v_stored_token->>'token' != p_token THEN
    RETURN FALSE;
  END IF;
  
  IF v_stored_token->>'action_type' != p_action_type THEN
    RETURN FALSE;
  END IF;
  
  v_expires_at := (v_stored_token->>'expires_at')::TIMESTAMPTZ;
  IF v_expires_at < NOW() THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION validate_approval_token IS 'Validates an approval token is recent, matches action type, and not expired';

CREATE OR REPLACE FUNCTION public.clear_approval_token(
  p_approver_id UUID,
  p_tenant_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE staff 
  SET metadata = metadata - 'approval_token'
  WHERE id = p_approver_id 
    AND tenant_id = p_tenant_id;
END;
$$;

COMMENT ON FUNCTION clear_approval_token IS 'Clears approval token after use to prevent replay attacks';