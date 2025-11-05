-- =====================================================
-- Navigation Items Seeding Script
-- =====================================================
-- Purpose: Seed default navigation items for new tenants
-- Usage: Replace {tenant_id} with actual tenant UUID
-- Date: 2025-11-05
-- =====================================================

-- INSTRUCTIONS:
-- 1. Get the tenant_id from: SELECT id, name FROM tenants;
-- 2. Replace all {tenant_id} occurrences below with the actual UUID
-- 3. Run this script in Supabase SQL Editor
-- 4. Verify with: SELECT COUNT(*) FROM navigation_items WHERE tenant_id = '{tenant_id}';

-- =====================================================
-- DEFAULT NAVIGATION ITEMS
-- =====================================================

INSERT INTO navigation_items (
  tenant_id, 
  name, 
  path, 
  icon, 
  allowed_roles, 
  allowed_departments, 
  order_index,
  is_active,
  description
)
VALUES
  -- Overview (visible to everyone)
  (
    '{tenant_id}', 
    'Overview', 
    '/dashboard', 
    'Home', 
    ARRAY['owner','manager','frontdesk','housekeeping','finance','accountant','maintenance','restaurant','kitchen','bar','store_manager','procurement','supervisor'], 
    ARRAY[]::text[], 
    1,
    true,
    'Main dashboard overview'
  ),

  -- Front Desk (front office staff)
  (
    '{tenant_id}', 
    'Front Desk', 
    '/dashboard/front-desk', 
    'Hotel', 
    ARRAY['owner','manager','frontdesk'], 
    ARRAY['front_office','management'], 
    2,
    true,
    'Front desk operations and room management'
  ),

  -- Rooms (multiple departments)
  (
    '{tenant_id}', 
    'Rooms', 
    '/dashboard/rooms', 
    'Bed', 
    ARRAY['owner','manager','frontdesk','housekeeping','maintenance','supervisor'], 
    ARRAY['front_office','housekeeping','maintenance','management'], 
    3,
    true,
    'Room inventory and status management'
  ),

  -- Room Categories (management only)
  (
    '{tenant_id}', 
    'Categories', 
    '/dashboard/room-categories', 
    'LayoutGrid', 
    ARRAY['owner','manager'], 
    ARRAY['management'], 
    4,
    true,
    'Room category configuration'
  ),

  -- Bookings
  (
    '{tenant_id}', 
    'Bookings', 
    '/dashboard/bookings', 
    'CalendarDays', 
    ARRAY['owner','manager','frontdesk','finance','accountant'], 
    ARRAY['front_office','management'], 
    5,
    true,
    'Booking management and reservations'
  ),

  -- Guests
  (
    '{tenant_id}', 
    'Guests', 
    '/dashboard/guests', 
    'Users', 
    ARRAY['owner','manager','frontdesk','finance'], 
    ARRAY['front_office','management'], 
    6,
    true,
    'Guest profiles and history'
  ),

  -- Payments (multiple departments)
  (
    '{tenant_id}', 
    'Payments', 
    '/dashboard/payments', 
    'CreditCard', 
    ARRAY['owner','manager','frontdesk','finance','accountant','restaurant','kitchen','bar'], 
    ARRAY['front_office','kitchen','bar','food_beverage','management'], 
    7,
    true,
    'Payment processing and history'
  ),

  -- Wallets (finance)
  (
    '{tenant_id}', 
    'Wallets', 
    '/dashboard/wallets', 
    'Wallet', 
    ARRAY['owner','manager','finance','accountant'], 
    ARRAY['management'], 
    8,
    true,
    'Guest and organization wallets'
  ),

  -- Finance Center (finance department)
  (
    '{tenant_id}', 
    'Finance Center', 
    '/dashboard/finance-center', 
    'Building2', 
    ARRAY['owner','manager','finance','accountant'], 
    ARRAY['management'], 
    9,
    true,
    'Comprehensive finance management'
  ),

  -- Debtors (finance)
  (
    '{tenant_id}', 
    'Debtors', 
    '/dashboard/debtors', 
    'Receipt', 
    ARRAY['owner','manager','finance','accountant'], 
    ARRAY['management'], 
    10,
    true,
    'Accounts receivable and aging'
  ),

  -- Reports (management and supervisors)
  (
    '{tenant_id}', 
    'Reports', 
    '/dashboard/reports', 
    'FileText', 
    ARRAY['owner','manager','accountant','supervisor'], 
    ARRAY['management','front_office'], 
    11,
    true,
    'Business reports and analytics'
  ),

  -- Configuration (owners and managers)
  (
    '{tenant_id}', 
    'Configuration', 
    '/dashboard/configuration-center', 
    'Settings', 
    ARRAY['owner','manager'], 
    ARRAY['management'], 
    12,
    true,
    'Hotel configuration and settings'
  ),

  -- Staff Management
  (
    '{tenant_id}', 
    'Staff Management', 
    '/dashboard/staff', 
    'Users', 
    ARRAY['owner','manager','supervisor'], 
    ARRAY['management'], 
    13,
    true,
    'Staff profiles and management'
  ),

  -- User Roles (owner only)
  (
    '{tenant_id}', 
    'User Roles', 
    '/dashboard/user-roles', 
    'Shield', 
    ARRAY['owner'], 
    ARRAY['management'], 
    14,
    true,
    'User role and permission management'
  ),

  -- Staff Activity
  (
    '{tenant_id}', 
    'Staff Activity', 
    '/dashboard/staff-activity', 
    'Activity', 
    ARRAY['owner','manager','supervisor'], 
    ARRAY['management'], 
    15,
    true,
    'Staff activity logs and audit trail'
  ),

  -- Inventory (store managers)
  (
    '{tenant_id}', 
    'Inventory', 
    '/dashboard/inventory', 
    'Package', 
    ARRAY['owner','manager','store_manager','procurement'], 
    ARRAY['inventory','management'], 
    16,
    true,
    'Inventory and stock management'
  ),

  -- Housekeeping Dashboard
  (
    '{tenant_id}', 
    'Housekeeping', 
    '/dashboard/housekeeping-dashboard', 
    'SparklesIcon', 
    ARRAY['owner','manager','housekeeping','supervisor'], 
    ARRAY['housekeeping'], 
    17,
    true,
    'Housekeeping operations dashboard'
  ),

  -- Maintenance Dashboard
  (
    '{tenant_id}', 
    'Maintenance', 
    '/dashboard/maintenance-dashboard', 
    'Wrench', 
    ARRAY['owner','manager','maintenance','supervisor'], 
    ARRAY['maintenance'], 
    18,
    true,
    'Maintenance operations dashboard'
  ),

  -- Kitchen Dashboard
  (
    '{tenant_id}', 
    'Kitchen', 
    '/dashboard/kitchen-dashboard', 
    'ChefHat', 
    ARRAY['owner','manager','restaurant','kitchen','supervisor'], 
    ARRAY['kitchen','food_beverage'], 
    19,
    true,
    'Kitchen operations dashboard'
  ),

  -- Bar Dashboard
  (
    '{tenant_id}', 
    'Bar', 
    '/dashboard/bar-dashboard', 
    'Wine', 
    ARRAY['owner','manager','bar','supervisor'], 
    ARRAY['bar','food_beverage'], 
    20,
    true,
    'Bar operations dashboard'
  ),

  -- Finance Dashboard
  (
    '{tenant_id}', 
    'Finance Dashboard', 
    '/dashboard/finance-dashboard', 
    'TrendingUp', 
    ARRAY['owner','manager','finance','accountant'], 
    ARRAY['management'], 
    21,
    true,
    'Finance analytics and overview'
  ),

  -- Stock Requests (department staff)
  (
    '{tenant_id}', 
    'Stock Requests', 
    '/dashboard/stock-requests', 
    'ClipboardList', 
    ARRAY['housekeeping','maintenance','restaurant','kitchen','bar','supervisor'], 
    ARRAY['housekeeping','kitchen','bar','maintenance','food_beverage'], 
    22,
    true,
    'Department stock requests'
  ),

  -- Navigation Manager (owner only)
  (
    '{tenant_id}', 
    'Navigation Manager', 
    '/dashboard/navigation-manager', 
    'List', 
    ARRAY['owner'], 
    ARRAY[]::text[], 
    99,
    true,
    'Manage navigation menu items'
  )

ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if seeding was successful
-- SELECT COUNT(*) as total_items 
-- FROM navigation_items 
-- WHERE tenant_id = '{tenant_id}';
-- Expected: 23 items

-- View all seeded items
-- SELECT name, path, order_index, is_active
-- FROM navigation_items
-- WHERE tenant_id = '{tenant_id}'
-- ORDER BY order_index;

-- Check role/department filtering
-- SELECT 
--   name, 
--   array_length(allowed_roles, 1) as role_count,
--   array_length(allowed_departments, 1) as dept_count
-- FROM navigation_items
-- WHERE tenant_id = '{tenant_id}'
-- ORDER BY order_index;

-- =====================================================
-- NOTES
-- =====================================================
-- 1. Empty allowed_departments array means visible to ALL departments
-- 2. Icons must match Lucide icon names (https://lucide.dev)
-- 3. order_index determines menu display order
-- 4. is_active=false hides item without deleting
-- 5. Use Navigation Manager UI for ongoing management
