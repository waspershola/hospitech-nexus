-- Create tenant AI settings table for managing AI concierge behavior
CREATE TABLE IF NOT EXISTS tenant_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Language preferences
  staff_language_preference TEXT DEFAULT 'en' NOT NULL,
  
  -- AI behavior customization
  ai_behavior_prompt TEXT,
  welcome_message_template TEXT DEFAULT 'Welcome to our hotel! How may I assist you today?' NOT NULL,
  translation_prompt_template TEXT,
  ai_response_style TEXT DEFAULT 'luxury' CHECK (ai_response_style IN ('luxury', 'formal', 'casual')),
  
  -- Feature toggles
  enable_auto_translation BOOLEAN DEFAULT true NOT NULL,
  enable_ai_auto_responses BOOLEAN DEFAULT false NOT NULL,
  enable_ai_suggestions BOOLEAN DEFAULT true NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE tenant_ai_settings ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy - staff can manage their tenant's AI settings
CREATE POLICY "Tenant isolation for AI settings" ON tenant_ai_settings
  FOR ALL 
  USING (
    tenant_id IN (
      SELECT tenant_id FROM staff WHERE user_id = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_tenant_ai_settings_tenant ON tenant_ai_settings(tenant_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tenant_ai_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_ai_settings_updated_at
  BEFORE UPDATE ON tenant_ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_ai_settings_timestamp();

-- Insert default settings for existing tenants
INSERT INTO tenant_ai_settings (tenant_id)
SELECT id FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM tenant_ai_settings)
ON CONFLICT (tenant_id) DO NOTHING;