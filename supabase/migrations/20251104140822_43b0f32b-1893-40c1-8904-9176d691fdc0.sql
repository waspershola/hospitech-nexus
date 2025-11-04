-- Fix 1: Add Stock Requests navigation item
INSERT INTO navigation_items (tenant_id, name, path, icon, allowed_roles, order_index, is_active)
VALUES
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Stock Requests', '/dashboard/inventory/requests', 'ClipboardList', 
   ARRAY['housekeeping','maintenance','restaurant','kitchen','bar','supervisor']::app_role[], 22, true)
ON CONFLICT DO NOTHING;

-- Fix 2: Assign front_office department to frontdesk supervisor
UPDATE staff 
SET department = 'front_office' 
WHERE email = 'frontdesk@gmail.com' 
  AND tenant_id = '2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec'
  AND department IS NULL;