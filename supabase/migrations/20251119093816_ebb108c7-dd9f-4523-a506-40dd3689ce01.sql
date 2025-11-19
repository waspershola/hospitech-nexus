-- Add Billing Center to platform navigation (BILLING-CENTER-NAV-V1)
-- Insert Billing Center as a navigation item under Finance Center

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
  'Billing Center',
  '/dashboard/billing',
  'Receipt',
  'fbfdae4c-d422-4b0c-8da8-042a91f69c73', -- Finance Center parent ID
  35,
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;