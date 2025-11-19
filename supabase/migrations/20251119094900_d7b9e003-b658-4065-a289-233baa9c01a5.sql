-- Add Closed Folios navigation item (CLOSED-FOLIOS-NAV-V1)
-- Insert Closed Folios as a navigation item under Finance Center

INSERT INTO platform_nav_items (
  id,
  name,
  path,
  icon,
  parent_id,
  order_index,
  is_active,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'Closed Folios',
  '/dashboard/folios/closed',
  'Archive',
  'fbfdae4c-d422-4b0c-8da8-042a91f69c73', -- Finance Center parent ID
  36,
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;