-- Add QR Billing Tasks navigation item for all tenants
-- Phase C: Notifications & Separate Batch

INSERT INTO navigation_items (
  tenant_id,
  name,
  path,
  icon,
  order_index,
  parent_id,
  allowed_roles,
  allowed_departments,
  is_active
)
SELECT 
  t.id as tenant_id,
  'QR Billing Tasks' as name,
  '/dashboard/qr-billing-tasks' as path,
  'Receipt' as icon,
  65 as order_index,
  NULL as parent_id,
  ARRAY['owner', 'manager', 'frontdesk', 'finance']::app_role[] as allowed_roles,
  ARRAY['frontdesk', 'finance', 'management']::text[] as allowed_departments,
  true as is_active
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM navigation_items ni
  WHERE ni.tenant_id = t.id
  AND ni.path = '/dashboard/qr-billing-tasks'
);