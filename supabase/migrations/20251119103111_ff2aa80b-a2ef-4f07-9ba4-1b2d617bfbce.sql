-- Fix navigation roles for Finance Center children
-- Use proper tenant roles: owner, manager, finance, accountant

UPDATE platform_nav_items
SET roles_allowed = ARRAY['owner', 'manager', 'finance', 'accountant']::text[]
WHERE id = '10ebc19a-ade4-40cf-bce2-98647384dace'; -- Closed Folios

UPDATE platform_nav_items
SET roles_allowed = ARRAY['owner', 'manager']::text[]
WHERE id = '5564ea65-feff-41b3-af55-01921959df30'; -- Audit Trail

UPDATE platform_nav_items
SET roles_allowed = ARRAY['owner', 'manager', 'finance', 'accountant']::text[]
WHERE id = '95c3596c-a58b-4914-beee-f7fcfc445b72'; -- Finance Reports