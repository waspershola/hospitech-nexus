-- ============================================
-- Phase 1: QR Portal Database Foundation (Fixed)
-- ============================================

-- ============================================
-- Step 1: Extend guest_communications Table (Add metadata column)
-- ============================================

ALTER TABLE public.guest_communications
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_guest_communications_metadata_request_id 
  ON public.guest_communications((metadata->>'request_id'));

-- ============================================
-- Step 2: Create qr_codes Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  
  -- Scope and assignment
  scope TEXT NOT NULL CHECK (scope IN ('room', 'location', 'table', 'facility')),
  assigned_to TEXT NOT NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  
  -- Configuration
  services JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  
  -- Branding/theming
  display_name TEXT,
  welcome_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT unique_room_qr UNIQUE (tenant_id, room_id)
);

-- Indexes for performance
CREATE INDEX idx_qr_codes_tenant ON public.qr_codes(tenant_id);
CREATE INDEX idx_qr_codes_token ON public.qr_codes(token);
CREATE INDEX idx_qr_codes_room ON public.qr_codes(room_id) WHERE room_id IS NOT NULL;
CREATE INDEX idx_qr_codes_status ON public.qr_codes(status) WHERE status = 'active';

-- Updated timestamp trigger
CREATE TRIGGER update_qr_codes_updated_at
  BEFORE UPDATE ON public.qr_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Step 3: Extend requests Table
-- ============================================

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS qr_token TEXT,
  ADD COLUMN IF NOT EXISTS service_category TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add constraint for priority
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'requests_priority_check'
  ) THEN
    ALTER TABLE public.requests 
    ADD CONSTRAINT requests_priority_check 
    CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;
END $$;

-- Add foreign key to qr_codes (after qr_codes table is created)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_requests_qr_token'
  ) THEN
    ALTER TABLE public.requests
    ADD CONSTRAINT fk_requests_qr_token 
    FOREIGN KEY (qr_token) 
    REFERENCES public.qr_codes(token) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes for filtering and performance
CREATE INDEX IF NOT EXISTS idx_requests_qr_token ON public.requests(qr_token);
CREATE INDEX IF NOT EXISTS idx_requests_service_category ON public.requests(service_category);
CREATE INDEX IF NOT EXISTS idx_requests_priority ON public.requests(priority);
CREATE INDEX IF NOT EXISTS idx_requests_assigned_to ON public.requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_requests_status_active ON public.requests(status) WHERE status = 'pending';

-- ============================================
-- Step 4: RLS Policies for qr_codes
-- ============================================

ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

-- Tenant isolation (authenticated users)
CREATE POLICY "Users can view their tenant QR codes"
  ON public.qr_codes FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant(auth.uid()));

-- Managers can manage QR codes
CREATE POLICY "Managers can manage QR codes"
  ON public.qr_codes FOR ALL
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant(auth.uid()) AND
    (public.has_role(auth.uid(), tenant_id, 'owner'::app_role) OR 
     public.has_role(auth.uid(), tenant_id, 'manager'::app_role))
  );

-- Public (anonymous) can validate active QR tokens
CREATE POLICY "Public can validate active QR tokens"
  ON public.qr_codes FOR SELECT
  TO anon
  USING (status = 'active');

-- ============================================
-- Step 5: RLS Policies for requests (QR access)
-- ============================================

-- Allow anonymous guests to view their QR requests
CREATE POLICY "Guests can view their QR requests"
  ON public.requests FOR SELECT
  TO anon
  USING (qr_token IS NOT NULL);

-- Allow anonymous guests to create requests via QR
CREATE POLICY "Guests can create QR requests"
  ON public.requests FOR INSERT
  TO anon
  WITH CHECK (qr_token IS NOT NULL);

-- ============================================
-- Step 6: RLS Policies for guest_communications (QR chat)
-- ============================================

-- Allow anonymous access to messages linked to QR requests
CREATE POLICY "Guests can view QR request messages"
  ON public.guest_communications FOR SELECT
  TO anon
  USING (metadata->>'request_id' IS NOT NULL);

-- Allow anonymous guests to send messages on QR requests
CREATE POLICY "Guests can send QR request messages"
  ON public.guest_communications FOR INSERT
  TO anon
  WITH CHECK (
    metadata->>'request_id' IS NOT NULL AND
    metadata->>'qr_token' IS NOT NULL
  );

-- ============================================
-- Step 7: Database Functions
-- ============================================

-- QR Token Validation Function
CREATE OR REPLACE FUNCTION public.validate_qr_token(_token TEXT)
RETURNS TABLE(
  qr_id UUID,
  tenant_id UUID,
  room_id UUID,
  assigned_to TEXT,
  services JSONB,
  display_name TEXT,
  welcome_message TEXT,
  scope TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qc.id,
    qc.tenant_id,
    qc.room_id,
    qc.assigned_to,
    qc.services,
    qc.display_name,
    qc.welcome_message,
    qc.scope
  FROM qr_codes qc
  WHERE qc.token = _token
    AND qc.status = 'active'
    AND (qc.expires_at IS NULL OR qc.expires_at > now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_qr_token(TEXT) TO anon, authenticated;

-- Get Request Chat Messages Function
CREATE OR REPLACE FUNCTION public.get_request_messages(
  _request_id UUID,
  _qr_token TEXT
)
RETURNS TABLE(
  id UUID,
  message TEXT,
  direction TEXT,
  sent_by UUID,
  sender_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _valid_token BOOLEAN;
BEGIN
  -- Validate QR token matches the request
  SELECT EXISTS (
    SELECT 1 FROM requests r
    WHERE r.id = _request_id AND r.qr_token = _qr_token
  ) INTO _valid_token;
  
  IF NOT _valid_token THEN
    RAISE EXCEPTION 'Invalid QR token for this request';
  END IF;
  
  RETURN QUERY
  SELECT 
    gc.id,
    gc.message,
    gc.direction,
    gc.sent_by,
    COALESCE(p.full_name, 'Guest') as sender_name,
    gc.created_at
  FROM guest_communications gc
  LEFT JOIN profiles p ON gc.sent_by = p.id
  WHERE gc.metadata->>'request_id' = _request_id::text
  ORDER BY gc.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_request_messages(UUID, TEXT) TO anon, authenticated;

-- ============================================
-- Step 8: Seed Test Data (Optional)
-- ============================================

-- Insert test QR codes for existing tenants with rooms
INSERT INTO public.qr_codes (tenant_id, scope, assigned_to, room_id, services, display_name, welcome_message)
SELECT 
  t.id as tenant_id,
  'room' as scope,
  'Room ' || r.number as assigned_to,
  r.id as room_id,
  '["housekeeping", "room_service", "maintenance", "concierge"]'::jsonb as services,
  'Room ' || r.number as display_name,
  'Welcome! Scan to request services or contact our team.' as welcome_message
FROM tenants t
CROSS JOIN LATERAL (
  SELECT id, number 
  FROM rooms 
  WHERE tenant_id = t.id 
  ORDER BY number
  LIMIT 1
) r
ON CONFLICT (tenant_id, room_id) DO NOTHING;