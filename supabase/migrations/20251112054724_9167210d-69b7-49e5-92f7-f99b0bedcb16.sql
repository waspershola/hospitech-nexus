-- Phase 7: Drop overly restrictive check constraint on guest_communications
-- This constraint was blocking staff messages when guest_id is null in requests

-- The constraint required: (guest_id IS NOT NULL) OR (metadata has qr_token)
-- But staff messages for anonymous QR requests have guest_id=null and no qr_token in metadata
-- RLS policies already enforce proper access control, so this constraint is redundant

ALTER TABLE guest_communications 
DROP CONSTRAINT IF EXISTS guest_id_or_qr_token_check;