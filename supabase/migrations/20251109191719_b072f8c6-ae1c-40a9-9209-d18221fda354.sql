-- Add QR Printables navigation item to platform_nav_items table

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
  id as tenant_id,
  'QR Printables' as name,
  '/qr-printables' as path,
  'FileText' as icon,
  ARRAY['owner', 'manager']::text[] as roles_allowed,
  ARRAY[]::text[] as departments_allowed,
  53 as order_index,
  true as is_active
FROM tenants
WHERE deleted_at IS NULL
ON CONFLICT DO NOTHING;