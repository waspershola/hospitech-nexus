-- Add Quick Reply Templates navigation item under QR Settings
INSERT INTO platform_nav_items (
  name,
  path,
  icon,
  parent_id,
  roles_allowed,
  order_index,
  is_active
) 
SELECT 
  'Quick Reply Templates',
  '/dashboard/quick-reply-templates',
  'Zap',
  (SELECT id FROM platform_nav_items WHERE name = 'QR Settings' AND parent_id IS NULL LIMIT 1),
  ARRAY['owner', 'manager']::text[],
  85,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM platform_nav_items 
  WHERE path = '/dashboard/quick-reply-templates'
);