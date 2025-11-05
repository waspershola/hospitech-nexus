-- Drop table if exists to start fresh
DROP TABLE IF EXISTS platform_feature_flags CASCADE;

-- Create platform_feature_flags table
CREATE TABLE platform_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT NOT NULL UNIQUE,
  flag_name TEXT NOT NULL,
  description TEXT,
  enabled_globally BOOLEAN DEFAULT false,
  tenant_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_feature_flags_key ON platform_feature_flags(flag_key);
CREATE INDEX idx_feature_flags_tenant ON platform_feature_flags(tenant_id);
CREATE INDEX idx_feature_flags_global ON platform_feature_flags(enabled_globally) WHERE enabled_globally = true;

-- Trigger for updated_at
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON platform_feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_updated_at();

-- Enable RLS
ALTER TABLE platform_feature_flags ENABLE ROW LEVEL SECURITY;

-- Platform admins can manage all flags
CREATE POLICY "Platform admins manage feature flags"
  ON platform_feature_flags
  FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()));

-- Tenants can view global flags or their specific flags
CREATE POLICY "Tenants view feature flags"
  ON platform_feature_flags
  FOR SELECT
  TO authenticated
  USING (
    enabled_globally = true
    OR tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid())
  );