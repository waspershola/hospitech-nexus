-- Phase 5: Add navigation items for Staff Management and User Roles

-- Add Staff Management navigation item
INSERT INTO navigation_items (tenant_id, name, path, icon, allowed_roles, order_index, is_active)
SELECT 
  t.id as tenant_id,
  'Staff Management',
  '/dashboard/staff',
  'Users',
  ARRAY['owner', 'manager', 'supervisor']::app_role[],
  12,
  true
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM navigation_items WHERE path = '/dashboard/staff' AND tenant_id = t.id
);

-- Add User Roles navigation item
INSERT INTO navigation_items (tenant_id, name, path, icon, allowed_roles, order_index, is_active)
SELECT 
  t.id as tenant_id,
  'User Roles',
  '/dashboard/user-roles',
  'Shield',
  ARRAY['owner', 'manager']::app_role[],
  13,
  true
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM navigation_items WHERE path = '/dashboard/user-roles' AND tenant_id = t.id
);