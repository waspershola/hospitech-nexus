-- Add navigation items for Staff Management
-- This adds Staff and Staff Activity pages to the navigation menu

-- Insert Staff page navigation item
INSERT INTO navigation_items (tenant_id, name, path, icon, allowed_roles, order_index, is_active)
SELECT 
  id as tenant_id,
  'Staff' as name,
  '/dashboard/staff' as path,
  'Users' as icon,
  ARRAY['owner', 'manager', 'supervisor']::app_role[] as allowed_roles,
  17 as order_index,
  true as is_active
FROM tenants
WHERE NOT EXISTS (
  SELECT 1 FROM navigation_items 
  WHERE path = '/dashboard/staff' 
  AND tenant_id = tenants.id
);

-- Insert Staff Activity page navigation item
INSERT INTO navigation_items (tenant_id, name, path, icon, allowed_roles, order_index, is_active)
SELECT 
  id as tenant_id,
  'Staff Activity' as name,
  '/dashboard/staff-activity' as path,
  'Activity' as icon,
  ARRAY['owner', 'manager', 'supervisor']::app_role[] as allowed_roles,
  18 as order_index,
  true as is_active
FROM tenants
WHERE NOT EXISTS (
  SELECT 1 FROM navigation_items 
  WHERE path = '/dashboard/staff-activity' 
  AND tenant_id = tenants.id
);