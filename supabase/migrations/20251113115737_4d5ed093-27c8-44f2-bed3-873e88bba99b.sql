-- Add RLS policy to allow authenticated tenant users to view active payment providers
-- This enables tenants to see payment methods when paying platform fees

CREATE POLICY "Authenticated users can view active payment providers"
ON platform_payment_providers
FOR SELECT
TO authenticated
USING (is_active = true);