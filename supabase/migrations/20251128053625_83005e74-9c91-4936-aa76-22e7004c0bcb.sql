-- Add Accounting Ledger and Cash Drawer to Finance navigation
-- Version: LEDGER-NAV-INTEGRATION-V2

-- First, find the Finance parent group
DO $$
DECLARE
  v_finance_parent_id UUID;
BEGIN
  -- Get Finance parent group ID
  SELECT id INTO v_finance_parent_id
  FROM navigation_items
  WHERE name = 'Finance'
    AND parent_id IS NULL
  LIMIT 1;

  IF v_finance_parent_id IS NULL THEN
    RAISE NOTICE '[LEDGER-NAV-V2] Finance parent group not found, skipping';
    RETURN;
  END IF;

  -- Insert Accounting Ledger if it doesn't exist
  INSERT INTO navigation_items (
    tenant_id,
    parent_id,
    name,
    path,
    icon,
    description,
    order_index,
    allowed_roles,
    is_active
  )
  SELECT
    (SELECT id FROM tenants LIMIT 1), -- Use first tenant as template
    v_finance_parent_id,
    'Accounting Ledger',
    '/dashboard/finance/ledger',
    'Book',
    'Complete financial transaction history and reporting',
    105,
    ARRAY['owner', 'manager', 'accountant']::app_role[],
    true
  WHERE NOT EXISTS (
    SELECT 1 FROM navigation_items
    WHERE path = '/dashboard/finance/ledger'
  );

  -- Insert Cash Drawer if it doesn't exist
  INSERT INTO navigation_items (
    tenant_id,
    parent_id,
    name,
    path,
    icon,
    description,
    order_index,
    allowed_roles,
    is_active
  )
  SELECT
    (SELECT id FROM tenants LIMIT 1),
    v_finance_parent_id,
    'Cash Drawer',
    '/dashboard/finance/cash-drawer',
    'Wallet',
    'Track cash drawer operations and reconciliation',
    106,
    ARRAY['owner', 'manager', 'accountant', 'frontdesk']::app_role[],
    true
  WHERE NOT EXISTS (
    SELECT 1 FROM navigation_items
    WHERE path = '/dashboard/finance/cash-drawer'
  );

  RAISE NOTICE '[LEDGER-NAV-V2] Successfully added Accounting Ledger and Cash Drawer navigation items';
END $$;