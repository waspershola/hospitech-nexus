-- Allow anonymous users to read platform fee configurations
-- This is needed for QR code users to see transparent pricing in their cart
-- Actual fee calculation and enforcement happens server-side in edge functions

CREATE POLICY "allow_anonymous_read_platform_fee_config"
ON platform_fee_configurations
FOR SELECT
TO anon
USING (active = true);