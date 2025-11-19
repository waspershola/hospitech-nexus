-- Add Group Billing Center navigation item to platform_nav_items
-- This makes Group Billing accessible from the sidebar under Finance section

INSERT INTO platform_nav_items (id, name, path, icon, parent_id, order_index, roles_allowed, is_active)
VALUES (
  'e5f8a9c1-4d2e-4b6f-8a1c-9d3e7f2a4b5c',
  'Group Billing',
  '/dashboard/group-billing',
  'Users',
  'fbfdae4c-d422-4b0c-8da8-042a91f69c73', -- Finance Center parent ID
  3,
  ARRAY['platform_admin', 'admin', 'manager', 'receptionist'],
  true
)
ON CONFLICT (id) DO NOTHING;