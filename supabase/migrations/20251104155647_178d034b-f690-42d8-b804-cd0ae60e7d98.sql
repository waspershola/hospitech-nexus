-- Add Navigation Manager to navigation_items for all tenants
-- This allows owners to access the Navigation Manager from the sidebar

INSERT INTO navigation_items (
  tenant_id,
  name,
  path,
  icon,
  allowed_roles,
  allowed_departments,
  order_index,
  is_active,
  description
)
SELECT 
  id as tenant_id,
  'Navigation Manager' as name,
  '/dashboard/navigation-manager' as path,
  'Map' as icon,
  ARRAY['owner']::app_role[] as allowed_roles,
  ARRAY[]::text[] as allowed_departments,
  99 as order_index,
  true as is_active,
  'Manage navigation menu items and access control' as description
FROM tenants
ON CONFLICT DO NOTHING;