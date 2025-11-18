-- Fix Night Audit Navigation - Insert into platform_nav_items (global items)
-- Step 1: Delete incorrect Night Audit from navigation_items (tenant-specific)
DELETE FROM navigation_items 
WHERE path = '/dashboard/night-audit';

-- Step 2: Insert Night Audit into platform_nav_items (global items) under Finance Center
-- Only insert if it doesn't already exist
INSERT INTO platform_nav_items (
  name,
  icon,
  path,
  parent_id,
  order_index,
  roles_allowed,
  departments_allowed,
  is_active
)
SELECT 
  'Night Audit',
  'Clock',
  '/dashboard/night-audit',
  'fbfdae4c-d422-4b0c-8da8-042a91f69c73', -- Finance Center parent ID
  40, -- Order after other Finance items
  ARRAY['owner', 'manager']::app_role[],
  ARRAY[]::text[],
  true
WHERE NOT EXISTS (
  SELECT 1 FROM platform_nav_items WHERE path = '/dashboard/night-audit'
);

-- Verification query
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM platform_nav_items WHERE path = '/dashboard/night-audit') THEN
    RAISE NOTICE 'Night Audit successfully added to platform navigation';
  ELSE
    RAISE WARNING 'Night Audit was not added - may already exist';
  END IF;
END $$;