-- Add lifecycle tracking columns to tenants table
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add check constraint for tenant status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_tenant_status'
  ) THEN
    ALTER TABLE tenants
      ADD CONSTRAINT check_tenant_status
      CHECK (status IN ('pending', 'active', 'trial', 'suspended', 'inactive'));
  END IF;
END $$;

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_activated_at ON tenants(activated_at);

-- Update existing tenants to have active status
UPDATE tenants 
SET status = 'active', 
    activated_at = created_at 
WHERE status IS NULL OR status = 'pending';