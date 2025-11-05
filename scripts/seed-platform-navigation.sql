-- Seed Default Platform Navigation Items
-- These are global navigation items (tenant_id = NULL) that all tenants inherit

-- Clear existing global nav items (optional - comment out if you want to keep existing)
-- DELETE FROM platform_nav_items WHERE tenant_id IS NULL;

-- Main Dashboard
INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, departments_allowed, order_index, is_active)
VALUES 
  (NULL, 'Dashboard', '/dashboard', 'LayoutDashboard', ARRAY['owner', 'manager', 'receptionist', 'front_desk', 'finance', 'accountant', 'housekeeping', 'maintenance', 'restaurant', 'kitchen', 'bar', 'store_manager', 'procurement', 'supervisor']::text[], ARRAY[]::text[], 0, true)
ON CONFLICT DO NOTHING;

-- Front Desk Operations
INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, departments_allowed, order_index, is_active)
VALUES 
  (NULL, 'Front Desk', '/dashboard/front-desk', 'MonitorCheck', ARRAY['owner', 'manager', 'receptionist', 'front_desk']::text[], ARRAY['front_desk', 'management']::text[], 1, true),
  (NULL, 'Bookings', '/dashboard/bookings', 'Calendar', ARRAY['owner', 'manager', 'receptionist', 'front_desk', 'finance', 'accountant']::text[], ARRAY[]::text[], 2, true),
  (NULL, 'Guests', '/dashboard/guests', 'Users', ARRAY['owner', 'manager', 'receptionist', 'front_desk', 'finance']::text[], ARRAY[]::text[], 3, true)
ON CONFLICT DO NOTHING;

-- Room Management
INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, departments_allowed, order_index, is_active)
VALUES 
  (NULL, 'Rooms', '/dashboard/rooms', 'BedDouble', ARRAY['owner', 'manager', 'housekeeping', 'supervisor']::text[], ARRAY[]::text[], 4, true),
  (NULL, 'Room Categories', '/dashboard/room-categories', 'LayoutGrid', ARRAY['owner', 'manager']::text[], ARRAY[]::text[], 5, true)
ON CONFLICT DO NOTHING;

-- Finance
INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, departments_allowed, order_index, is_active)
VALUES 
  (NULL, 'Payments', '/dashboard/payments', 'CreditCard', ARRAY['owner', 'manager', 'finance', 'accountant', 'receptionist', 'front_desk']::text[], ARRAY[]::text[], 6, true),
  (NULL, 'Wallets', '/dashboard/wallets', 'Wallet', ARRAY['owner', 'manager', 'finance', 'accountant']::text[], ARRAY[]::text[], 7, true),
  (NULL, 'Debtors', '/dashboard/debtors', 'FileWarning', ARRAY['owner', 'manager', 'finance', 'accountant']::text[], ARRAY[]::text[], 8, true),
  (NULL, 'Finance Center', '/dashboard/finance-center', 'Building2', ARRAY['owner', 'manager', 'finance', 'accountant']::text[], ARRAY[]::text[], 9, true)
ON CONFLICT DO NOTHING;

-- Department Dashboards
INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, departments_allowed, order_index, is_active)
VALUES 
  (NULL, 'Finance Dashboard', '/dashboard/finance-dashboard', 'TrendingUp', ARRAY['owner', 'manager', 'finance', 'accountant']::text[], ARRAY['finance', 'management']::text[], 10, true),
  (NULL, 'Housekeeping', '/dashboard/housekeeping-dashboard', 'Sparkles', ARRAY['owner', 'manager', 'housekeeping', 'supervisor']::text[], ARRAY['housekeeping', 'management']::text[], 11, true),
  (NULL, 'Maintenance', '/dashboard/maintenance-dashboard', 'Wrench', ARRAY['owner', 'manager', 'maintenance', 'supervisor']::text[], ARRAY['maintenance', 'management']::text[], 12, true),
  (NULL, 'Kitchen', '/dashboard/kitchen-dashboard', 'ChefHat', ARRAY['owner', 'manager', 'restaurant', 'kitchen', 'supervisor']::text[], ARRAY['kitchen', 'restaurant', 'management']::text[], 13, true),
  (NULL, 'Bar', '/dashboard/bar-dashboard', 'Wine', ARRAY['owner', 'manager', 'bar', 'supervisor']::text[], ARRAY['bar', 'management']::text[], 14, true)
ON CONFLICT DO NOTHING;

-- Inventory & Stock
INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, departments_allowed, order_index, is_active)
VALUES 
  (NULL, 'Inventory', '/dashboard/inventory', 'Package', ARRAY['owner', 'manager', 'store_manager', 'procurement']::text[], ARRAY['store', 'management']::text[], 15, true),
  (NULL, 'Stock Requests', '/dashboard/stock-requests', 'ClipboardList', ARRAY['housekeeping', 'maintenance', 'restaurant', 'kitchen', 'bar', 'supervisor']::text[], ARRAY['housekeeping', 'maintenance', 'restaurant', 'kitchen', 'bar']::text[], 16, true)
ON CONFLICT DO NOTHING;

-- Reports & Analytics
INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, departments_allowed, order_index, is_active)
VALUES 
  (NULL, 'Reports', '/dashboard/reports', 'BarChart3', ARRAY['owner', 'manager', 'finance', 'accountant']::text[], ARRAY[]::text[], 17, true)
ON CONFLICT DO NOTHING;

-- Staff Management
INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, departments_allowed, order_index, is_active)
VALUES 
  (NULL, 'Staff', '/dashboard/staff', 'UserCog', ARRAY['owner', 'manager', 'supervisor']::text[], ARRAY[]::text[], 18, true),
  (NULL, 'Staff Activity', '/dashboard/staff-activity', 'Activity', ARRAY['owner', 'manager', 'supervisor']::text[], ARRAY[]::text[], 19, true)
ON CONFLICT DO NOTHING;

-- Configuration (Owner/Manager only)
INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, departments_allowed, order_index, is_active)
VALUES 
  (NULL, 'Configuration', '/dashboard/configuration-center', 'Settings', ARRAY['owner', 'manager']::text[], ARRAY[]::text[], 20, true),
  (NULL, 'User Roles', '/dashboard/user-roles', 'ShieldCheck', ARRAY['owner']::text[], ARRAY[]::text[], 21, true),
  (NULL, 'Navigation Manager', '/dashboard/navigation-manager', 'Menu', ARRAY['owner']::text[], ARRAY[]::text[], 22, true)
ON CONFLICT DO NOTHING;

-- Personal Settings (All users)
INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, departments_allowed, order_index, is_active)
VALUES 
  (NULL, 'Settings', '/dashboard/settings', 'User', ARRAY['owner', 'manager', 'receptionist', 'front_desk', 'finance', 'accountant', 'housekeeping', 'maintenance', 'restaurant', 'kitchen', 'bar', 'store_manager', 'procurement', 'supervisor']::text[], ARRAY[]::text[], 23, true)
ON CONFLICT DO NOTHING;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Platform navigation items seeded successfully';
END $$;
