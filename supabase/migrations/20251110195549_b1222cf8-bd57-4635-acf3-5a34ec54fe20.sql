-- Add or update Department Requests Dashboard navigation item for all tenants
-- This provides centralized view of service requests across all departments

-- For owners and managers (full access to all department requests)
INSERT INTO navigation_items (tenant_id, name, path, icon, allowed_roles, allowed_departments, order_index, is_active, description)
SELECT 
  t.id as tenant_id,
  'Department Requests' as name,
  '/dashboard/department-requests' as path,
  'ClipboardList' as icon,
  ARRAY['owner'::app_role, 'manager'::app_role] as allowed_roles,
  ARRAY[]::text[] as allowed_departments,
  15 as order_index,
  true as is_active,
  'View and manage service requests from all departments' as description
FROM tenants t
ON CONFLICT (tenant_id, path)
DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  allowed_roles = ARRAY(SELECT DISTINCT unnest(navigation_items.allowed_roles || EXCLUDED.allowed_roles)),
  is_active = EXCLUDED.is_active,
  description = EXCLUDED.description,
  updated_at = now();

-- For frontdesk staff
INSERT INTO navigation_items (tenant_id, name, path, icon, allowed_roles, allowed_departments, order_index, is_active, description)
SELECT 
  t.id as tenant_id,
  'Department Requests' as name,
  '/dashboard/department-requests' as path,
  'ClipboardList' as icon,
  ARRAY['frontdesk'::app_role] as allowed_roles,
  ARRAY['front_office']::text[] as allowed_departments,
  10 as order_index,
  true as is_active,
  'View and coordinate service requests across departments' as description
FROM tenants t
ON CONFLICT (tenant_id, path) 
DO UPDATE SET
  allowed_roles = ARRAY(SELECT DISTINCT unnest(navigation_items.allowed_roles || EXCLUDED.allowed_roles)),
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- For department staff (valid roles only)
INSERT INTO navigation_items (tenant_id, name, path, icon, allowed_roles, allowed_departments, order_index, is_active, description)
SELECT 
  t.id as tenant_id,
  'My Department' as name,
  '/dashboard/department-requests' as path,
  'ClipboardList' as icon,
  ARRAY['restaurant'::app_role, 'housekeeping'::app_role, 'maintenance'::app_role, 'spa'::app_role, 'concierge'::app_role] as allowed_roles,
  ARRAY[]::text[] as allowed_departments,
  8 as order_index,
  true as is_active,
  'View and manage requests for your department' as description
FROM tenants t
ON CONFLICT (tenant_id, path)
DO UPDATE SET
  allowed_roles = ARRAY(SELECT DISTINCT unnest(navigation_items.allowed_roles || EXCLUDED.allowed_roles)),
  is_active = EXCLUDED.is_active,
  updated_at = now();