-- Replace generate_approval_token to avoid gen_random_bytes dependency
CREATE OR REPLACE FUNCTION public.generate_approval_token(
  p_approver_id uuid,
  p_tenant_id uuid,
  p_action_type text,
  p_action_reference uuid DEFAULT NULL::uuid,
  p_amount numeric DEFAULT NULL::numeric
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_token TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Generate a 32-char hex token using md5 and high-entropy inputs
  v_token := md5(
    random()::text ||
    clock_timestamp()::text ||
    COALESCE(p_approver_id::text, '') ||
    COALESCE(p_tenant_id::text, '') ||
    COALESCE(p_action_type, '') ||
    COALESCE(p_action_reference::text, '') ||
    COALESCE(p_amount::text, '')
  );

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
$function$;