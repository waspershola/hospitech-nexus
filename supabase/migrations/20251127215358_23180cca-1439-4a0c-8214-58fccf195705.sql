-- GUEST-SESSION-SECURITY: Add per-device session isolation columns
-- This prevents data leakage between devices scanning the same QR code

-- Add guest_session_token to requests table
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS guest_session_token TEXT;

-- Add index for performance on guest session filtering
CREATE INDEX IF NOT EXISTS idx_requests_guest_session_token
ON public.requests (guest_session_token);

-- Add guest_session_token to guest_communications table  
ALTER TABLE public.guest_communications
ADD COLUMN IF NOT EXISTS guest_session_token TEXT;

-- Add index for performance on guest communication filtering
CREATE INDEX IF NOT EXISTS idx_guest_comms_guest_session_token
ON public.guest_communications (guest_session_token);

-- Backward compatibility: Columns are nullable
-- Old rows stay NULL and remain visible to staff
-- New rows MUST include guest_session_token from frontend