-- Backfill navigation items for existing tenants without navigation
-- This ensures all tenants (including TEST HOTEL, AZZAHRA, AZZAHRA2) get the full navigation menu

INSERT INTO platform_nav_items (
  tenant_id, 
  name, 
  path, 
  icon, 
  roles_allowed, 
  departments_allowed,
  parent_id, 
  order_index, 
  is_active, 
  metadata
)
SELECT 
  pt.id as tenant_id,
  pni.name, 
  pni.path, 
  pni.icon, 
  pni.roles_allowed, 
  pni.departments_allowed,
  pni.parent_id, 
  pni.order_index, 
  pni.is_active, 
  pni.metadata
FROM platform_tenants pt
CROSS JOIN platform_nav_items pni
WHERE pni.tenant_id IS NULL  -- Only global navigation templates
  AND pt.deleted_at IS NULL  -- Only active tenants
  AND NOT EXISTS (
    -- Skip tenants that already have navigation items
    SELECT 1 
    FROM platform_nav_items existing
    WHERE existing.tenant_id = pt.id
    LIMIT 1
  );