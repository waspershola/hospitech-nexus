-- Update existing Overview navigation items to include kitchen role
UPDATE navigation_items 
SET allowed_roles = array_append(allowed_roles, 'kitchen'::app_role)
WHERE tenant_id = '2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec' 
  AND name = 'Overview' 
  AND path = '/dashboard'
  AND NOT (allowed_roles @> ARRAY['kitchen']::app_role[]);

-- Remove duplicate Overview items for kitchen (from earlier migration)
DELETE FROM navigation_items
WHERE tenant_id = '2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec'
  AND name = 'Overview'
  AND path = '/dashboard'
  AND allowed_roles = ARRAY['kitchen']::app_role[];