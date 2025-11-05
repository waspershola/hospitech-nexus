-- Add granular platform admin navigation items
-- These provide direct access to specific platform admin sections
-- Using /dashboard/platform-* convention to match existing items

-- Insert only if the path doesn't already exist
INSERT INTO platform_nav_items (
  tenant_id, 
  name, 
  path, 
  icon, 
  roles_allowed, 
  departments_allowed,
  order_index, 
  is_active
)
SELECT 
  NULL, 
  name, 
  path, 
  icon, 
  roles_allowed::text[], 
  departments_allowed::text[],
  order_index, 
  is_active
FROM (
  VALUES
    ('Platform Users', '/dashboard/platform-users', 'Users', 
     ARRAY['super_admin', 'admin'], ARRAY[]::text[], 101, true),
    
    ('Platform Tenants', '/dashboard/platform-tenants', 'Building', 
     ARRAY['super_admin', 'admin', 'support_admin'], ARRAY[]::text[], 102, true),
    
    ('Platform Plans', '/dashboard/platform-plans', 'Package', 
     ARRAY['super_admin', 'admin'], ARRAY[]::text[], 103, true),
    
    ('Platform Marketplace', '/dashboard/platform-marketplace', 'ShoppingCart', 
     ARRAY['super_admin', 'admin'], ARRAY[]::text[], 104, true),
    
    ('Platform Email', '/dashboard/platform-email', 'Mail', 
     ARRAY['super_admin', 'admin'], ARRAY[]::text[], 105, true),
    
    ('Platform Features', '/dashboard/platform-features', 'Flag', 
     ARRAY['super_admin'], ARRAY[]::text[], 106, true),
    
    ('Platform Navigation', '/dashboard/platform-navigation', 'Navigation2', 
     ARRAY['super_admin'], ARRAY[]::text[], 107, true),
    
    ('Platform Support', '/dashboard/platform-support', 'MessageSquare', 
     ARRAY['super_admin', 'admin', 'support_admin'], ARRAY[]::text[], 108, true)
) AS new_items(name, path, icon, roles_allowed, departments_allowed, order_index, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM platform_nav_items WHERE platform_nav_items.path = new_items.path
);