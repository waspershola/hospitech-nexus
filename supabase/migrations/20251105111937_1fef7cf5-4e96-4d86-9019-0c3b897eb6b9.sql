-- Migration: Restore Navigation System - Add constraint and migrate data

-- Step 1: Add unique constraint to platform_nav_items to support ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS platform_nav_items_tenant_path_unique 
ON platform_nav_items (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), path);

-- Step 2: Migrate all existing tenant-specific navigation items from navigation_items
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
  tenant_id,
  name,
  path,
  icon,
  allowed_roles::text[] as roles_allowed,
  COALESCE(allowed_departments, ARRAY[]::text[]) as departments_allowed,
  parent_id,
  order_index,
  COALESCE(is_active, true) as is_active,
  COALESCE(metadata, '{}'::jsonb) as metadata
FROM navigation_items
WHERE NOT EXISTS (
  SELECT 1 FROM platform_nav_items pni
  WHERE COALESCE(pni.tenant_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(navigation_items.tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
  AND pni.path = navigation_items.path
);

-- Step 3: Add missing global navigation items
INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, departments_allowed, order_index, is_active, metadata)
SELECT NULL, name, path, icon, roles_allowed, departments_allowed, order_index, is_active, metadata
FROM (VALUES
  ('Debtors', '/dashboard/debtors', 'Users', ARRAY['owner', 'manager']::text[], ARRAY['finance', 'management']::text[], 130, true, '{}'::jsonb),
  ('User Roles', '/dashboard/user-roles', 'ShieldCheck', ARRAY['owner']::text[], ARRAY['management']::text[], 140, true, '{}'::jsonb),
  ('Staff Activity', '/dashboard/staff-activity', 'Activity', ARRAY['owner', 'manager']::text[], ARRAY['management', 'hr']::text[], 150, true, '{}'::jsonb),
  ('Housekeeping Dashboard', '/dashboard/housekeeping-dashboard', 'Bed', ARRAY['owner', 'manager', 'housekeeping_supervisor', 'housekeeping_staff']::text[], ARRAY['housekeeping', 'management']::text[], 160, true, '{}'::jsonb),
  ('Maintenance Dashboard', '/dashboard/maintenance-dashboard', 'Wrench', ARRAY['owner', 'manager', 'maintenance_supervisor', 'maintenance_staff']::text[], ARRAY['maintenance', 'management']::text[], 170, true, '{}'::jsonb),
  ('Kitchen Dashboard', '/dashboard/kitchen-dashboard', 'ChefHat', ARRAY['owner', 'manager', 'chef', 'kitchen_staff']::text[], ARRAY['kitchen', 'food_beverage', 'management']::text[], 180, true, '{}'::jsonb),
  ('Bar Dashboard', '/dashboard/bar-dashboard', 'Wine', ARRAY['owner', 'manager', 'bartender', 'bar_staff']::text[], ARRAY['bar', 'food_beverage', 'management']::text[], 190, true, '{}'::jsonb),
  ('Platform Billing', '/dashboard/platform-billing', 'CreditCard', ARRAY['platform_admin', 'super_admin']::text[], ARRAY[]::text[], 200, true, '{}'::jsonb),
  ('Room Categories', '/dashboard/room-categories', 'LayoutGrid', ARRAY['owner', 'manager']::text[], ARRAY['management', 'front_office']::text[], 35, true, '{}'::jsonb)
) AS new_items(name, path, icon, roles_allowed, departments_allowed, order_index, is_active, metadata)
WHERE NOT EXISTS (
  SELECT 1 FROM platform_nav_items 
  WHERE platform_nav_items.path = new_items.path 
  AND platform_nav_items.tenant_id IS NULL
);

-- Step 4: Log the migration results
DO $$
DECLARE
  migrated_count INTEGER;
  total_global INTEGER;
  total_tenant INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_tenant FROM platform_nav_items WHERE tenant_id IS NOT NULL;
  SELECT COUNT(*) INTO total_global FROM platform_nav_items WHERE tenant_id IS NULL;
  
  RAISE NOTICE '=== Navigation Migration Completed ===';
  RAISE NOTICE 'Tenant-specific items: %', total_tenant;
  RAISE NOTICE 'Global navigation items: %', total_global;
  RAISE NOTICE 'Total navigation items: %', total_tenant + total_global;
  RAISE NOTICE '=====================================';
END $$;