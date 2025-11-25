-- Finance Center Navigation - Complete Child Items Structure
-- Version: NAV-FINANCE-CHILDREN-V2
-- Creates 3-level navigation: Finance (parent) → 5 Subgroups → 24 Child Items
-- Fixed: Uses correct app_role enum values (finance, accountant instead of finance_manager, accounting)

-- Step 1: Rename first subgroup from "Overview & Dashboard" to "Finance Center"
UPDATE platform_nav_items
SET name = 'Finance Center'
WHERE tenant_id IS NULL
  AND path = '#finance-main'
  AND parent_id IS NOT NULL
  AND parent_id = (
    SELECT id FROM platform_nav_items 
    WHERE tenant_id IS NULL AND path = '#finance-center' AND parent_id IS NULL
  );

-- Step 2: Get parent IDs for all 5 subgroups (for inserting children)
DO $$
DECLARE
  v_finance_center_id UUID;
  v_billing_setup_id UUID;
  v_org_accounting_id UUID;
  v_financial_logs_id UUID;
  v_finance_settings_id UUID;
BEGIN
  -- Get Finance Center subgroup ID
  SELECT id INTO v_finance_center_id
  FROM platform_nav_items
  WHERE tenant_id IS NULL AND path = '#finance-main' AND parent_id IS NOT NULL;

  -- Get Billing & Revenue Setup subgroup ID
  SELECT id INTO v_billing_setup_id
  FROM platform_nav_items
  WHERE tenant_id IS NULL AND path = '#finance-billing-setup' AND parent_id IS NOT NULL;

  -- Get Organization & Accounting subgroup ID
  SELECT id INTO v_org_accounting_id
  FROM platform_nav_items
  WHERE tenant_id IS NULL AND path = '#finance-org' AND parent_id IS NOT NULL;

  -- Get Financial Logs subgroup ID
  SELECT id INTO v_financial_logs_id
  FROM platform_nav_items
  WHERE tenant_id IS NULL AND path = '#finance-logs' AND parent_id IS NOT NULL;

  -- Get Finance Settings subgroup ID
  SELECT id INTO v_finance_settings_id
  FROM platform_nav_items
  WHERE tenant_id IS NULL AND path = '#finance-settings' AND parent_id IS NOT NULL;

  -- ========== SUBGROUP 1: Finance Center (10 children) ==========
  INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, parent_id, order_index, is_active)
  VALUES
    (NULL, 'Finance Dashboard', '/dashboard/finance-dashboard', 'LayoutDashboard', ARRAY['owner','manager','frontdesk','finance','accountant']::app_role[], v_finance_center_id, 1, true),
    (NULL, 'Folios', '/dashboard/finance-center?tab=folios', 'FileText', ARRAY['owner','manager','frontdesk','finance','accountant']::app_role[], v_finance_center_id, 2, true),
    (NULL, 'Post-Checkout', '/dashboard/finance-center?tab=post-checkout', 'LogOut', ARRAY['owner','manager','frontdesk','finance','accountant']::app_role[], v_finance_center_id, 3, true),
    (NULL, 'Receipts', '/dashboard/finance-center?tab=receipts', 'Receipt', ARRAY['owner','manager','frontdesk','finance','accountant']::app_role[], v_finance_center_id, 4, true),
    (NULL, 'A/R', '/dashboard/finance-center?tab=receivables', 'TrendingUp', ARRAY['owner','manager','finance','accountant']::app_role[], v_finance_center_id, 5, true),
    (NULL, 'Credits', '/dashboard/finance-center?tab=credits', 'CreditCard', ARRAY['owner','manager','finance','accountant']::app_role[], v_finance_center_id, 6, true),
    (NULL, 'Closed Folios', '/dashboard/folios/closed', 'Archive', ARRAY['owner','manager','finance','accountant']::app_role[], v_finance_center_id, 7, true),
    (NULL, 'Night Audit', '/dashboard/night-audit', 'Moon', ARRAY['owner','manager','finance','accountant']::app_role[], v_finance_center_id, 8, true),
    (NULL, 'Reconciliation', '/dashboard/finance-center?tab=reconciliation', 'CheckCircle', ARRAY['owner','manager','finance','accountant']::app_role[], v_finance_center_id, 9, true),
    (NULL, 'Debtors', '/dashboard/debtors', 'AlertCircle', ARRAY['owner','manager','finance','accountant']::app_role[], v_finance_center_id, 10, true)
  ON CONFLICT DO NOTHING;

  -- ========== SUBGROUP 2: Billing & Revenue Setup (6 children) ==========
  INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, parent_id, order_index, is_active)
  VALUES
    (NULL, 'Payment Methods', '/dashboard/finance-center?tab=payment-methods', 'CreditCard', ARRAY['owner','manager','finance']::app_role[], v_billing_setup_id, 1, true),
    (NULL, 'Providers', '/dashboard/finance-center?tab=providers', 'Building', ARRAY['owner','manager','finance']::app_role[], v_billing_setup_id, 2, true),
    (NULL, 'Locations', '/dashboard/finance-center?tab=locations', 'MapPin', ARRAY['owner','manager','finance']::app_role[], v_billing_setup_id, 3, true),
    (NULL, 'Rules', '/dashboard/finance-center?tab=rules', 'Settings', ARRAY['owner','manager','finance']::app_role[], v_billing_setup_id, 4, true),
    (NULL, 'Wallets', '/dashboard/finance-center?tab=wallets', 'Wallet', ARRAY['owner','manager','finance','accountant']::app_role[], v_billing_setup_id, 5, true),
    (NULL, 'Platform Fees', '/dashboard/finance-center?tab=platform-fees', 'Percent', ARRAY['owner','manager','finance']::app_role[], v_billing_setup_id, 6, true)
  ON CONFLICT DO NOTHING;

  -- ========== SUBGROUP 3: Organization & Accounting (4 children) ==========
  INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, parent_id, order_index, is_active)
  VALUES
    (NULL, 'Organizations', '/dashboard/finance-center?tab=organizations', 'Building2', ARRAY['owner','manager','finance','accountant']::app_role[], v_org_accounting_id, 1, true),
    (NULL, 'Analytics', '/dashboard/finance-center?tab=analytics', 'BarChart', ARRAY['owner','manager','finance','accountant']::app_role[], v_org_accounting_id, 2, true),
    (NULL, 'Org Analytics', '/dashboard/finance-center?tab=org-analytics', 'PieChart', ARRAY['owner','manager','finance','accountant']::app_role[], v_org_accounting_id, 3, true),
    (NULL, 'Finance Reports', '/dashboard/finance-center?tab=reports', 'FileText', ARRAY['owner','manager','finance','accountant']::app_role[], v_org_accounting_id, 4, true)
  ON CONFLICT DO NOTHING;

  -- ========== SUBGROUP 4: Financial Logs (2 children) ==========
  INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, parent_id, order_index, is_active)
  VALUES
    (NULL, 'Logs', '/dashboard/finance-center?tab=receipt-logs', 'List', ARRAY['owner','manager','finance','accountant']::app_role[], v_financial_logs_id, 1, true),
    (NULL, 'Audit Trail', '/dashboard/finance-center?tab=audit', 'Shield', ARRAY['owner','manager','finance','accountant']::app_role[], v_financial_logs_id, 2, true)
  ON CONFLICT DO NOTHING;

  -- ========== SUBGROUP 5: Finance Settings (2 children) ==========
  INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, parent_id, order_index, is_active)
  VALUES
    (NULL, 'Settings', '/dashboard/finance-center?tab=settings', 'Settings', ARRAY['owner','manager','finance']::app_role[], v_finance_settings_id, 1, true),
    (NULL, 'Preferences', '/dashboard/finance-center?tab=preferences', 'Sliders', ARRAY['owner','manager','finance']::app_role[], v_finance_settings_id, 2, true)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'NAV-FINANCE-CHILDREN-V2: Complete 3-level Finance navigation structure created';
  RAISE NOTICE 'Finance Center: 10 children added';
  RAISE NOTICE 'Billing & Revenue Setup: 6 children added';
  RAISE NOTICE 'Organization & Accounting: 4 children added';
  RAISE NOTICE 'Financial Logs: 2 children added';
  RAISE NOTICE 'Finance Settings: 2 children added';
  RAISE NOTICE 'Total: 24 child navigation items under 5 Finance subgroups';
END $$;