-- Fix staff_invitations RLS policies
-- Remove the problematic policy that queries auth.users
DROP POLICY IF EXISTS "invitations_view_own" ON public.staff_invitations;

-- Remove duplicate policies (keep only the necessary ones)
DROP POLICY IF EXISTS "invitations_manage" ON public.staff_invitations;

-- The remaining policies should be sufficient:
-- 1. invitations_tenant_select - allows SELECT for users in the tenant
-- 2. invitations_tenant_manage - allows ALL operations for owners/managers in the tenant