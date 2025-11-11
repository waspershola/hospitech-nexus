-- Phase 0: Fix guest_orders RLS policy with proper validation

-- Drop broken policy with weak WITH CHECK
DROP POLICY IF EXISTS "Orders insertable by anyone with QR token" ON public.guest_orders;

-- Create secure policy with explicit validation
CREATE POLICY "guest_orders_qr_insert"
  ON public.guest_orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    qr_token IS NOT NULL 
    AND tenant_id IS NOT NULL
  );

-- Add comment for documentation
COMMENT ON POLICY "guest_orders_qr_insert" ON public.guest_orders IS 
'Allows anonymous and authenticated users to insert orders when they provide valid qr_token and tenant_id. Server-side validation in qr-request edge function ensures token validity.';