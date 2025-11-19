-- Remove duplicate Billing Center nav item since Closed Folios already exists
DELETE FROM platform_nav_items
WHERE id = 'd32d5be4-934d-4ebf-9fb6-16074f64f0cd'; -- Billing Center (duplicate)