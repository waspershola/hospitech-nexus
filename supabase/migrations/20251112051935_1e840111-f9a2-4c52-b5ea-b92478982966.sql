-- Phase 4: Fix chat message retrieval and remaining issues

-- 1. Create get_request_messages function if not exists
CREATE OR REPLACE FUNCTION get_request_messages(
  _request_id UUID,
  _qr_token TEXT
)
RETURNS TABLE (
  id UUID,
  message TEXT,
  direction TEXT,
  sent_by UUID,
  sender_name TEXT,
  created_at TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify request exists and token matches
  IF NOT EXISTS (
    SELECT 1 FROM requests 
    WHERE requests.id = _request_id 
    AND requests.qr_token = _qr_token
  ) THEN
    RAISE EXCEPTION 'Invalid request or QR token';
  END IF;

  -- Return messages for this request
  RETURN QUERY
  SELECT 
    gc.id,
    gc.message,
    gc.direction,
    gc.sent_by,
    COALESCE(
      gc.metadata->>'guest_name',
      CASE 
        WHEN gc.direction = 'inbound' THEN 'Guest'
        ELSE 'Staff'
      END
    )::TEXT as sender_name,
    gc.created_at
  FROM guest_communications gc
  WHERE gc.metadata->>'request_id' = _request_id::TEXT
  ORDER BY gc.created_at ASC;
END;
$$;

-- 2. Add SELECT policy for anonymous guests on guest_orders
DROP POLICY IF EXISTS "guest_orders_qr_select" ON guest_orders;
CREATE POLICY "guest_orders_qr_select"
  ON guest_orders
  FOR SELECT
  TO anon, authenticated
  USING (qr_token IS NOT NULL);

-- 3. Ensure requests table has UPDATE policy for staff
DROP POLICY IF EXISTS "requests_staff_update" ON requests;
CREATE POLICY "requests_staff_update"
  ON requests
  FOR UPDATE
  TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant(auth.uid()));