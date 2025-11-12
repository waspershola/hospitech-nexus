-- Add trial period tracking columns to platform_tenants
ALTER TABLE platform_tenants
ADD COLUMN trial_started_at TIMESTAMPTZ,
ADD COLUMN trial_end_date TIMESTAMPTZ;

-- Add index for efficient trial status queries
CREATE INDEX idx_platform_tenants_trial_end 
ON platform_tenants(trial_end_date) 
WHERE trial_end_date IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN platform_tenants.trial_started_at IS 'When the tenant trial period started';
COMMENT ON COLUMN platform_tenants.trial_end_date IS 'When the tenant trial period ends (NULL = no trial or expired)';

-- Backfill existing trial tenants with default 14-day trial
UPDATE platform_tenants
SET 
  trial_started_at = created_at,
  trial_end_date = created_at + INTERVAL '14 days'
WHERE status = 'trial' 
  AND trial_end_date IS NULL;