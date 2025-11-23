-- Add validate_billing_reference RPC function
-- Phase 2: QR Billing Reference Integration

CREATE OR REPLACE FUNCTION validate_billing_reference(
  p_tenant_id UUID,
  p_reference_code TEXT
)
RETURNS TABLE (
  valid BOOLEAN,
  request_id UUID,
  request_type TEXT,
  department TEXT,
  guest_name TEXT,
  room_number TEXT,
  total_amount NUMERIC,
  description TEXT,
  error_message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if reference exists and is pending
  RETURN QUERY
  SELECT 
    TRUE as valid,
    r.id as request_id,
    r.type as request_type,
    r.assigned_department as department,
    COALESCE(r.metadata->>'guest_name', g.name) as guest_name,
    rm.number as room_number,
    COALESCE(
      (r.metadata->'payment_info'->>'total_amount')::numeric / 100,
      (r.metadata->'payment_info'->>'subtotal')::numeric / 100,
      0
    ) as total_amount,
    CONCAT(
      INITCAP(REPLACE(r.type, '_', ' ')),
      CASE 
        WHEN COALESCE(r.metadata->>'guest_name', g.name) IS NOT NULL 
        THEN ' - ' || COALESCE(r.metadata->>'guest_name', g.name)
        ELSE ''
      END
    ) as description,
    NULL::TEXT as error_message
  FROM requests r
  LEFT JOIN rooms rm ON r.room_id = rm.id
  LEFT JOIN guests g ON r.guest_id = g.id
  WHERE r.tenant_id = p_tenant_id
    AND r.billing_reference_code = p_reference_code
    AND r.billing_status = 'pending_frontdesk'
    AND r.billing_routed_to = 'frontdesk'
  LIMIT 1;

  -- If no valid reference found, return error
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      FALSE as valid,
      NULL::UUID as request_id,
      NULL::TEXT as request_type,
      NULL::TEXT as department,
      NULL::TEXT as guest_name,
      NULL::TEXT as room_number,
      NULL::NUMERIC as total_amount,
      NULL::TEXT as description,
      'Invalid or already processed billing reference'::TEXT as error_message;
  END IF;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION validate_billing_reference(UUID, TEXT) TO authenticated;