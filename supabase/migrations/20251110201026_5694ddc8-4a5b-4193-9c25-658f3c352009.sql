-- Add Department Requests navigation item to unified platform navigation system
DO $$
BEGIN
  -- Only insert if this path doesn't already exist as a global item
  IF NOT EXISTS (
    SELECT 1 FROM platform_nav_items 
    WHERE tenant_id IS NULL 
    AND path = '/dashboard/department-requests'
  ) THEN
    INSERT INTO platform_nav_items (
      tenant_id,
      name,
      path,
      icon,
      roles_allowed,
      departments_allowed,
      order_index,
      is_active
    )
    VALUES (
      NULL, -- Global navigation item
      'Department Requests',
      '/dashboard/department-requests',
      'ClipboardList',
      ARRAY['owner', 'manager', 'frontdesk', 'supervisor', 'housekeeping', 'maintenance', 'restaurant', 'kitchen', 'bar', 'spa', 'concierge', 'finance']::text[],
      ARRAY[]::text[], -- Empty = visible to all departments
      16, -- After Inventory
      true
    );
  END IF;
END $$;