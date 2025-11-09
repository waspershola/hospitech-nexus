-- Add Database Cleanup navigation item for platform admins
INSERT INTO platform_navigation_items (label, path, icon, parent_id, allowed_roles, order_index, is_active, tenant_id)
VALUES (
  'Database Cleanup',
  '/dashboard/platform?tab=cleanup',
  'Database',
  NULL,
  ARRAY['super_admin']::text[],
  999,
  true,
  NULL
)
ON CONFLICT DO NOTHING;