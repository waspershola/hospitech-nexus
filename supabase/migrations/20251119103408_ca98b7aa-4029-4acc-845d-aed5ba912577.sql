-- Fix Billing Center navigation roles
UPDATE platform_nav_items
SET roles_allowed = ARRAY['owner', 'manager', 'finance', 'accountant']::text[]
WHERE id = 'd32d5be4-934d-4ebf-9fb6-16074f64f0cd'; -- Billing Center