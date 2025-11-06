-- Implement soft delete for tenants
-- Add deleted_by tracking
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE platform_tenants 
ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- Create function to soft delete tenant
CREATE OR REPLACE FUNCTION soft_delete_tenant(_tenant_id uuid, _deleted_by uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check if tenant exists and not already deleted
  IF NOT EXISTS (
    SELECT 1 FROM tenants 
    WHERE id = _tenant_id AND deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tenant not found or already deleted'
    );
  END IF;

  -- Soft delete in tenants table
  UPDATE tenants
  SET 
    deleted_at = now(),
    deleted_by = _deleted_by,
    updated_at = now()
  WHERE id = _tenant_id;

  -- Soft delete in platform_tenants table
  UPDATE platform_tenants
  SET 
    deleted_at = now(),
    deleted_by = _deleted_by,
    updated_at = now()
  WHERE id = _tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Tenant soft deleted successfully'
  );
END;
$$;

-- Create function to restore deleted tenant
CREATE OR REPLACE FUNCTION restore_tenant(_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if tenant exists and is deleted
  IF NOT EXISTS (
    SELECT 1 FROM tenants 
    WHERE id = _tenant_id AND deleted_at IS NOT NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tenant not found or not deleted'
    );
  END IF;

  -- Restore in tenants table
  UPDATE tenants
  SET 
    deleted_at = NULL,
    deleted_by = NULL,
    updated_at = now()
  WHERE id = _tenant_id;

  -- Restore in platform_tenants table
  UPDATE platform_tenants
  SET 
    deleted_at = NULL,
    deleted_by = NULL,
    updated_at = now()
  WHERE id = _tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Tenant restored successfully'
  );
END;
$$;