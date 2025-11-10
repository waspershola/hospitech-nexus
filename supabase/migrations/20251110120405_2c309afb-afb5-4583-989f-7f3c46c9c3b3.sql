-- Insert hierarchical navigation data

-- Insert QR Settings parent group
INSERT INTO platform_nav_items (name, path, icon, order_index, roles_allowed, departments_allowed, is_active, metadata)
VALUES ('QR Settings', '', 'QrCode', 4, ARRAY['owner', 'manager'], ARRAY[]::text[], true, '{"description": "Manage all QR code related features"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Update existing QR items to be children of QR Settings
UPDATE platform_nav_items
SET parent_id = (SELECT id FROM platform_nav_items WHERE name = 'QR Settings' AND path = '' LIMIT 1)
WHERE name IN ('QR Printables', 'QR Management', 'Guest Requests', 'QR Analytics');

-- Add new navigation items for moved pages
INSERT INTO platform_nav_items (name, path, icon, order_index, roles_allowed, departments_allowed, is_active, parent_id, metadata)
SELECT 
  'QR Portal Features', 
  '/dashboard/qr-portal-features', 
  'Settings', 
  5, 
  ARRAY['owner', 'manager'], 
  ARRAY[]::text[], 
  true, 
  (SELECT id FROM platform_nav_items WHERE name = 'QR Settings' AND path = '' LIMIT 1),
  '{"description": "Configure QR portal feature toggles"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM platform_nav_items WHERE name = 'QR Portal Features');

INSERT INTO platform_nav_items (name, path, icon, order_index, roles_allowed, departments_allowed, is_active, parent_id, metadata)
SELECT 
  'QR Portal Theme', 
  '/dashboard/qr-portal-theme', 
  'Palette', 
  6, 
  ARRAY['owner', 'manager'], 
  ARRAY[]::text[], 
  true, 
  (SELECT id FROM platform_nav_items WHERE name = 'QR Settings' AND path = '' LIMIT 1),
  '{"description": "Customize QR portal theme and branding"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM platform_nav_items WHERE name = 'QR Portal Theme');

INSERT INTO platform_nav_items (name, path, icon, order_index, roles_allowed, departments_allowed, is_active, parent_id, metadata)
SELECT 
  'WiFi Manager', 
  '/dashboard/wifi-manager', 
  'Wifi', 
  7, 
  ARRAY['owner', 'manager'], 
  ARRAY[]::text[], 
  true, 
  (SELECT id FROM platform_nav_items WHERE name = 'QR Settings' AND path = '' LIMIT 1),
  '{"description": "Manage WiFi credentials for guests"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM platform_nav_items WHERE name = 'WiFi Manager');

INSERT INTO platform_nav_items (name, path, icon, order_index, roles_allowed, departments_allowed, is_active, parent_id, metadata)
SELECT 
  'Menu Management', 
  '/dashboard/menu-management', 
  'UtensilsCrossed', 
  8, 
  ARRAY['owner', 'manager'], 
  ARRAY[]::text[], 
  true, 
  (SELECT id FROM platform_nav_items WHERE name = 'QR Settings' AND path = '' LIMIT 1),
  '{"description": "Manage digital menu items"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM platform_nav_items WHERE name = 'Menu Management');