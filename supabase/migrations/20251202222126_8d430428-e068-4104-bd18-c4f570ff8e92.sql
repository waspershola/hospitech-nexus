-- Add Offline Diagnostics to Administration section
INSERT INTO platform_nav_items (name, path, icon, roles_allowed, departments_allowed, order_index, is_active, parent_id)
SELECT 
  'Offline Diagnostics',
  '/dashboard/offline-diagnostics',
  'WifiOff',
  ARRAY['owner', 'manager']::text[],
  ARRAY[]::text[],
  99,
  true,
  id
FROM platform_nav_items
WHERE name = 'Administration' AND parent_id IS NULL
ON CONFLICT DO NOTHING;