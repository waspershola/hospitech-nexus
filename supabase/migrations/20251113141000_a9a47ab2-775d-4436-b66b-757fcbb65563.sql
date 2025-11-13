-- Allow platform admins to view all tenants for revenue reporting and admin features
CREATE POLICY "Platform admins can view all tenants"
ON tenants
FOR SELECT
TO public
USING (is_platform_admin(auth.uid()));