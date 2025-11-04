-- Update navigation path from /dashboard/inventory/requests to /dashboard/stock-requests
UPDATE navigation_items 
SET path = '/dashboard/stock-requests',
    name = 'Stock Requests'
WHERE path = '/dashboard/inventory/requests' 
  AND tenant_id = '2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec';