-- Phase 1: Make guest_communications.guest_id nullable for anonymous QR portal guests
ALTER TABLE guest_communications 
ALTER COLUMN guest_id DROP NOT NULL;

-- Add check constraint to ensure either guest_id or qr_token in metadata
ALTER TABLE guest_communications
ADD CONSTRAINT guest_id_or_qr_token_check
CHECK (
  guest_id IS NOT NULL OR 
  (metadata->>'qr_token' IS NOT NULL)
);

-- Update RLS policy to allow anonymous inserts with qr_token
CREATE POLICY "Allow anonymous QR guest messages"
ON guest_communications
FOR INSERT
TO authenticated, anon
WITH CHECK (
  (guest_id IS NULL AND metadata->>'qr_token' IS NOT NULL) OR
  (tenant_id = get_user_tenant(auth.uid()))
);

COMMENT ON COLUMN guest_communications.guest_id IS 
  'Guest ID - nullable for anonymous QR portal users. Use metadata.qr_token for anonymous guests.';