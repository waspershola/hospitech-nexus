-- QR-FOLIO-AUDIT-V1: Create audit log table for QR-to-folio matching attempts
-- This enables debugging of 0% folio linkage rate by tracking all matching attempts

CREATE TABLE IF NOT EXISTS public.qr_folio_matching_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE,
  qr_token TEXT NOT NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  guest_contact TEXT,
  matched_folio_id UUID REFERENCES public.stay_folios(id) ON DELETE SET NULL,
  match_method TEXT CHECK (match_method IN ('room', 'phone', 'none')),
  match_success BOOLEAN NOT NULL DEFAULT false,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_qr_folio_log_tenant 
  ON public.qr_folio_matching_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qr_folio_log_request 
  ON public.qr_folio_matching_log(request_id);
CREATE INDEX IF NOT EXISTS idx_qr_folio_log_created_at 
  ON public.qr_folio_matching_log(created_at DESC);

-- RLS policies for tenant isolation
ALTER TABLE public.qr_folio_matching_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for qr_folio_matching_log"
  ON public.qr_folio_matching_log
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.qr_folio_matching_log IS 
  'Audit trail for QR request to folio matching attempts. Tracks success/failure reasons for billing linkage.';