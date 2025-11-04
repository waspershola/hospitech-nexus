-- Phase 2: Populate allowed_departments for existing navigation items

-- Overview: Available to ALL departments (empty array = all)
UPDATE navigation_items 
SET allowed_departments = '{}',
    description = 'Main dashboard overview accessible to all departments'
WHERE path = '/dashboard';

-- Stock Requests: ONLY operational departments that manage inventory
UPDATE navigation_items 
SET allowed_departments = '{housekeeping,kitchen,bar,maintenance,food_beverage}',
    description = 'Department stock requests for operational teams'
WHERE path = '/dashboard/stock-requests';

-- Housekeeping Dashboard: ONLY housekeeping department
UPDATE navigation_items 
SET allowed_departments = '{housekeeping}',
    description = 'Housekeeping department dashboard and task management'
WHERE path = '/dashboard/housekeeping-dashboard';

-- Kitchen Dashboard: Kitchen and food & beverage departments
UPDATE navigation_items 
SET allowed_departments = '{kitchen,food_beverage}',
    description = 'Kitchen operations and restaurant management'
WHERE path = '/dashboard/kitchen-dashboard';

-- Bar Dashboard: Bar and food & beverage departments
UPDATE navigation_items 
SET allowed_departments = '{bar,food_beverage}',
    description = 'Bar operations and beverage management'
WHERE path = '/dashboard/bar-dashboard';

-- Maintenance Dashboard: ONLY maintenance department
UPDATE navigation_items 
SET allowed_departments = '{maintenance}',
    description = 'Maintenance department dashboard and work orders'
WHERE path = '/dashboard/maintenance-dashboard';

-- Finance Dashboard: Management only
UPDATE navigation_items 
SET allowed_departments = '{management}',
    description = 'Financial overview and accounting dashboard'
WHERE path = '/dashboard/finance-dashboard';

-- Front Desk: Front office and management
UPDATE navigation_items 
SET allowed_departments = '{front_office,management}',
    description = 'Front desk operations and guest check-in/out'
WHERE path = '/dashboard/front-desk';

-- Rooms: Front office, housekeeping, maintenance, and management
UPDATE navigation_items 
SET allowed_departments = '{front_office,housekeeping,maintenance,management}',
    description = 'Room management and status overview'
WHERE path = '/dashboard/rooms';

-- Inventory: Inventory department and management
UPDATE navigation_items 
SET allowed_departments = '{inventory,management}',
    description = 'Inventory management and stock control'
WHERE path = '/dashboard/inventory';

-- Finance Center: Management only
UPDATE navigation_items 
SET allowed_departments = '{management}',
    description = 'Comprehensive finance center with all financial operations'
WHERE path = '/dashboard/finance-center';

-- Debtors: Management only
UPDATE navigation_items 
SET allowed_departments = '{management}',
    description = 'Accounts receivable and debtor management'
WHERE path = '/dashboard/debtors';

-- Wallets: Management only
UPDATE navigation_items 
SET allowed_departments = '{management}',
    description = 'Guest and organization wallet management'
WHERE path = '/dashboard/wallets';

-- Bookings: Front office and management
UPDATE navigation_items 
SET allowed_departments = '{front_office,management}',
    description = 'Booking management and reservations'
WHERE path = '/dashboard/bookings';

-- Guests: Front office and management
UPDATE navigation_items 
SET allowed_departments = '{front_office,management}',
    description = 'Guest profile management and history'
WHERE path = '/dashboard/guests';

-- Payments: Departments that handle transactions
UPDATE navigation_items 
SET allowed_departments = '{front_office,kitchen,bar,food_beverage,management}',
    description = 'Payment processing and transaction management'
WHERE path = '/dashboard/payments';

-- Configuration Center: Management only
UPDATE navigation_items 
SET allowed_departments = '{management}',
    description = 'System configuration and settings'
WHERE path = '/dashboard/configuration-center';

-- Reports: Management only
UPDATE navigation_items 
SET allowed_departments = '{management}',
    description = 'Business intelligence and reporting'
WHERE path = '/dashboard/reports';

-- Staff: Management only
UPDATE navigation_items 
SET allowed_departments = '{management}',
    description = 'Staff management and HR functions'
WHERE path = '/dashboard/staff';

-- Staff Activity: Management only
UPDATE navigation_items 
SET allowed_departments = '{management}',
    description = 'Staff activity logs and performance tracking'
WHERE path = '/dashboard/staff-activity';

-- User Roles: Management only
UPDATE navigation_items 
SET allowed_departments = '{management}',
    description = 'User role and permission management'
WHERE path = '/dashboard/user-roles';

-- Room Categories: Management only
UPDATE navigation_items 
SET allowed_departments = '{management}',
    description = 'Room category and pricing configuration'
WHERE path = '/dashboard/room-categories';