-- Allow tenants to read SMS provider information when they have an assignment
CREATE POLICY "tenants_read_assigned_providers"
ON platform_sms_providers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM tenant_provider_assignments tpa
    WHERE tpa.provider_id = platform_sms_providers.id
    AND tpa.tenant_id = get_user_tenant(auth.uid())
  )
);