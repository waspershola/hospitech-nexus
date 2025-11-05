-- Drop table if exists to start fresh
DROP TABLE IF EXISTS platform_email_providers CASCADE;

-- Create platform_email_providers table
CREATE TABLE platform_email_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_type TEXT NOT NULL CHECK (provider_type IN ('smtp', 'sendgrid', 'mailgun', 'resend')),
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true,
  tenant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_email_providers_tenant ON platform_email_providers(tenant_id);
CREATE INDEX idx_email_providers_default ON platform_email_providers(is_default) WHERE is_default = true;

-- Trigger for updated_at
CREATE TRIGGER update_email_providers_updated_at
  BEFORE UPDATE ON platform_email_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_updated_at();

-- Enable RLS
ALTER TABLE platform_email_providers ENABLE ROW LEVEL SECURITY;

-- Platform admins can manage all providers
CREATE POLICY "Platform admins manage email providers"
  ON platform_email_providers
  FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()));