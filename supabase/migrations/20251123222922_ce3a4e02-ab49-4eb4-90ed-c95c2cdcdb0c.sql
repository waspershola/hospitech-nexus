/*
  # Fix Billing Reference Amount Calculation
  
  Root Cause: validate_billing_reference divides by 100 assuming kobo storage,
  but requests.metadata.payment_info stores amounts in Naira already.
  
  Fix: Remove / 100 division from total_amount calculation
  
  Example: QR-84550D with subtotal=5000 should return ₦5000, not ₦50
*/

-- Drop incorrect version
DROP FUNCTION IF EXISTS validate_billing_reference(UUID, TEXT);

-- Recreate with correct amount calculation (no division)
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
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE as valid,
    r.id as request_id,
    r.type as request_type,
    r.assigned_department as department,
    COALESCE(r.metadata->>'guest_name', g.name) as guest_name,
    rm.number as room_number,
    -- FIX: No division - amounts already stored in Naira, not kobo
    COALESCE(
      (r.metadata->'payment_info'->>'total_amount')::numeric,
      (r.metadata->'payment_info'->>'subtotal')::numeric,
      0
    ) as total_amount,
    CONCAT(
      INITCAP(REPLACE(r.type, '_', ' ')),
      ' - ',
      COALESCE(r.metadata->>'guest_name', g.name)
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

  -- Return error if no matching request found
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

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION validate_billing_reference(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION validate_billing_reference IS 'Validates billing reference code and returns request details with correct Naira amounts (no kobo conversion)';