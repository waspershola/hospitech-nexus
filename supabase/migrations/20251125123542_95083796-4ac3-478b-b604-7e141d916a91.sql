-- Comprehensive Navigation Cleanup Migration
-- Fixes hierarchy using #container-name paths to avoid unique constraint violations
-- Version: NAV-CLEANUP-V3

-- PHASE 1: Rename Conflicting Leaf Items
UPDATE platform_nav_items SET name = 'Front Desk Dashboard' 
WHERE tenant_id IS NULL AND name = 'Front Desk' AND path = '/dashboard/front-desk';

UPDATE platform_nav_items SET name = 'Room List' 
WHERE tenant_id IS NULL AND name = 'Rooms' AND path = '/dashboard/rooms';

UPDATE platform_nav_items SET name = 'Reports Dashboard' 
WHERE tenant_id IS NULL AND name = 'Reports' AND path = '/dashboard/reports';

-- PHASE 2: Create Missing Top-Level Items
INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, departments_allowed, order_index, is_active, parent_id)
SELECT NULL, 'Organizations', '/dashboard/finance-center?tab=organizations', 'Building2', 
  ARRAY['owner', 'manager', 'finance', 'accountant']::app_role[], '{}', 4, true, NULL
WHERE NOT EXISTS (SELECT 1 FROM platform_nav_items WHERE tenant_id IS NULL AND name = 'Organizations');

-- PHASE 3: Convert Existing QR Settings to use #container path format
UPDATE platform_nav_items SET name = 'QR Services', path = '#qr-services', order_index = 8
WHERE tenant_id IS NULL AND name = 'QR Settings' AND (path IS NULL OR path = '');

-- PHASE 4: Convert Finance Center to use #container path format
UPDATE platform_nav_items SET path = '#finance-center', order_index = 10
WHERE tenant_id IS NULL AND name = 'Finance Center';

-- PHASE 5: Create NEW Parent Container Groups with #container paths
INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, departments_allowed, order_index, is_active, parent_id)
SELECT NULL, 'Front Desk', '#front-desk', 'Home', ARRAY['owner', 'manager', 'frontdesk']::app_role[], '{}', 6, true, NULL
WHERE NOT EXISTS (SELECT 1 FROM platform_nav_items WHERE tenant_id IS NULL AND path = '#front-desk');

INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, departments_allowed, order_index, is_active, parent_id)
SELECT NULL, 'Operations', '#operations', 'Briefcase', ARRAY['owner', 'manager', 'housekeeping', 'maintenance', 'kitchen', 'bar']::app_role[], '{}', 7, true, NULL
WHERE NOT EXISTS (SELECT 1 FROM platform_nav_items WHERE tenant_id IS NULL AND path = '#operations');

INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, departments_allowed, order_index, is_active, parent_id)
SELECT NULL, 'Rooms', '#rooms', 'DoorOpen', ARRAY['owner', 'manager', 'frontdesk', 'housekeeping']::app_role[], '{}', 9, true, NULL
WHERE NOT EXISTS (SELECT 1 FROM platform_nav_items WHERE tenant_id IS NULL AND path = '#rooms');

INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, departments_allowed, order_index, is_active, parent_id)
SELECT NULL, 'Inventory & Stock', '#inventory-stock', 'Package', ARRAY['owner', 'manager', 'store_manager']::app_role[], '{}', 11, true, NULL
WHERE NOT EXISTS (SELECT 1 FROM platform_nav_items WHERE tenant_id IS NULL AND path = '#inventory-stock');

INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, departments_allowed, order_index, is_active, parent_id)
SELECT NULL, 'Staff & Activity', '#staff-activity', 'Users', ARRAY['owner', 'manager']::app_role[], '{}', 12, true, NULL
WHERE NOT EXISTS (SELECT 1 FROM platform_nav_items WHERE tenant_id IS NULL AND path = '#staff-activity');

INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, departments_allowed, order_index, is_active, parent_id)
SELECT NULL, 'Administration', '#administration', 'Settings', ARRAY['owner', 'manager']::app_role[], '{}', 13, true, NULL
WHERE NOT EXISTS (SELECT 1 FROM platform_nav_items WHERE tenant_id IS NULL AND path = '#administration');

INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, departments_allowed, order_index, is_active, parent_id)
SELECT NULL, 'Reports', '#reports', 'FileText', ARRAY['owner', 'manager', 'finance', 'accountant']::app_role[], '{}', 14, true, NULL
WHERE NOT EXISTS (SELECT 1 FROM platform_nav_items WHERE tenant_id IS NULL AND path = '#reports');

-- PHASE 6: Set Top-Level Item Order
UPDATE platform_nav_items SET order_index = 1 WHERE tenant_id IS NULL AND name = 'Overview' AND path = '/dashboard';
UPDATE platform_nav_items SET order_index = 2 WHERE tenant_id IS NULL AND name = 'Front Desk Dashboard' AND path = '/dashboard/front-desk';
UPDATE platform_nav_items SET order_index = 3 WHERE tenant_id IS NULL AND name = 'Guest Requests' AND path = '/dashboard/guest-requests';
UPDATE platform_nav_items SET order_index = 4 WHERE tenant_id IS NULL AND name = 'Organizations';
UPDATE platform_nav_items SET order_index = 5 WHERE tenant_id IS NULL AND name = 'A/R';

-- PHASE 7: Link Children to Parent Containers
UPDATE platform_nav_items AS child SET parent_id = parent.id
FROM platform_nav_items AS parent
WHERE parent.tenant_id IS NULL AND parent.path = '#front-desk'
  AND child.tenant_id IS NULL AND child.name IN ('Front Desk Dashboard', 'Bookings', 'Guests', 'Reservations Management', 'QR Billing Tasks');

UPDATE platform_nav_items AS child SET parent_id = parent.id
FROM platform_nav_items AS parent
WHERE parent.tenant_id IS NULL AND parent.path = '#operations'
  AND child.tenant_id IS NULL AND child.name IN ('Housekeeping Dashboard', 'Maintenance Dashboard', 'Kitchen Dashboard', 'Bar Dashboard', 'Laundry Management', 'Spa Management', 'Department Requests');

UPDATE platform_nav_items AS child SET parent_id = parent.id
FROM platform_nav_items AS parent
WHERE parent.tenant_id IS NULL AND parent.path = '#qr-services'
  AND child.tenant_id IS NULL AND child.name IN ('QR Management', 'QR Analytics', 'QR Printables', 'QR Portal Features', 'QR Portal Theme', 'WiFi Manager', 'Menu Management', 'Quick Reply Templates');

UPDATE platform_nav_items AS child SET parent_id = parent.id
FROM platform_nav_items AS parent
WHERE parent.tenant_id IS NULL AND parent.path = '#rooms'
  AND child.tenant_id IS NULL AND child.name IN ('Room List', 'Room Categories');

UPDATE platform_nav_items AS child SET parent_id = parent.id
FROM platform_nav_items AS parent
WHERE parent.tenant_id IS NULL AND parent.path = '#finance-center'
  AND child.tenant_id IS NULL AND child.name IN ('Payments', 'Wallets', 'Debtors') AND child.parent_id IS NULL;

UPDATE platform_nav_items AS child SET parent_id = parent.id
FROM platform_nav_items AS parent
WHERE parent.tenant_id IS NULL AND parent.path = '#inventory-stock'
  AND child.tenant_id IS NULL AND child.name IN ('Inventory', 'Stock Requests');

UPDATE platform_nav_items AS child SET parent_id = parent.id
FROM platform_nav_items AS parent
WHERE parent.tenant_id IS NULL AND parent.path = '#staff-activity'
  AND child.tenant_id IS NULL AND child.name IN ('Staff', 'Staff Activity', 'User Roles');

UPDATE platform_nav_items AS child SET parent_id = parent.id
FROM platform_nav_items AS parent
WHERE parent.tenant_id IS NULL AND parent.path = '#administration'
  AND child.tenant_id IS NULL AND child.name IN ('Configuration');

UPDATE platform_nav_items AS child SET parent_id = parent.id
FROM platform_nav_items AS parent
WHERE parent.tenant_id IS NULL AND parent.path = '#reports'
  AND child.tenant_id IS NULL AND child.name IN ('Reports Dashboard');

-- PHASE 8: Set Logout at Bottom
UPDATE platform_nav_items SET order_index = 99, parent_id = NULL WHERE tenant_id IS NULL AND name = 'Logout';