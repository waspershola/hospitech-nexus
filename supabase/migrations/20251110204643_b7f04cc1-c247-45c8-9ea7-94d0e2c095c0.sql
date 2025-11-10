-- Add navigation items for new management dashboards

INSERT INTO platform_nav_items (
  name, 
  path, 
  icon, 
  order_index, 
  roles_allowed, 
  departments_allowed, 
  is_active, 
  tenant_id
)
VALUES 
  (
    'Reservations Management', 
    '/dashboard/reservations-management', 
    'CalendarClock', 
    16, 
    ARRAY['owner', 'manager', 'restaurant', 'kitchen', 'frontdesk']::text[], 
    ARRAY['restaurant', 'kitchen', 'front_office', 'management']::text[], 
    true, 
    NULL
  ),
  (
    'Laundry Management', 
    '/dashboard/laundry-management', 
    'Shirt', 
    17, 
    ARRAY['owner', 'manager', 'housekeeping']::text[], 
    ARRAY['housekeeping', 'laundry', 'management']::text[], 
    true, 
    NULL
  ),
  (
    'Spa Management', 
    '/dashboard/spa-management', 
    'Sparkles', 
    18, 
    ARRAY['owner', 'manager', 'spa']::text[], 
    ARRAY['spa', 'management']::text[], 
    true, 
    NULL
  );