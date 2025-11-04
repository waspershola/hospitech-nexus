/**
 * @deprecated This file is kept for reference only.
 * 
 * Navigation is now database-driven via the navigation_items table.
 * See useNavigation() hook in src/hooks/useNavigation.ts for current implementation.
 * 
 * Migration completed: The system now uses allowed_roles[] and allowed_departments[]
 * columns in the navigation_items table for dynamic, tenant-customizable navigation.
 * 
 * This file may still be used for:
 * - Default dashboard path logic (getDefaultDashboard)
 * - Path access checks (canAccessPath)
 * - Reference during migration to new tenants
 */

export interface NavigationItem {
  path: string;
  label: string;
  icon: string;
  badge?: string;
}

/**
 * Get navigation items based on user's role and department
 */
export function getNavigationForRole(role: string, department?: string): NavigationItem[] {
  const baseNav: NavigationItem[] = [
    { path: '/dashboard', label: 'Overview', icon: 'Home' },
  ];

  const roleNavigation: Record<string, NavigationItem[]> = {
    // Owner has access to everything
    owner: [
      { path: '/dashboard', label: 'Overview', icon: 'Home' },
      { path: '/dashboard/front-desk', label: 'Front Desk', icon: 'Hotel' },
      { path: '/dashboard/bookings', label: 'Bookings', icon: 'CalendarDays' },
      { path: '/dashboard/guests', label: 'Guests', icon: 'Users' },
      { path: '/dashboard/rooms', label: 'Rooms', icon: 'Bed' },
      { path: '/dashboard/room-categories', label: 'Categories', icon: 'LayoutGrid' },
      { path: '/dashboard/payments', label: 'Payments', icon: 'CreditCard' },
      { path: '/dashboard/wallets', label: 'Wallets', icon: 'Wallet' },
      { path: '/dashboard/inventory', label: 'Inventory', icon: 'Package' },
      { path: '/dashboard/finance-center', label: 'Finance Center', icon: 'Building2' },
      { path: '/dashboard/finance-dashboard', label: 'Finance', icon: 'TrendingUp' },
      { path: '/dashboard/debtors', label: 'Debtors', icon: 'Receipt' },
      { path: '/dashboard/kitchen-dashboard', label: 'Kitchen', icon: 'UtensilsCrossed' },
      { path: '/dashboard/bar-dashboard', label: 'Bar', icon: 'Wine' },
      { path: '/dashboard/housekeeping-dashboard', label: 'Housekeeping', icon: 'Sparkles' },
      { path: '/dashboard/maintenance-dashboard', label: 'Maintenance', icon: 'Wrench' },
      { path: '/dashboard/staff', label: 'Staff', icon: 'UserCog' },
      { path: '/dashboard/staff-activity', label: 'Staff Activity', icon: 'Activity' },
      { path: '/dashboard/reports', label: 'Reports', icon: 'FileText' },
      { path: '/dashboard/configuration-center', label: 'Configuration', icon: 'Settings' },
    ],

    // Manager has access to most modules
    manager: [
      { path: '/dashboard', label: 'Overview', icon: 'Home' },
      { path: '/dashboard/front-desk', label: 'Front Desk', icon: 'Hotel' },
      { path: '/dashboard/bookings', label: 'Bookings', icon: 'CalendarDays' },
      { path: '/dashboard/guests', label: 'Guests', icon: 'Users' },
      { path: '/dashboard/rooms', label: 'Rooms', icon: 'Bed' },
      { path: '/dashboard/payments', label: 'Payments', icon: 'CreditCard' },
      { path: '/dashboard/wallets', label: 'Wallets', icon: 'Wallet' },
      { path: '/dashboard/inventory', label: 'Inventory', icon: 'Package' },
      { path: '/dashboard/finance-center', label: 'Finance Center', icon: 'Building2' },
      { path: '/dashboard/finance-dashboard', label: 'Finance', icon: 'TrendingUp' },
      { path: '/dashboard/kitchen-dashboard', label: 'Kitchen', icon: 'UtensilsCrossed' },
      { path: '/dashboard/bar-dashboard', label: 'Bar', icon: 'Wine' },
      { path: '/dashboard/housekeeping-dashboard', label: 'Housekeeping', icon: 'Sparkles' },
      { path: '/dashboard/maintenance-dashboard', label: 'Maintenance', icon: 'Wrench' },
      { path: '/dashboard/staff', label: 'Staff', icon: 'UserCog' },
      { path: '/dashboard/staff-activity', label: 'Staff Activity', icon: 'Activity' },
      { path: '/dashboard/reports', label: 'Reports', icon: 'FileText' },
    ],

    // Front Desk staff
    frontdesk: [
      { path: '/dashboard', label: 'Overview', icon: 'Home' },
      { path: '/dashboard/front-desk', label: 'Front Desk', icon: 'Hotel' },
      { path: '/dashboard/bookings', label: 'Bookings', icon: 'CalendarDays' },
      { path: '/dashboard/guests', label: 'Guests', icon: 'Users' },
      { path: '/dashboard/rooms', label: 'Rooms', icon: 'Bed' },
      { path: '/dashboard/payments', label: 'Payments', icon: 'CreditCard' },
    ],

    // Housekeeping staff
  housekeeping: [
    { path: '/dashboard', label: 'Overview', icon: 'Home' },
    { path: '/dashboard/housekeeping-dashboard', label: 'Housekeeping', icon: 'Sparkles' },
    { path: '/dashboard/rooms', label: 'Rooms', icon: 'Bed' },
    { path: '/dashboard/inventory/requests', label: 'Stock Requests', icon: 'Package' },
  ],

    // Finance/Accountant
    finance: [
      { path: '/dashboard', label: 'Overview', icon: 'Home' },
      { path: '/dashboard/payments', label: 'Payments', icon: 'CreditCard' },
      { path: '/dashboard/wallets', label: 'Wallets', icon: 'Wallet' },
      { path: '/dashboard/finance-dashboard', label: 'Finance', icon: 'TrendingUp' },
      { path: '/dashboard/debtors', label: 'Debtors', icon: 'Receipt' },
      { path: '/dashboard/reports', label: 'Reports', icon: 'FileText' },
    ],

    accountant: [
      { path: '/dashboard', label: 'Overview', icon: 'Home' },
      { path: '/dashboard/payments', label: 'Payments', icon: 'CreditCard' },
      { path: '/dashboard/wallets', label: 'Wallets', icon: 'Wallet' },
      { path: '/dashboard/finance-center', label: 'Finance Center', icon: 'Building2' },
      { path: '/dashboard/finance-dashboard', label: 'Finance', icon: 'TrendingUp' },
      { path: '/dashboard/debtors', label: 'Debtors', icon: 'Receipt' },
      { path: '/dashboard/reports', label: 'Reports', icon: 'FileText' },
    ],

    // Restaurant staff
  restaurant: [
    { path: '/dashboard', label: 'Overview', icon: 'Home' },
    { path: '/dashboard/kitchen-dashboard', label: 'Kitchen', icon: 'UtensilsCrossed' },
    { path: '/dashboard/inventory/requests', label: 'Stock Requests', icon: 'Package' },
    { path: '/dashboard/payments', label: 'Payments', icon: 'CreditCard' },
  ],

  // Kitchen staff (separate from restaurant)
  kitchen: [
    { path: '/dashboard', label: 'Overview', icon: 'Home' },
    { path: '/dashboard/kitchen-dashboard', label: 'Kitchen', icon: 'UtensilsCrossed' },
    { path: '/dashboard/inventory/requests', label: 'Stock Requests', icon: 'Package' },
    { path: '/dashboard/payments', label: 'Payments', icon: 'CreditCard' },
  ],

    // Bar staff
  bar: [
    { path: '/dashboard', label: 'Overview', icon: 'Home' },
    { path: '/dashboard/bar-dashboard', label: 'Bar', icon: 'Wine' },
    { path: '/dashboard/inventory/requests', label: 'Stock Requests', icon: 'Package' },
    { path: '/dashboard/payments', label: 'Payments', icon: 'CreditCard' },
  ],

    // Maintenance staff
  maintenance: [
    { path: '/dashboard', label: 'Overview', icon: 'Home' },
    { path: '/dashboard/maintenance-dashboard', label: 'Maintenance', icon: 'Wrench' },
    { path: '/dashboard/rooms', label: 'Rooms', icon: 'Bed' },
    { path: '/dashboard/inventory/requests', label: 'Stock Requests', icon: 'Package' },
  ],

    // Supervisor has access to their department + staff management
    supervisor: [],

    // Store Manager - Full inventory control
    store_manager: [
      { path: '/dashboard', label: 'Overview', icon: 'Home' },
      { path: '/dashboard/inventory', label: 'Store', icon: 'Package' },
      { path: '/dashboard/inventory/requests', label: 'Requests', icon: 'ClipboardList' },
      { path: '/dashboard/inventory/movements', label: 'Movements', icon: 'ArrowLeftRight' },
      { path: '/dashboard/inventory/suppliers', label: 'Suppliers', icon: 'Truck' },
      { path: '/dashboard/inventory/reports', label: 'Reports', icon: 'FileText' },
    ],

    // Procurement - Purchase orders and suppliers
    procurement: [
      { path: '/dashboard', label: 'Overview', icon: 'Home' },
      { path: '/dashboard/inventory/purchase-orders', label: 'Purchase Orders', icon: 'FileText' },
      { path: '/dashboard/inventory/suppliers', label: 'Suppliers', icon: 'Truck' },
      { path: '/dashboard/inventory', label: 'Inventory', icon: 'Package' },
      { path: '/dashboard/inventory/reports', label: 'Reports', icon: 'BarChart3' },
    ],

    // Spa staff
    spa: [
      { path: '/dashboard', label: 'Overview', icon: 'Home' },
      { path: '/dashboard/bookings', label: 'Appointments', icon: 'CalendarDays' },
    ],

    // Concierge staff
    concierge: [
      { path: '/dashboard', label: 'Overview', icon: 'Home' },
      { path: '/dashboard/guests', label: 'Guests', icon: 'Users' },
    ],

    // Admin staff
    admin: [
      { path: '/dashboard', label: 'Overview', icon: 'Home' },
      { path: '/dashboard/staff', label: 'Staff', icon: 'UserCog' },
      { path: '/dashboard/reports', label: 'Reports', icon: 'FileText' },
    ],

    // HR staff
    hr: [
      { path: '/dashboard', label: 'Overview', icon: 'Home' },
      { path: '/dashboard/staff', label: 'Staff', icon: 'UserCog' },
      { path: '/dashboard/staff-activity', label: 'Staff Activity', icon: 'Activity' },
    ],

    // Limited ops (fallback for unmapped)
    limited_ops: [
      { path: '/dashboard', label: 'Overview', icon: 'Home' },
    ],

    // Guest portal access (very restricted)
    guest_portal_access: [
      { path: '/dashboard', label: 'Overview', icon: 'Home' },
    ],

    // Store user (inventory staff without manager permissions)
    store_user: [
      { path: '/dashboard', label: 'Overview', icon: 'Home' },
      { path: '/dashboard/inventory', label: 'Inventory', icon: 'Package' },
      { path: '/dashboard/inventory/requests', label: 'My Requests', icon: 'ClipboardList' },
    ],
  };

  // For supervisors, add department-specific navigation + staff management
  if (role === 'supervisor' && department) {
    const departmentNav = getDepartmentNavigation(department);
    return [
      ...baseNav,
      ...departmentNav,
      { path: '/dashboard/staff', label: 'My Team', icon: 'UserCog' },
    ];
  }

  return roleNavigation[role] || baseNav;
}

/**
 * Get department-specific navigation for supervisors
 */
function getDepartmentNavigation(department: string): NavigationItem[] {
  const departmentNavMap: Record<string, NavigationItem[]> = {
    front_office: [
      { path: '/dashboard/front-desk', label: 'Front Desk', icon: 'Hotel' },
      { path: '/dashboard/bookings', label: 'Bookings', icon: 'CalendarDays' },
      { path: '/dashboard/guests', label: 'Guests', icon: 'Users' },
      { path: '/dashboard/rooms', label: 'Rooms', icon: 'Bed' },
    ],
    housekeeping: [
      { path: '/dashboard/housekeeping-dashboard', label: 'Housekeeping', icon: 'Sparkles' },
      { path: '/dashboard/rooms', label: 'Rooms', icon: 'Bed' },
      { path: '/dashboard/inventory/requests', label: 'Stock Requests', icon: 'Package' },
    ],
    food_beverage: [
      { path: '/dashboard/kitchen-dashboard', label: 'Restaurant', icon: 'UtensilsCrossed' },
      { path: '/dashboard/inventory/requests', label: 'Stock Requests', icon: 'Package' },
    ],
    kitchen: [
      { path: '/dashboard/kitchen-dashboard', label: 'Kitchen', icon: 'UtensilsCrossed' },
      { path: '/dashboard/inventory/requests', label: 'Stock Requests', icon: 'Package' },
    ],
    bar: [
      { path: '/dashboard/bar-dashboard', label: 'Bar', icon: 'Wine' },
      { path: '/dashboard/inventory/requests', label: 'Stock Requests', icon: 'Package' },
    ],
    maintenance: [
      { path: '/dashboard/maintenance-dashboard', label: 'Maintenance', icon: 'Wrench' },
      { path: '/dashboard/rooms', label: 'Rooms', icon: 'Bed' },
      { path: '/dashboard/inventory/requests', label: 'Stock Requests', icon: 'Package' },
    ],
    accounts: [
      { path: '/dashboard/payments', label: 'Payments', icon: 'CreditCard' },
      { path: '/dashboard/finance-dashboard', label: 'Finance', icon: 'TrendingUp' },
    ],
    inventory: [
      { path: '/dashboard/inventory', label: 'Inventory', icon: 'Package' },
      { path: '/dashboard/inventory/requests', label: 'Requests', icon: 'ClipboardList' },
      { path: '/dashboard/inventory/movements', label: 'Movements', icon: 'ArrowLeftRight' },
    ],
    hr: [
      { path: '/dashboard/staff', label: 'Staff', icon: 'UserCog' },
      { path: '/dashboard/staff-activity', label: 'Staff Activity', icon: 'Activity' },
    ],
    spa: [
      { path: '/dashboard/bookings', label: 'Appointments', icon: 'CalendarDays' },
    ],
    concierge: [
      { path: '/dashboard/guests', label: 'Guests', icon: 'Users' },
    ],
    admin: [
      { path: '/dashboard/staff', label: 'Staff', icon: 'UserCog' },
      { path: '/dashboard/reports', label: 'Reports', icon: 'FileText' },
    ],
    security: [
      { path: '/dashboard/front-desk', label: 'Front Desk', icon: 'Hotel' },
      { path: '/dashboard/rooms', label: 'Rooms', icon: 'Bed' },
    ],
  };

  return departmentNavMap[department] || [];
}

/**
 * Get the default dashboard path for a user based on their role and department
 */
export function getDefaultDashboard(role: string, department?: string): string {
  const dashboardMap: Record<string, string> = {
    owner: '/dashboard',
    manager: '/dashboard',
    frontdesk: '/dashboard/front-desk',
    housekeeping: '/dashboard/housekeeping-dashboard',
    finance: '/dashboard/finance-dashboard',
    accountant: '/dashboard/finance-center',
    restaurant: '/dashboard/kitchen-dashboard',
    kitchen: '/dashboard/kitchen-dashboard',
    bar: '/dashboard/bar-dashboard',
    maintenance: '/dashboard/maintenance-dashboard',
    store_manager: '/dashboard/inventory',
    procurement: '/dashboard/inventory/purchase-orders',
    spa: '/dashboard',
    concierge: '/dashboard',
    admin: '/dashboard/staff',
    hr: '/dashboard/staff',
    limited_ops: '/dashboard',
    guest_portal_access: '/dashboard',
    store_user: '/dashboard/inventory',
  };

  // Supervisors go to their department dashboard
  if (role === 'supervisor' && department) {
    const supervisorDashboards: Record<string, string> = {
      front_office: '/dashboard/front-desk',
      housekeeping: '/dashboard/housekeeping-dashboard',
      food_beverage: '/dashboard/kitchen-dashboard',
      kitchen: '/dashboard/kitchen-dashboard',
      bar: '/dashboard/bar-dashboard',
      maintenance: '/dashboard/maintenance-dashboard',
      accounts: '/dashboard/finance-dashboard',
      inventory: '/dashboard/inventory',
      hr: '/dashboard/staff',
      spa: '/dashboard',
      concierge: '/dashboard',
      admin: '/dashboard/staff',
      security: '/dashboard/front-desk',
    };
    return supervisorDashboards[department] || '/dashboard';
  }

  return dashboardMap[role] || '/dashboard';
}

/**
 * Check if user has access to a specific path
 */
export function canAccessPath(path: string, role: string, department?: string): boolean {
  const allowedNav = getNavigationForRole(role, department);
  return allowedNav.some(item => path.startsWith(item.path));
}
