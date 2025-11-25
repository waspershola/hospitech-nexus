-- ============================================================
-- FINAL NAVIGATION RESTRUCTURE + SIDEBAR BEHAVIOR UPGRADE
-- Version: FINAL-NAV-RESTRUCTURE-V2
-- ============================================================

-- ========================================
-- STEP 1: Move "Front Desk Dashboard" to Top Level Position 2
-- ========================================

-- First, ensure "Front Desk Dashboard" exists and is top-level
UPDATE platform_nav_items
SET 
  parent_id = NULL,
  order_index = 2,
  path = '/dashboard/front-desk'
WHERE name = 'Front Desk Dashboard'
  AND tenant_id IS NULL;

-- If it doesn't exist, create it
INSERT INTO platform_nav_items (tenant_id, name, path, icon, parent_id, order_index, is_active, roles_allowed, departments_allowed)
SELECT 
  NULL, 
  'Front Desk Dashboard', 
  '/dashboard/front-desk', 
  'LayoutGrid', 
  NULL, 
  2, 
  true,
  ARRAY['owner', 'manager', 'frontdesk', 'supervisor']::app_role[],
  ARRAY['front_desk', 'management']
WHERE NOT EXISTS (
  SELECT 1 FROM platform_nav_items 
  WHERE name = 'Front Desk Dashboard' AND tenant_id IS NULL
);

-- ========================================
-- STEP 2: Re-link Children to Correct Parents
-- ========================================

DO $$
DECLARE
  v_front_desk_id UUID;
  v_operations_id UUID;
  v_qr_services_id UUID;
  v_rooms_id UUID;
  v_finance_id UUID;
  v_inventory_id UUID;
  v_staff_id UUID;
  v_admin_id UUID;
  v_reports_id UUID;
BEGIN
  -- Get parent container IDs
  SELECT id INTO v_front_desk_id FROM platform_nav_items WHERE name = 'Front Desk' AND path = '#front-desk' AND tenant_id IS NULL;
  SELECT id INTO v_operations_id FROM platform_nav_items WHERE name = 'Operations' AND path = '#operations' AND tenant_id IS NULL;
  SELECT id INTO v_qr_services_id FROM platform_nav_items WHERE name = 'QR Services' AND path = '#qr-services' AND tenant_id IS NULL;
  SELECT id INTO v_rooms_id FROM platform_nav_items WHERE name = 'Rooms' AND path = '#rooms' AND tenant_id IS NULL;
  SELECT id INTO v_finance_id FROM platform_nav_items WHERE name = 'Finance Center' AND path = '#finance-center' AND tenant_id IS NULL;
  SELECT id INTO v_inventory_id FROM platform_nav_items WHERE name = 'Inventory & Stock' AND path = '#inventory-stock' AND tenant_id IS NULL;
  SELECT id INTO v_staff_id FROM platform_nav_items WHERE name = 'Staff & Activity' AND path = '#staff-activity' AND tenant_id IS NULL;
  SELECT id INTO v_admin_id FROM platform_nav_items WHERE name = 'Administration' AND path = '#administration' AND tenant_id IS NULL;
  SELECT id INTO v_reports_id FROM platform_nav_items WHERE name = 'Reports' AND path = '#reports' AND tenant_id IS NULL;

  -- Front Desk children
  UPDATE platform_nav_items SET parent_id = v_front_desk_id, order_index = 1 WHERE name = 'Bookings' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_front_desk_id, order_index = 2 WHERE name = 'Guests' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_front_desk_id, order_index = 3 WHERE name = 'Reservations Management' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_front_desk_id, order_index = 4 WHERE name = 'QR Billing Tasks' AND tenant_id IS NULL;

  -- Operations children
  UPDATE platform_nav_items SET parent_id = v_operations_id, order_index = 1 WHERE name = 'Housekeeping Dashboard' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_operations_id, order_index = 2 WHERE name = 'Maintenance Dashboard' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_operations_id, order_index = 3 WHERE name = 'Kitchen Dashboard' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_operations_id, order_index = 4 WHERE name = 'Bar Dashboard' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_operations_id, order_index = 5 WHERE name = 'Laundry Management' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_operations_id, order_index = 6 WHERE name = 'Spa Management' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_operations_id, order_index = 7 WHERE name = 'Department Requests' AND tenant_id IS NULL;

  -- Rooms children
  UPDATE platform_nav_items SET parent_id = v_rooms_id, order_index = 1 WHERE name = 'Room List' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_rooms_id, order_index = 2 WHERE name = 'Room Categories' AND tenant_id IS NULL;

  -- Staff & Activity children
  UPDATE platform_nav_items SET parent_id = v_staff_id, order_index = 1 WHERE name = 'Staff' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_staff_id, order_index = 2 WHERE name = 'Staff Activity' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_staff_id, order_index = 3 WHERE name IN ('Roles & Permissions', 'Permissions') AND tenant_id IS NULL;

  -- Administration children
  UPDATE platform_nav_items SET parent_id = v_admin_id, order_index = 1 WHERE name = 'General' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_admin_id, order_index = 2 WHERE name IN ('Branding & Theme', 'Branding') AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_admin_id, order_index = 3 WHERE name = 'Hotel Profile' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_admin_id, order_index = 4 WHERE name = 'Domains' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_admin_id, order_index = 5 WHERE name = 'Notifications' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_admin_id, order_index = 6 WHERE name = 'Documents' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_admin_id, order_index = 7 WHERE name = 'Guest Experience' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_admin_id, order_index = 8 WHERE name = 'Checkout Policy' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_admin_id, order_index = 10 WHERE name = 'Audit Logs' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_admin_id, order_index = 11 WHERE name = 'Email Settings' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_admin_id, order_index = 12 WHERE name = 'SMS Notifications' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_admin_id, order_index = 13 WHERE name = 'Maintenance' AND tenant_id IS NULL;

  -- Reports children
  UPDATE platform_nav_items SET parent_id = v_reports_id, order_index = 1 WHERE name = 'Reports Dashboard' AND tenant_id IS NULL;

END $$;

-- ========================================
-- STEP 3: Add Logout Item
-- ========================================

INSERT INTO platform_nav_items (tenant_id, name, path, icon, parent_id, order_index, is_active, roles_allowed, departments_allowed)
SELECT 
  NULL, 
  'Logout', 
  '/auth/logout', 
  'LogOut', 
  NULL, 
  99, 
  true,
  ARRAY['owner', 'manager', 'frontdesk', 'supervisor', 'housekeeping', 'maintenance', 'kitchen', 'bar', 'finance', 'accountant']::app_role[],
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM platform_nav_items 
  WHERE name = 'Logout' AND tenant_id IS NULL
);

-- ========================================
-- STEP 4: Finance 5-Subgroup Structure
-- ========================================

DO $$
DECLARE
  v_finance_id UUID;
  v_finance_center_id UUID;
  v_billing_setup_id UUID;
  v_org_accounting_id UUID;
  v_financial_logs_id UUID;
  v_finance_settings_id UUID;
BEGIN
  -- Get Finance parent ID
  SELECT id INTO v_finance_id FROM platform_nav_items WHERE name = 'Finance Center' AND path = '#finance-center' AND tenant_id IS NULL;

  -- Create 5 Finance subgroups
  INSERT INTO platform_nav_items (tenant_id, name, path, icon, parent_id, order_index, is_active, roles_allowed, departments_allowed)
  VALUES 
    (NULL, 'Finance Center', '#finance-main', 'DollarSign', v_finance_id, 1, true, ARRAY['owner', 'manager', 'accountant', 'finance']::app_role[], ARRAY['finance', 'management']),
    (NULL, 'Billing & Revenue Setup', '#finance-billing-setup', 'Settings', v_finance_id, 2, true, ARRAY['owner', 'manager', 'finance']::app_role[], ARRAY['finance', 'management']),
    (NULL, 'Organization & Accounting', '#finance-org-accounting', 'Building2', v_finance_id, 3, true, ARRAY['owner', 'manager', 'accountant', 'finance']::app_role[], ARRAY['finance', 'management']),
    (NULL, 'Financial Logs', '#finance-logs', 'FileText', v_finance_id, 4, true, ARRAY['owner', 'manager', 'finance']::app_role[], ARRAY['finance', 'management']),
    (NULL, 'Finance Settings', '#finance-settings', 'Sliders', v_finance_id, 5, true, ARRAY['owner', 'manager']::app_role[], ARRAY['finance', 'management'])
  ON CONFLICT DO NOTHING;

  -- Get subgroup IDs
  SELECT id INTO v_finance_center_id FROM platform_nav_items WHERE name = 'Finance Center' AND path = '#finance-main' AND tenant_id IS NULL;
  SELECT id INTO v_billing_setup_id FROM platform_nav_items WHERE name = 'Billing & Revenue Setup' AND path = '#finance-billing-setup' AND tenant_id IS NULL;
  SELECT id INTO v_org_accounting_id FROM platform_nav_items WHERE name = 'Organization & Accounting' AND path = '#finance-org-accounting' AND tenant_id IS NULL;
  SELECT id INTO v_financial_logs_id FROM platform_nav_items WHERE name = 'Financial Logs' AND path = '#finance-logs' AND tenant_id IS NULL;
  SELECT id INTO v_finance_settings_id FROM platform_nav_items WHERE name = 'Finance Settings' AND path = '#finance-settings' AND tenant_id IS NULL;

  -- Finance Center subgroup children
  UPDATE platform_nav_items SET parent_id = v_finance_center_id, order_index = 1 WHERE name = 'Dashboard' AND path = '/dashboard/finance-center' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_finance_center_id, order_index = 2 WHERE name = 'Folios' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_finance_center_id, order_index = 3 WHERE name = 'Post-Checkout' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_finance_center_id, order_index = 4 WHERE name = 'Receipts' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_finance_center_id, order_index = 5 WHERE name = 'Credits' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_finance_center_id, order_index = 6 WHERE name = 'Closed Folios' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_finance_center_id, order_index = 7 WHERE name = 'Night Audit' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_finance_center_id, order_index = 8 WHERE name = 'Reconciliation' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_finance_center_id, order_index = 9 WHERE name = 'Debtors' AND tenant_id IS NULL;

  -- Billing & Revenue Setup children
  UPDATE platform_nav_items SET parent_id = v_billing_setup_id, order_index = 1 WHERE name = 'Payment Methods' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_billing_setup_id, order_index = 2 WHERE name IN ('Providers', 'Payment Providers') AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_billing_setup_id, order_index = 3 WHERE name IN ('Locations', 'Payment Locations') AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_billing_setup_id, order_index = 4 WHERE name = 'Rules' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_billing_setup_id, order_index = 5 WHERE name = 'Wallets' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_billing_setup_id, order_index = 6 WHERE name = 'Platform Fees' AND tenant_id IS NULL;

  -- Organization & Accounting children
  UPDATE platform_nav_items SET parent_id = v_org_accounting_id, order_index = 2 WHERE name = 'Analytics' AND path LIKE '%analytics%' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_org_accounting_id, order_index = 3 WHERE name IN ('Org Analytics', 'Organization Analytics') AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_org_accounting_id, order_index = 4 WHERE name = 'Finance Reports' AND tenant_id IS NULL;

  -- Financial Logs children
  UPDATE platform_nav_items SET parent_id = v_financial_logs_id, order_index = 1 WHERE name = 'Logs' AND path LIKE '%logs%' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_financial_logs_id, order_index = 2 WHERE name = 'Audit Trail' AND tenant_id IS NULL;

  -- Finance Settings children
  UPDATE platform_nav_items SET parent_id = v_finance_settings_id, order_index = 1 WHERE name = 'Settings' AND path LIKE '%finance%settings%' AND tenant_id IS NULL;
  UPDATE platform_nav_items SET parent_id = v_finance_settings_id, order_index = 2 WHERE name = 'Preferences' AND tenant_id IS NULL;

END $$;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '[FINAL-NAV-RESTRUCTURE-V2] Navigation restructure complete';
END $$;