-- Migration: Redesign Navigation Structure (Fixed)
-- Fix Overview route and reorganize sidebar navigation into new parent groups

-- Step 1: Fix Overview path from /dashboard/overview to /dashboard
UPDATE platform_nav_items 
SET path = '/dashboard' 
WHERE name = 'Overview' AND path = '/dashboard/overview';

-- Step 2: Create parent group navigation items
-- These are container groups with no direct routes

INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, departments_allowed, parent_id, order_index, is_active)
VALUES 
  -- Front Desk parent group (order 6)
  (NULL, 'Front Desk', '', 'Home', ARRAY['owner', 'manager', 'frontdesk']::text[], ARRAY[]::text[], NULL, 6, true),
  
  -- Operations parent group (order 7)
  (NULL, 'Operations', '', 'Briefcase', ARRAY['owner', 'manager', 'housekeeping', 'maintenance', 'kitchen', 'bar']::text[], ARRAY[]::text[], NULL, 7, true),
  
  -- QR Services parent group (order 8)
  (NULL, 'QR Services', '', 'QrCode', ARRAY['owner', 'manager', 'frontdesk']::text[], ARRAY[]::text[], NULL, 8, true),
  
  -- Rooms parent group (order 9)
  (NULL, 'Rooms', '', 'DoorOpen', ARRAY['owner', 'manager', 'frontdesk']::text[], ARRAY[]::text[], NULL, 9, true),
  
  -- Inventory & Stock parent group (order 11)
  (NULL, 'Inventory & Stock', '', 'Package', ARRAY['owner', 'manager', 'store_manager']::text[], ARRAY[]::text[], NULL, 11, true),
  
  -- Staff & Activity parent group (order 12)
  (NULL, 'Staff & Activity', '', 'Users', ARRAY['owner', 'manager']::text[], ARRAY[]::text[], NULL, 12, true),
  
  -- Administration parent group (order 13)
  (NULL, 'Administration', '', 'Settings', ARRAY['owner', 'manager']::text[], ARRAY[]::text[], NULL, 13, true),
  
  -- Reports parent group (order 14)
  (NULL, 'Reports', '', 'FileText', ARRAY['owner', 'manager', 'finance', 'accountant']::text[], ARRAY[]::text[], NULL, 14, true)
ON CONFLICT DO NOTHING;

-- Step 3: Update top-level items to have correct order (1-5, no parent)
UPDATE platform_nav_items SET order_index = 1, parent_id = NULL WHERE name = 'Overview';
UPDATE platform_nav_items SET order_index = 2, parent_id = NULL WHERE name = 'Front Desk Dashboard' OR path = '/dashboard/front-desk';
UPDATE platform_nav_items SET order_index = 3, parent_id = NULL WHERE name IN ('Guest Requests', 'QR Guest Requests');
UPDATE platform_nav_items SET order_index = 4, parent_id = NULL WHERE name = 'Organizations';

-- Add A/R as top-level item if it doesn't exist
INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, departments_allowed, parent_id, order_index, is_active)
VALUES (NULL, 'A/R', '/dashboard/finance-center?tab=receivables', 'Receipt', ARRAY['owner', 'manager', 'finance', 'accountant']::text[], ARRAY[]::text[], NULL, 5, true)
ON CONFLICT DO NOTHING;

-- Step 4: Reorganize existing items under new parent groups

-- Front Desk group children
UPDATE platform_nav_items 
SET parent_id = (SELECT id FROM platform_nav_items WHERE name = 'Front Desk' AND parent_id IS NULL LIMIT 1),
    order_index = 5
WHERE name = 'QR Billing Tasks';

-- Operations group children  
UPDATE platform_nav_items 
SET parent_id = (SELECT id FROM platform_nav_items WHERE name = 'Operations' AND parent_id IS NULL LIMIT 1)
WHERE name IN ('Department Requests');

-- QR Services group children
UPDATE platform_nav_items 
SET parent_id = (SELECT id FROM platform_nav_items WHERE name = 'QR Services' AND parent_id IS NULL LIMIT 1)
WHERE name LIKE 'QR%' AND name NOT IN ('QR Billing Tasks', 'QR Services');

-- Finance Center remains as is (already has children)
UPDATE platform_nav_items SET order_index = 10 WHERE name = 'Finance Center' AND parent_id IS NULL;

-- Staff & Activity group children
UPDATE platform_nav_items 
SET parent_id = (SELECT id FROM platform_nav_items WHERE name = 'Staff & Activity' AND parent_id IS NULL LIMIT 1)
WHERE name IN ('Staff');

-- Step 5: Ensure Logout stays at bottom
UPDATE platform_nav_items SET order_index = 99, parent_id = NULL WHERE name = 'Logout';

-- Success
SELECT 'Navigation structure redesigned successfully' as message;