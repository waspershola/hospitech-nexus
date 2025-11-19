-- Add new navigation items for Phase 6 & 7 features
-- Marker: NAV-PHASE-6-7-ITEMS

-- Add Closed Folios navigation item under Finance Center
INSERT INTO platform_nav_items (
  id,
  name,
  path,
  icon,
  parent_id,
  order_index,
  roles_allowed,
  departments_allowed,
  is_active
) VALUES (
  gen_random_uuid(),
  'Closed Folios',
  '/dashboard/folios/closed',
  'Archive',
  'fbfdae4c-d422-4b0c-8da8-042a91f69c73', -- Finance Center parent ID
  8,
  ARRAY['admin', 'manager', 'finance']::app_role[],
  ARRAY[]::text[],
  true
) ON CONFLICT DO NOTHING;

-- Add Audit Trail navigation item under Finance Center
INSERT INTO platform_nav_items (
  id,
  name,
  path,
  icon,
  parent_id,
  order_index,
  roles_allowed,
  departments_allowed,
  is_active
) VALUES (
  gen_random_uuid(),
  'Audit Trail',
  '/dashboard/audit',
  'FileSearch',
  'fbfdae4c-d422-4b0c-8da8-042a91f69c73', -- Finance Center parent ID
  9,
  ARRAY['admin', 'manager']::app_role[],
  ARRAY[]::text[],
  true
) ON CONFLICT DO NOTHING;

-- Add Finance Reports navigation item under Finance Center
INSERT INTO platform_nav_items (
  id,
  name,
  path,
  icon,
  parent_id,
  order_index,
  roles_allowed,
  departments_allowed,
  is_active
) VALUES (
  gen_random_uuid(),
  'Finance Reports',
  '/dashboard/finance/reports',
  'BarChart3',
  'fbfdae4c-d422-4b0c-8da8-042a91f69c73', -- Finance Center parent ID
  10,
  ARRAY['admin', 'manager', 'finance']::app_role[],
  ARRAY[]::text[],
  true
) ON CONFLICT DO NOTHING;