-- Insert Platform Dashboard navigation item (only if it doesn't exist)
INSERT INTO platform_nav_items (
  tenant_id,
  name,
  path,
  icon,
  roles_allowed,
  departments_allowed,
  order_index,
  is_active
)
SELECT
  NULL,
  'Platform Dashboard',
  '/dashboard/platform-admin',
  'Server',
  ARRAY['super_admin', 'admin', 'support_admin']::text[],
  ARRAY[]::text[],
  1,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM platform_nav_items
  WHERE path = '/dashboard/platform-admin'
  AND tenant_id IS NULL
);

-- Update Platform Billing roles
UPDATE platform_nav_items
SET roles_allowed = ARRAY['super_admin', 'admin', 'billing_admin', 'support_admin']::text[]
WHERE path = '/dashboard/platform-billing'
AND tenant_id IS NULL;