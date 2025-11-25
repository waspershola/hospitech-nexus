-- Add AI Module navigation items to platform_nav_items
-- AI Module parent group under Administration
INSERT INTO platform_nav_items (
  name,
  path,
  icon,
  roles_allowed,
  departments_allowed,
  order_index,
  parent_id,
  is_active
)
SELECT
  'AI Module',
  '#ai-module',
  'Bot',
  ARRAY['owner', 'manager']::app_role[],
  NULL,
  1,
  id,
  true
FROM platform_nav_items
WHERE name = 'Administration' AND path = '#administration'
ON CONFLICT DO NOTHING;

-- FAQ Management
INSERT INTO platform_nav_items (
  name,
  path,
  icon,
  roles_allowed,
  departments_allowed,
  order_index,
  parent_id,
  is_active
)
SELECT
  'FAQ Management',
  '/dashboard/faq-management',
  'MessageCircleQuestion',
  ARRAY['owner', 'manager']::app_role[],
  NULL,
  1,
  id,
  true
FROM platform_nav_items
WHERE name = 'AI Module' AND path = '#ai-module'
ON CONFLICT DO NOTHING;

-- SOP Knowledge Base
INSERT INTO platform_nav_items (
  name,
  path,
  icon,
  roles_allowed,
  departments_allowed,
  order_index,
  parent_id,
  is_active
)
SELECT
  'SOP Knowledge Base',
  '/dashboard/sop-management',
  'BookOpen',
  ARRAY['owner', 'manager']::app_role[],
  NULL,
  2,
  id,
  true
FROM platform_nav_items
WHERE name = 'AI Module' AND path = '#ai-module'
ON CONFLICT DO NOTHING;