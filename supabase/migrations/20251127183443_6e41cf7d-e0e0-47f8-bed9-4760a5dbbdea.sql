-- OPTION-C-V1: Add translation_style column for literal/polite/hybrid modes
ALTER TABLE tenant_ai_settings 
ADD COLUMN IF NOT EXISTS translation_style TEXT DEFAULT 'literal' NOT NULL;

ALTER TABLE tenant_ai_settings
ADD CONSTRAINT tenant_ai_settings_translation_style_check
CHECK (translation_style IN ('literal', 'polite', 'hybrid'));

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_tenant_ai_settings_translation_style 
ON tenant_ai_settings(translation_style);

-- Add polite_suggestion column to guest_communications for storing AI suggestions
ALTER TABLE guest_communications
ADD COLUMN IF NOT EXISTS polite_suggestion TEXT;

COMMENT ON COLUMN tenant_ai_settings.translation_style IS 'Translation mode: literal (strict translation only), polite (translation + AI-enhanced version), hybrid (both literal + separate AI suggestion)';
COMMENT ON COLUMN guest_communications.polite_suggestion IS 'AI-generated polite reply suggestion (for polite/hybrid modes only)';