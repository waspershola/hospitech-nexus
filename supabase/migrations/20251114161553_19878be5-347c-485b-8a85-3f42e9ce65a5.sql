-- Drop existing function first
DROP FUNCTION IF EXISTS validate_qr_token(text);

-- Recreate function with correct room column reference
CREATE OR REPLACE FUNCTION validate_qr_token(_token text)
RETURNS TABLE (
  qr_id uuid,
  tenant_id uuid,
  room_id uuid,
  assigned_to text,
  services jsonb,
  display_name text,
  welcome_message text,
  scope text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qc.id AS qr_id,
    qc.tenant_id,
    qc.room_id,
    COALESCE(r.number, qc.assigned_to) AS assigned_to,
    qc.services,
    qc.display_name,
    qc.welcome_message,
    qc.scope
  FROM qr_codes qc
  LEFT JOIN rooms r ON r.id = qc.room_id
  WHERE qc.token = _token 
    AND qc.status = 'active'
    AND (qc.expires_at IS NULL OR qc.expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;