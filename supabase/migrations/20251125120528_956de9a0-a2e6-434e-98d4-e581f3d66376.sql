-- Phase 1: Delete duplicate navigation items, keeping only one of each
-- This removes the 183 → ~50 items cleanup
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY name, COALESCE(path, '') ORDER BY created_at ASC) as rn
  FROM platform_nav_items
)
DELETE FROM platform_nav_items
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Phase 2: Create missing parent groups
-- Insert parent containers with path='' (collapsible groups)
INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, departments_allowed, order_index, is_active, parent_id)
VALUES
  (NULL, 'Front Desk', '', 'Home', ARRAY['owner', 'manager', 'frontdesk']::app_role[], '{}', 6, true, NULL),
  (NULL, 'Operations', '', 'Briefcase', ARRAY['owner', 'manager', 'housekeeping', 'maintenance', 'kitchen', 'bar']::app_role[], '{}', 7, true, NULL),
  (NULL, 'QR Services', '', 'QrCode', ARRAY['owner', 'manager', 'frontdesk']::app_role[], '{}', 8, true, NULL),
  (NULL, 'Rooms', '', 'DoorOpen', ARRAY['owner', 'manager', 'frontdesk', 'housekeeping']::app_role[], '{}', 9, true, NULL),
  (NULL, 'Inventory & Stock', '', 'Package', ARRAY['owner', 'manager', 'store_manager']::app_role[], '{}', 11, true, NULL),
  (NULL, 'Staff & Activity', '', 'Users', ARRAY['owner', 'manager']::app_role[], '{}', 12, true, NULL),
  (NULL, 'Administration', '', 'Settings', ARRAY['owner', 'manager']::app_role[], '{}', 13, true, NULL),
  (NULL, 'Reports', '', 'FileText', ARRAY['owner', 'manager', 'finance', 'accountant']::app_role[], '{}', 14, true, NULL)
ON CONFLICT DO NOTHING;

-- Phase 3: Update top-level items order (always visible items)
UPDATE platform_nav_items SET order_index = 1 WHERE name = 'Overview' AND path = '/dashboard' AND parent_id IS NULL;
UPDATE platform_nav_items SET order_index = 2 WHERE name = 'Front Desk Dashboard' AND parent_id IS NULL;
UPDATE platform_nav_items SET order_index = 3 WHERE name = 'Guest Requests' AND path = '/dashboard/guest-requests' AND parent_id IS NULL;
UPDATE platform_nav_items SET order_index = 4 WHERE name = 'Organizations' AND parent_id IS NULL;
UPDATE platform_nav_items SET order_index = 5 WHERE name = 'A/R' AND parent_id IS NULL;

-- Phase 4: Link children to parent groups
-- Front Desk children
UPDATE platform_nav_items SET parent_id = (SELECT id FROM platform_nav_items WHERE name = 'Front Desk' AND path = '' LIMIT 1)
WHERE name IN ('Bookings', 'Guests', 'Room Management', 'Reservations Management', 'QR Billing Tasks')
  AND parent_id IS NULL;

-- Operations children
UPDATE platform_nav_items SET parent_id = (SELECT id FROM platform_nav_items WHERE name = 'Operations' AND path = '' LIMIT 1)
WHERE name IN ('Housekeeping Dashboard', 'Maintenance Dashboard', 'Kitchen Dashboard', 'Bar Dashboard', 'Laundry Management', 'Spa Management', 'Department Requests')
  AND parent_id IS NULL;

-- QR Services children
UPDATE platform_nav_items SET parent_id = (SELECT id FROM platform_nav_items WHERE name = 'QR Services' AND path = '' LIMIT 1)
WHERE name IN ('QR Management', 'QR Analytics', 'QR Printables', 'QR Portal Features', 'QR Portal Theme', 'WiFi Manager', 'Menu Management', 'Quick Reply Templates')
  AND parent_id IS NULL;

-- Rooms children
UPDATE platform_nav_items SET parent_id = (SELECT id FROM platform_nav_items WHERE name = 'Rooms' AND path = '' LIMIT 1)
WHERE name IN ('Room List', 'Room Categories')
  AND parent_id IS NULL;

-- Inventory & Stock children
UPDATE platform_nav_items SET parent_id = (SELECT id FROM platform_nav_items WHERE name = 'Inventory & Stock' AND path = '' LIMIT 1)
WHERE name IN ('Inventory', 'Stock Requests')
  AND parent_id IS NULL;

-- Staff & Activity children
UPDATE platform_nav_items SET parent_id = (SELECT id FROM platform_nav_items WHERE name = 'Staff & Activity' AND path = '' LIMIT 1)
WHERE name IN ('Staff', 'Staff Activity', 'User Roles')
  AND parent_id IS NULL;

-- Administration children
UPDATE platform_nav_items SET parent_id = (SELECT id FROM platform_nav_items WHERE name = 'Administration' AND path = '' LIMIT 1)
WHERE name IN ('Configuration Center')
  AND parent_id IS NULL;

-- Reports children
UPDATE platform_nav_items SET parent_id = (SELECT id FROM platform_nav_items WHERE name = 'Reports' AND path = '' LIMIT 1)
WHERE name IN ('Reports', 'Financial Reports', 'Operational Reports')
  AND parent_id IS NULL;

-- Finance Center - ensure existing children remain linked and add new ones
UPDATE platform_nav_items SET parent_id = (SELECT id FROM platform_nav_items WHERE name = 'Finance Center' AND path = '' LIMIT 1)
WHERE name IN ('Payments', 'Wallets', 'Debtors')
  AND parent_id IS NULL;

-- Phase 5: Set Logout to bottom
UPDATE platform_nav_items SET order_index = 99, parent_id = NULL WHERE name = 'Logout';

-- Add success marker
DO $$
BEGIN
  RAISE NOTICE 'SIDEBAR-NAVIGATION-RESTRUCTURE-V2: Successfully cleaned up duplicates and reorganized navigation hierarchy';
END $$;