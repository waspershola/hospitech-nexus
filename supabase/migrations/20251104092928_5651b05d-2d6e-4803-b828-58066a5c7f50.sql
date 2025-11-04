-- Phase 2: Add comprehensive navigation items for all roles

-- Store Manager Navigation
INSERT INTO navigation_items (tenant_id, name, path, icon, allowed_roles, order_index, is_active)
VALUES
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Overview', '/dashboard', 'Home', ARRAY['store_manager'::app_role], 1, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Inventory', '/dashboard/inventory', 'Package', ARRAY['store_manager'::app_role], 2, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Purchase Orders', '/dashboard/inventory', 'FileText', ARRAY['store_manager'::app_role, 'procurement'::app_role], 3, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Stock Movements', '/dashboard/inventory', 'ArrowLeftRight', ARRAY['store_manager'::app_role], 4, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Suppliers', '/dashboard/inventory', 'Truck', ARRAY['store_manager'::app_role, 'procurement'::app_role], 5, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Department Requests', '/dashboard/inventory', 'ClipboardList', ARRAY['store_manager'::app_role], 6, true)
ON CONFLICT DO NOTHING;

-- Housekeeping Navigation
INSERT INTO navigation_items (tenant_id, name, path, icon, allowed_roles, order_index, is_active)
VALUES
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Overview', '/dashboard', 'Home', ARRAY['housekeeping'::app_role], 1, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Housekeeping', '/dashboard/housekeeping-dashboard', 'Sparkles', ARRAY['housekeeping'::app_role], 2, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Rooms', '/dashboard/rooms', 'Bed', ARRAY['housekeeping'::app_role], 3, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Stock Requests', '/dashboard/inventory', 'Package', ARRAY['housekeeping'::app_role], 4, true)
ON CONFLICT DO NOTHING;

-- Maintenance Navigation
INSERT INTO navigation_items (tenant_id, name, path, icon, allowed_roles, order_index, is_active)
VALUES
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Overview', '/dashboard', 'Home', ARRAY['maintenance'::app_role], 1, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Maintenance', '/dashboard/maintenance-dashboard', 'Wrench', ARRAY['maintenance'::app_role], 2, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Rooms', '/dashboard/rooms', 'Bed', ARRAY['maintenance'::app_role], 3, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Stock Requests', '/dashboard/inventory', 'Package', ARRAY['maintenance'::app_role], 4, true)
ON CONFLICT DO NOTHING;

-- Bar Navigation
INSERT INTO navigation_items (tenant_id, name, path, icon, allowed_roles, order_index, is_active)
VALUES
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Overview', '/dashboard', 'Home', ARRAY['bar'::app_role], 1, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Bar', '/dashboard/bar-dashboard', 'Wine', ARRAY['bar'::app_role], 2, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Stock Requests', '/dashboard/inventory', 'Package', ARRAY['bar'::app_role], 3, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Payments', '/dashboard/payments', 'CreditCard', ARRAY['bar'::app_role], 4, true)
ON CONFLICT DO NOTHING;

-- Restaurant Navigation
INSERT INTO navigation_items (tenant_id, name, path, icon, allowed_roles, order_index, is_active)
VALUES
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Overview', '/dashboard', 'Home', ARRAY['restaurant'::app_role], 1, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Restaurant', '/dashboard/kitchen-dashboard', 'UtensilsCrossed', ARRAY['restaurant'::app_role], 2, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Stock Requests', '/dashboard/inventory', 'Package', ARRAY['restaurant'::app_role], 3, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Payments', '/dashboard/payments', 'CreditCard', ARRAY['restaurant'::app_role], 4, true)
ON CONFLICT DO NOTHING;

-- Procurement Navigation
INSERT INTO navigation_items (tenant_id, name, path, icon, allowed_roles, order_index, is_active)
VALUES
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Overview', '/dashboard', 'Home', ARRAY['procurement'::app_role], 1, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Inventory', '/dashboard/inventory', 'Package', ARRAY['procurement'::app_role], 2, true)
ON CONFLICT DO NOTHING;

-- Store User Navigation  
INSERT INTO navigation_items (tenant_id, name, path, icon, allowed_roles, order_index, is_active)
VALUES
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Overview', '/dashboard', 'Home', ARRAY['store_user'::app_role], 1, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Inventory', '/dashboard/inventory', 'Package', ARRAY['store_user'::app_role], 2, true)
ON CONFLICT DO NOTHING;

-- HR Navigation
INSERT INTO navigation_items (tenant_id, name, path, icon, allowed_roles, order_index, is_active)
VALUES
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Overview', '/dashboard', 'Home', ARRAY['hr'::app_role], 1, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Staff', '/dashboard/staff', 'UserCog', ARRAY['hr'::app_role], 2, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Staff Activity', '/dashboard/staff-activity', 'Activity', ARRAY['hr'::app_role], 3, true)
ON CONFLICT DO NOTHING;

-- Admin Navigation
INSERT INTO navigation_items (tenant_id, name, path, icon, allowed_roles, order_index, is_active)
VALUES
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Overview', '/dashboard', 'Home', ARRAY['admin'::app_role], 1, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Staff', '/dashboard/staff', 'UserCog', ARRAY['admin'::app_role], 2, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Reports', '/dashboard/reports', 'FileText', ARRAY['admin'::app_role], 3, true)
ON CONFLICT DO NOTHING;

-- Spa Navigation
INSERT INTO navigation_items (tenant_id, name, path, icon, allowed_roles, order_index, is_active)
VALUES
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Overview', '/dashboard', 'Home', ARRAY['spa'::app_role], 1, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Appointments', '/dashboard/bookings', 'CalendarDays', ARRAY['spa'::app_role], 2, true)
ON CONFLICT DO NOTHING;

-- Concierge Navigation
INSERT INTO navigation_items (tenant_id, name, path, icon, allowed_roles, order_index, is_active)
VALUES
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Overview', '/dashboard', 'Home', ARRAY['concierge'::app_role], 1, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Guests', '/dashboard/guests', 'Users', ARRAY['concierge'::app_role], 2, true)
ON CONFLICT DO NOTHING;