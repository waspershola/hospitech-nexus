-- Add QR Portal navigation items to platform_nav_items table

-- Insert QR Management navigation item (for owners and managers)
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
  'QR Portal' as name,
  '/qr-management' as path,
  'QrCode' as icon,
  ARRAY['owner', 'manager']::text[] as roles_allowed,
  ARRAY[]::text[] as departments_allowed,
  50 as order_index,
  true as is_active
FROM tenants
WHERE deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- Insert Guest Requests navigation item (for staff handling requests)
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
  'Guest Requests' as name,
  '/guest-requests' as path,
  'MessageSquare' as icon,
  ARRAY['owner', 'manager', 'frontdesk', 'housekeeping', 'maintenance', 'kitchen', 'bar']::text[] as roles_allowed,
  ARRAY[]::text[] as departments_allowed,
  51 as order_index,
  true as is_active
FROM tenants
WHERE deleted_at IS NULL
ON CONFLICT DO NOTHING;