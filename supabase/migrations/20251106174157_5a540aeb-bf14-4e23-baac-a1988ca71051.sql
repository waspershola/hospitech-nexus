-- Phase 1: Status Synchronization
-- Add timestamps to tenants table for tracking suspension/activation
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE;

-- Create function to sync tenant status between platform_tenants and tenants
CREATE OR REPLACE FUNCTION sync_tenant_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync status to tenants table
  UPDATE tenants
  SET 
    status = NEW.status,
    suspended_at = CASE WHEN NEW.status = 'suspended' THEN now() ELSE NULL END,
    activated_at = CASE WHEN NEW.status = 'active' AND OLD.status != 'active' THEN now() ELSE activated_at END,
    updated_at = now()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for status synchronization
DROP TRIGGER IF EXISTS trigger_sync_tenant_status ON platform_tenants;
CREATE TRIGGER trigger_sync_tenant_status
AFTER UPDATE OF status ON platform_tenants
FOR EACH ROW
EXECUTE FUNCTION sync_tenant_status();

-- Phase 2: Tenant Access Control
-- Create function to check if tenant has access
CREATE OR REPLACE FUNCTION check_tenant_access(_tenant_id uuid)
RETURNS jsonb AS $$
DECLARE
  tenant_status text;
  platform_status text;
BEGIN
  SELECT t.status, pt.status INTO tenant_status, platform_status
  FROM tenants t
  LEFT JOIN platform_tenants pt ON t.id = pt.id
  WHERE t.id = _tenant_id;
  
  IF tenant_status = 'suspended' OR platform_status = 'suspended' THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'tenant_suspended',
      'message', 'Your tenant account is currently suspended. Please contact support.'
    );
  END IF;
  
  RETURN jsonb_build_object('allowed', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add settings column to platform_tenants for advanced configuration
ALTER TABLE platform_tenants 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Add soft delete support
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE platform_tenants 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;