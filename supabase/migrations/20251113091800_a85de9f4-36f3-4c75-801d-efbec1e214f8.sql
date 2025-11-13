-- Create platform fee disputes table
CREATE TABLE IF NOT EXISTS public.platform_fee_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ledger_ids UUID[] NOT NULL,
  dispute_reason TEXT NOT NULL,
  supporting_docs JSONB DEFAULT '[]'::jsonb,
  requested_action TEXT NOT NULL CHECK (requested_action IN ('waive', 'reduce', 'review')),
  requested_amount NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.platform_fee_disputes ENABLE ROW LEVEL SECURITY;

-- Tenants can create and view their own disputes
CREATE POLICY "Tenants can create disputes"
ON public.platform_fee_disputes
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id 
    FROM public.user_roles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Tenants can view own disputes"
ON public.platform_fee_disputes
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id 
    FROM public.user_roles 
    WHERE user_id = auth.uid()
  )
);

-- Platform admins can view and manage all disputes
CREATE POLICY "Platform admins can view all disputes"
ON public.platform_fee_disputes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.platform_users
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'support_admin')
  )
);

CREATE POLICY "Platform admins can update disputes"
ON public.platform_fee_disputes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.platform_users
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'support_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.platform_users
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'support_admin')
  )
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_platform_fee_disputes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER platform_fee_disputes_updated_at
BEFORE UPDATE ON public.platform_fee_disputes
FOR EACH ROW
EXECUTE FUNCTION update_platform_fee_disputes_updated_at();

-- Add indexes
CREATE INDEX idx_platform_fee_disputes_tenant ON public.platform_fee_disputes(tenant_id);
CREATE INDEX idx_platform_fee_disputes_status ON public.platform_fee_disputes(status);
CREATE INDEX idx_platform_fee_disputes_reviewed_by ON public.platform_fee_disputes(reviewed_by);