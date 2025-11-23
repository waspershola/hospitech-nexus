-- Add billing tracking columns to requests table for QR Billing Tasks system
-- This enables separation of service requests from billing tasks routed to Front Desk

-- Add billing metadata columns
ALTER TABLE public.requests
ADD COLUMN IF NOT EXISTS billing_reference_code TEXT,
ADD COLUMN IF NOT EXISTS billing_routed_to TEXT CHECK (billing_routed_to IN ('none', 'frontdesk', 'self_collected')),
ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'none' CHECK (billing_status IN ('none', 'pending_frontdesk', 'posted_to_folio', 'paid_direct', 'cancelled')),
ADD COLUMN IF NOT EXISTS billing_processed_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS billing_processed_at TIMESTAMPTZ;

-- Create index for efficient Front Desk queue filtering (pending billing tasks)
CREATE INDEX IF NOT EXISTS idx_requests_billing_status 
ON public.requests(tenant_id, billing_status) 
WHERE billing_status = 'pending_frontdesk';

-- Create index for billing reference lookups (Front Desk validation)
CREATE INDEX IF NOT EXISTS idx_requests_billing_reference 
ON public.requests(tenant_id, billing_reference_code) 
WHERE billing_reference_code IS NOT NULL;

-- Create compound index for billing task queries (Front Desk batch)
CREATE INDEX IF NOT EXISTS idx_requests_billing_routing
ON public.requests(tenant_id, billing_routed_to, billing_status)
WHERE billing_routed_to = 'frontdesk';

-- Add column comments for documentation
COMMENT ON COLUMN public.requests.billing_reference_code IS 'Short reference code (e.g., QR-8F2C45) for Front Desk billing lookup and audit trail';
COMMENT ON COLUMN public.requests.billing_routed_to IS 'Billing routing: none (no billing), frontdesk (escalated to Front Desk), self_collected (department handled directly)';
COMMENT ON COLUMN public.requests.billing_status IS 'Billing lifecycle: none → pending_frontdesk → posted_to_folio/paid_direct/cancelled';
COMMENT ON COLUMN public.requests.billing_processed_by IS 'Staff member who completed the billing action (charge to folio or direct payment collection)';
COMMENT ON COLUMN public.requests.billing_processed_at IS 'Timestamp when billing was completed (folio charge posted or payment collected)';

-- Raise notice for successful migration
DO $$
BEGIN
  RAISE NOTICE 'Successfully added billing tracking columns to requests table';
  RAISE NOTICE 'Indices created: idx_requests_billing_status, idx_requests_billing_reference, idx_requests_billing_routing';
END $$;