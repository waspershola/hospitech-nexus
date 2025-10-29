-- Phase 1.1: Database Schema Updates for Organization Bookings

-- Create organization_members table to track guest-organization relationships
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, guest_id)
);

-- Enable RLS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization_members
CREATE POLICY "org_members_select"
ON public.organization_members
FOR SELECT
USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "org_members_manage"
ON public.organization_members
FOR ALL
USING (
  tenant_id = get_user_tenant(auth.uid()) 
  AND (
    has_role(auth.uid(), tenant_id, 'owner'::app_role) 
    OR has_role(auth.uid(), tenant_id, 'manager'::app_role)
  )
);

-- Add charged_to_organization flag to payments for tracking
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS charged_to_organization BOOLEAN DEFAULT false;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_guest_id ON public.organization_members(guest_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_tenant_id ON public.organization_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_organization_id ON public.payments(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_organization_id ON public.bookings(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wallets_owner_type ON public.wallets(wallet_type, owner_id);

-- Add comment for documentation
COMMENT ON TABLE public.organization_members IS 'Tracks which guests are members of which organizations for booking validation';