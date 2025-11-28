-- Add Finance Navigation Items (Ledger, Cash Drawer, POS Reconciliation)
-- Version: NAV-FINANCE-V1

-- 1. Accounting Ledger
INSERT INTO platform_nav_items (
  name,
  path,
  icon,
  parent_id,
  order_index,
  roles_allowed,
  tenant_id
)
SELECT 
  'Accounting Ledger',
  '/dashboard/finance/ledger',
  'BookOpen',
  id,
  10,
  ARRAY['owner', 'manager', 'finance', 'accountant']::text[],
  NULL
FROM platform_nav_items 
WHERE name = 'Finance' AND parent_id IS NULL AND tenant_id IS NULL
ON CONFLICT DO NOTHING;

-- 2. Cash Drawer
INSERT INTO platform_nav_items (
  name,
  path,
  icon,
  parent_id,
  order_index,
  roles_allowed,
  tenant_id
)
SELECT 
  'Cash Drawer',
  '/dashboard/finance/cash-drawer',
  'DollarSign',
  id,
  11,
  ARRAY['owner', 'manager', 'finance', 'accountant', 'frontdesk']::text[],
  NULL
FROM platform_nav_items 
WHERE name = 'Finance' AND parent_id IS NULL AND tenant_id IS NULL
ON CONFLICT DO NOTHING;

-- 3. POS Reconciliation
INSERT INTO platform_nav_items (
  name,
  path,
  icon,
  parent_id,
  order_index,
  roles_allowed,
  tenant_id
)
SELECT 
  'POS Reconciliation',
  '/dashboard/finance/pos-reconciliation',
  'FileCheck',
  id,
  12,
  ARRAY['owner', 'manager', 'finance', 'accountant']::text[],
  NULL
FROM platform_nav_items 
WHERE name = 'Finance' AND parent_id IS NULL AND tenant_id IS NULL
ON CONFLICT DO NOTHING;