-- Add Finance Navigation Items (Ledger, Cash Drawer, POS Reconciliation)
-- Version: NAV-FINANCE-V2-CORRECT-PARENTS

-- Get parent group IDs for proper hierarchy
DO $$
DECLARE
  v_finance_logs_id UUID;
  v_org_accounting_id UUID;
BEGIN
  -- Get Financial Logs subgroup ID
  SELECT id INTO v_finance_logs_id
  FROM platform_nav_items
  WHERE name = 'Financial Logs' 
    AND tenant_id IS NULL
    AND parent_id = (SELECT id FROM platform_nav_items WHERE name = 'Finance Center' AND parent_id IS NULL AND tenant_id IS NULL)
  LIMIT 1;

  -- Get Organization & Accounting subgroup ID
  SELECT id INTO v_org_accounting_id
  FROM platform_nav_items
  WHERE name = 'Organization & Accounting'
    AND tenant_id IS NULL
    AND parent_id = (SELECT id FROM platform_nav_items WHERE name = 'Finance Center' AND parent_id IS NULL AND tenant_id IS NULL)
  LIMIT 1;

  -- 1. Accounting Ledger (under Organization & Accounting)
  INSERT INTO platform_nav_items (
    name,
    path,
    icon,
    parent_id,
    order_index,
    roles_allowed,
    tenant_id
  ) VALUES (
    'Accounting Ledger',
    '/dashboard/finance/ledger',
    'BookOpen',
    v_org_accounting_id,
    1,
    ARRAY['owner', 'manager', 'finance', 'accountant']::text[],
    NULL
  )
  ON CONFLICT DO NOTHING;

  -- 2. Cash Drawer (under Financial Logs)
  INSERT INTO platform_nav_items (
    name,
    path,
    icon,
    parent_id,
    order_index,
    roles_allowed,
    tenant_id
  ) VALUES (
    'Cash Drawer',
    '/dashboard/finance/cash-drawer',
    'DollarSign',
    v_finance_logs_id,
    1,
    ARRAY['owner', 'manager', 'finance', 'accountant', 'frontdesk']::text[],
    NULL
  )
  ON CONFLICT DO NOTHING;

  -- 3. POS Reconciliation (under Financial Logs)
  INSERT INTO platform_nav_items (
    name,
    path,
    icon,
    parent_id,
    order_index,
    roles_allowed,
    tenant_id
  ) VALUES (
    'POS Reconciliation',
    '/dashboard/finance/pos-reconciliation',
    'FileCheck',
    v_finance_logs_id,
    2,
    ARRAY['owner', 'manager', 'finance', 'accountant']::text[],
    NULL
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Finance navigation items added successfully under correct parent groups';
END $$;