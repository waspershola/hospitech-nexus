-- Add Night Audit to navigation menu
-- This migration inserts Night Audit as a standalone menu item under the Finance parent

INSERT INTO navigation_items (
  name,
  icon,
  path,
  parent_id,
  order_index,
  tenant_id,
  allowed_roles,
  is_active
)
SELECT 
  'Night Audit',
  'Clock',
  '/dashboard/night-audit',
  fi.id,
  (SELECT COALESCE(MAX(order_index), 0) + 10 FROM navigation_items WHERE parent_id = fi.id AND tenant_id = fi.tenant_id),
  fi.tenant_id,
  fi.allowed_roles, -- Inherit roles from Finance parent
  true
FROM navigation_items fi
WHERE fi.path = '/dashboard/finance-center'
  AND fi.tenant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM navigation_items 
    WHERE path = '/dashboard/night-audit' 
    AND tenant_id = fi.tenant_id
  );

-- Add comment
COMMENT ON TABLE navigation_items IS 'Navigation menu items with hierarchy and role-based access control. Night Audit added as standalone Finance section item.';