-- Phase 6: Fix guest_communications RLS policy conflicts
-- Drop the conflicting "Allow anonymous QR guest messages" policy that blocks staff messages

-- This policy was causing 400 errors for staff because:
-- 1. It applies to authenticated role (same as staff policy)
-- 2. PostgreSQL requires ALL policies to pass (AND logic)
-- 3. Staff messages have guest_id populated and no qr_token, failing this policy's conditions
-- 4. Anonymous guest messages are already covered by separate "TO anon" policy

DROP POLICY IF EXISTS "Allow anonymous QR guest messages" ON guest_communications;

-- Remaining policies correctly handle all cases:
-- 1. guest_communications_staff_insert/select/update/delete (TO authenticated) - for staff
-- 2. Guests can send QR request messages (TO anon) - for anonymous QR portal guests
-- 3. Guests can view QR request messages (TO anon) - for anonymous QR portal guests viewing chat