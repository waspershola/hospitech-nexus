-- ============================================
-- Fix Navigation Items & User Roles
-- ============================================

-- Step 1: Delete all navigation items for the tenant to remove duplicates
DELETE FROM navigation_items WHERE tenant_id = '2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec';

-- Step 2: Insert clean navigation items with proper app_role casting
INSERT INTO navigation_items (tenant_id, name, path, icon, allowed_roles, order_index, is_active)
VALUES
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Overview', '/dashboard', 'Home', 
   ARRAY['owner','manager','frontdesk','housekeeping','finance','accountant','maintenance','restaurant','kitchen','bar','store_manager','procurement','supervisor']::app_role[], 1, true),
  
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Front Desk', '/dashboard/front-desk', 'Hotel', 
   ARRAY['owner','manager','frontdesk']::app_role[], 2, true),
  
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Rooms', '/dashboard/rooms', 'Bed', 
   ARRAY['owner','manager','frontdesk','housekeeping','maintenance','supervisor']::app_role[], 3, true),
  
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Categories', '/dashboard/room-categories', 'LayoutGrid', 
   ARRAY['owner','manager']::app_role[], 4, true),
  
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Bookings', '/dashboard/bookings', 'CalendarDays', 
   ARRAY['owner','manager','frontdesk','finance','accountant']::app_role[], 5, true),
  
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Guests', '/dashboard/guests', 'Users', 
   ARRAY['owner','manager','frontdesk','finance']::app_role[], 6, true),
  
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Payments', '/dashboard/payments', 'CreditCard', 
   ARRAY['owner','manager','frontdesk','finance','accountant','restaurant','kitchen','bar']::app_role[], 7, true),
  
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Wallets', '/dashboard/wallets', 'Wallet', 
   ARRAY['owner','manager','finance','accountant']::app_role[], 8, true),
  
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Finance Center', '/dashboard/finance-center', 'Building2', 
   ARRAY['owner','manager','finance','accountant']::app_role[], 9, true),
  
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Debtors', '/dashboard/debtors', 'Receipt', 
   ARRAY['owner','manager','finance','accountant']::app_role[], 10, true),
  
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Reports', '/dashboard/reports', 'FileText', 
   ARRAY['owner','manager','finance','accountant']::app_role[], 11, true),
  
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Configuration', '/dashboard/configuration-center', 'Settings', 
   ARRAY['owner','manager']::app_role[], 12, true),
  
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Staff Management', '/dashboard/staff', 'UserCog', 
   ARRAY['owner','manager','supervisor']::app_role[], 13, true),
  
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'User Roles', '/dashboard/user-roles', 'Shield', 
   ARRAY['owner']::app_role[], 14, true),
  
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Staff Activity', '/dashboard/staff-activity', 'Activity', 
   ARRAY['owner','manager','supervisor']::app_role[], 15, true),
  
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Inventory', '/dashboard/inventory', 'Package', 
   ARRAY['owner','manager','store_manager','procurement']::app_role[], 16, true),
  
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Housekeeping', '/dashboard/housekeeping-dashboard', 'Sparkles', 
   ARRAY['owner','manager','housekeeping','supervisor']::app_role[], 17, true),
  
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Maintenance', '/dashboard/maintenance-dashboard', 'Wrench', 
   ARRAY['owner','manager','maintenance','supervisor']::app_role[], 18, true),
  
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Kitchen', '/dashboard/kitchen-dashboard', 'UtensilsCrossed', 
   ARRAY['owner','manager','restaurant','kitchen','supervisor']::app_role[], 19, true),
  
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Bar', '/dashboard/bar-dashboard', 'Wine', 
   ARRAY['owner','manager','bar','supervisor']::app_role[], 20, true),
  
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Finance Dashboard', '/dashboard/finance-dashboard', 'TrendingUp', 
   ARRAY['owner','manager','finance','accountant']::app_role[], 21, true);

-- Step 3: Update department managers to supervisor role
UPDATE user_roles ur
SET role = 'supervisor'::app_role
FROM staff s
WHERE ur.user_id = s.user_id
  AND s.role IN ('housekeeping_manager', 'fnb_manager', 'front_office_manager', 'bar_manager', 'maintenance_manager')
  AND ur.role = 'manager'::app_role;