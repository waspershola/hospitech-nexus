-- Add RLS policies for staff_invitations table to allow tenant users to view their invitations
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "invitations_tenant_select" ON staff_invitations;
DROP POLICY IF EXISTS "invitations_tenant_manage" ON staff_invitations;

-- Policy for all tenant users to view their tenant's invitations
CREATE POLICY "invitations_tenant_select"
ON staff_invitations
FOR SELECT
USING (tenant_id = get_user_tenant(auth.uid()));

-- Policy for managers/owners to manage invitations
CREATE POLICY "invitations_tenant_manage"
ON staff_invitations
FOR ALL
USING (
  tenant_id = get_user_tenant(auth.uid()) AND
  (has_role(auth.uid(), tenant_id, 'owner') OR has_role(auth.uid(), tenant_id, 'manager'))
);