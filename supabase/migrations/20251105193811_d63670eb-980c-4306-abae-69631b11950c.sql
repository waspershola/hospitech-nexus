-- Create platform payment providers table
CREATE TABLE IF NOT EXISTS platform_payment_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_type TEXT NOT NULL CHECK (provider_type IN ('stripe', 'monnify', 'paystack', 'flutterwave')),
  provider_name TEXT NOT NULL,
  api_key_encrypted TEXT,
  api_secret_encrypted TEXT,
  webhook_secret TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_platform_payment_providers_active 
  ON platform_payment_providers(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_platform_payment_providers_default 
  ON platform_payment_providers(is_default) WHERE is_default = true;

-- Create trigger for updated_at
CREATE TRIGGER update_platform_payment_providers_updated_at
  BEFORE UPDATE ON platform_payment_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_updated_at();

-- Ensure only one default provider at a time
CREATE OR REPLACE FUNCTION ensure_one_default_payment_provider()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE platform_payment_providers 
    SET is_default = false 
    WHERE id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_one_default_payment_provider_trigger
  BEFORE INSERT OR UPDATE ON platform_payment_providers
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_one_default_payment_provider();

-- Add RLS policies
ALTER TABLE platform_payment_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view payment providers"
  ON platform_payment_providers FOR SELECT
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can manage payment providers"
  ON platform_payment_providers FOR ALL
  USING (is_platform_admin(auth.uid()));

-- Add payment_provider_id to platform_billing for tracking which provider was used
ALTER TABLE platform_billing
ADD COLUMN IF NOT EXISTS payment_provider_id UUID REFERENCES platform_payment_providers(id);

COMMENT ON TABLE platform_payment_providers IS 'Stores platform-level payment provider configurations';
COMMENT ON COLUMN platform_payment_providers.api_key_encrypted IS 'Encrypted API key for the payment provider';
COMMENT ON COLUMN platform_payment_providers.is_default IS 'Whether this is the default payment provider for new purchases';