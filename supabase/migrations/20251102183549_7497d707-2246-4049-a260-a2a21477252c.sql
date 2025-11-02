-- Seed navigation items for all tenants
INSERT INTO navigation_items (tenant_id, name, path, icon, allowed_roles, order_index)
SELECT 
  t.id,
  item.name,
  item.path,
  item.icon,
  item.allowed_roles::app_role[],
  item.order_index
FROM tenants t
CROSS JOIN (VALUES
  ('Overview', '/dashboard', 'Home', ARRAY['owner','manager','frontdesk','finance','accountant'], 1),
  ('Front Desk', '/dashboard/front-desk', 'LayoutDashboard', ARRAY['owner','manager','frontdesk'], 2),
  ('Rooms', '/dashboard/rooms', 'Bed', ARRAY['owner','manager','frontdesk','housekeeping','maintenance'], 3),
  ('Categories', '/dashboard/room-categories', 'Grid3x3', ARRAY['owner','manager'], 4),
  ('Bookings', '/dashboard/bookings', 'CalendarRange', ARRAY['owner','manager','frontdesk','finance','accountant'], 5),
  ('Guests', '/dashboard/guests', 'Users', ARRAY['owner','manager','frontdesk','finance'], 6),
  ('Wallets', '/dashboard/wallets', 'Wallet', ARRAY['owner','manager','finance','accountant'], 7),
  ('Finance Center', '/dashboard/finance', 'DollarSign', ARRAY['owner','manager','finance','accountant'], 8),
  ('Debtors', '/dashboard/debtors', 'TrendingDown', ARRAY['owner','manager','finance','accountant'], 9),
  ('Reports', '/dashboard/reports', 'FileText', ARRAY['owner','manager','finance','accountant'], 10),
  ('Configuration', '/dashboard/configuration', 'Settings', ARRAY['owner','manager'], 11)
) AS item(name, path, icon, allowed_roles, order_index)
WHERE NOT EXISTS (
  SELECT 1 FROM navigation_items ni 
  WHERE ni.tenant_id = t.id AND ni.name = item.name
);