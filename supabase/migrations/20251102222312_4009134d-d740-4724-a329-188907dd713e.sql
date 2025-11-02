-- Phase 1: Staff Management Enhancements
-- Add constraints and invitation system

-- Add unique constraint for email per tenant
ALTER TABLE staff ADD CONSTRAINT unique_tenant_email UNIQUE (tenant_id, email);

-- Create staff invitations table
CREATE TABLE staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  department TEXT,
  role TEXT,
  invited_by UUID REFERENCES auth.users(id),
  invitation_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMP NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP DEFAULT now(),
  accepted_at TIMESTAMP
);

-- Enable RLS on invitations
ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;

-- Owners and managers can manage invitations
CREATE POLICY "invitations_manage" ON staff_invitations
  FOR ALL USING (
    tenant_id = get_user_tenant(auth.uid()) AND
    (has_role(auth.uid(), tenant_id, 'owner') OR has_role(auth.uid(), tenant_id, 'manager'))
  );

-- Anyone can view their own invitation (for onboarding)
CREATE POLICY "invitations_view_own" ON staff_invitations
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
    tenant_id = get_user_tenant(auth.uid())
  );

-- Create index for faster lookups
CREATE INDEX idx_staff_invitations_token ON staff_invitations(invitation_token);
CREATE INDEX idx_staff_invitations_email ON staff_invitations(tenant_id, email);

-- Add metadata column to staff for additional info
ALTER TABLE staff ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add password_reset_required flag
ALTER TABLE staff ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN DEFAULT false;