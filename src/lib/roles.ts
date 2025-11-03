/**
 * Role & Permission System
 * Database-driven roles with permission-based access control
 */

export const ROLES = {
  OWNER: 'owner' as const,
  MANAGER: 'manager' as const,
  FRONTDESK: 'frontdesk' as const,
  HOUSEKEEPING: 'housekeeping' as const,
  FINANCE: 'finance' as const,
  MAINTENANCE: 'maintenance' as const,
  RESTAURANT: 'restaurant' as const,
  BAR: 'bar' as const,
  ACCOUNTANT: 'accountant' as const,
  SUPERVISOR: 'supervisor' as const,
  GUEST: 'guest' as const,
  STORE_MANAGER: 'store_manager' as const,
  PROCUREMENT: 'procurement' as const,
};

export const PERMISSIONS = {
  // Configuration & Settings
  MANAGE_CONFIGURATION: [ROLES.OWNER, ROLES.MANAGER],
  VIEW_CONFIGURATION: [ROLES.OWNER, ROLES.MANAGER, ROLES.FINANCE, ROLES.ACCOUNTANT],
  
  // Finance & Payments
  VIEW_FINANCE: [ROLES.OWNER, ROLES.MANAGER, ROLES.FINANCE, ROLES.ACCOUNTANT],
  MANAGE_FINANCE: [ROLES.OWNER, ROLES.MANAGER, ROLES.ACCOUNTANT],
  RECORD_PAYMENT: [ROLES.OWNER, ROLES.MANAGER, ROLES.FRONTDESK, ROLES.FINANCE],
  PROCESS_REFUNDS: [ROLES.OWNER, ROLES.MANAGER],
  
  // Rooms & Operations
  MANAGE_ROOMS: [ROLES.OWNER, ROLES.MANAGER, ROLES.FRONTDESK],
  VIEW_ROOMS: [ROLES.OWNER, ROLES.MANAGER, ROLES.FRONTDESK, ROLES.HOUSEKEEPING, ROLES.MAINTENANCE],
  SET_MAINTENANCE: [ROLES.OWNER, ROLES.MANAGER, ROLES.MAINTENANCE],
  CLEAN_ROOMS: [ROLES.OWNER, ROLES.MANAGER, ROLES.FRONTDESK, ROLES.HOUSEKEEPING],
  ASSIGN_ROOMS: [ROLES.OWNER, ROLES.MANAGER],
  
  // Bookings
  CREATE_BOOKING: [ROLES.OWNER, ROLES.MANAGER, ROLES.FRONTDESK],
  CANCEL_BOOKING: [ROLES.OWNER, ROLES.MANAGER, ROLES.FRONTDESK],
  MODIFY_BOOKING: [ROLES.OWNER, ROLES.MANAGER, ROLES.FRONTDESK],
  FORCE_CHECKOUT: [ROLES.OWNER, ROLES.MANAGER],
  
  // Reports
  VIEW_REPORTS: [ROLES.OWNER, ROLES.MANAGER, ROLES.FINANCE, ROLES.ACCOUNTANT],
  EXPORT_DATA: [ROLES.OWNER, ROLES.MANAGER, ROLES.ACCOUNTANT],
  
  // Categories & Configuration
  MANAGE_CATEGORIES: [ROLES.OWNER, ROLES.MANAGER],
  
  // Guests
  MANAGE_GUESTS: [ROLES.OWNER, ROLES.MANAGER, ROLES.FRONTDESK],
  
  // Restaurant/Bar
  VIEW_RESTAURANT: [ROLES.OWNER, ROLES.MANAGER, ROLES.RESTAURANT, ROLES.BAR],
  MANAGE_ORDERS: [ROLES.OWNER, ROLES.MANAGER, ROLES.RESTAURANT, ROLES.BAR],
  
  // Staff Management
  MANAGE_STAFF: [ROLES.OWNER, ROLES.MANAGER],
  VIEW_STAFF: [ROLES.OWNER, ROLES.MANAGER, ROLES.SUPERVISOR],
  VIEW_STAFF_ACTIVITY: [ROLES.OWNER, ROLES.MANAGER, ROLES.SUPERVISOR],
  MANAGE_ROLES: [ROLES.OWNER],
  
  // Inventory Management
  VIEW_INVENTORY: [ROLES.OWNER, ROLES.MANAGER, ROLES.STORE_MANAGER, ROLES.PROCUREMENT],
  MANAGE_INVENTORY_ITEMS: [ROLES.OWNER, ROLES.MANAGER, ROLES.STORE_MANAGER],
  RECEIVE_STOCK: [ROLES.OWNER, ROLES.MANAGER, ROLES.STORE_MANAGER],
  ISSUE_TO_DEPARTMENT: [ROLES.OWNER, ROLES.MANAGER, ROLES.STORE_MANAGER],
  APPROVE_STOCK_REQUEST: [ROLES.OWNER, ROLES.MANAGER, ROLES.STORE_MANAGER],
  REQUEST_FROM_STORE: [ROLES.OWNER, ROLES.MANAGER, ROLES.SUPERVISOR, ROLES.RESTAURANT, ROLES.BAR, ROLES.HOUSEKEEPING, ROLES.MAINTENANCE],
  ADJUST_STOCK: [ROLES.OWNER, ROLES.MANAGER],
  VIEW_STOCK_REPORTS: [ROLES.OWNER, ROLES.MANAGER, ROLES.STORE_MANAGER, ROLES.ACCOUNTANT],
  MANAGE_SUPPLIERS: [ROLES.OWNER, ROLES.MANAGER, ROLES.PROCUREMENT],
  MANAGE_PURCHASE_ORDERS: [ROLES.OWNER, ROLES.MANAGER, ROLES.PROCUREMENT, ROLES.STORE_MANAGER],
};

/**
 * Check if a user role has a specific permission
 */
export function hasPermission(userRole: string | undefined, permission: readonly string[]): boolean {
  if (!userRole) return false;
  return permission.includes(userRole);
}

/**
 * Check if user has any of multiple permissions
 */
export function hasAnyPermission(userRole: string | undefined, permissions: readonly string[][]): boolean {
  if (!userRole) return false;
  return permissions.some(permission => permission.includes(userRole));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: string): string[] {
  const rolePermissions: string[] = [];
  
  Object.entries(PERMISSIONS).forEach(([permission, roles]) => {
    if (roles.includes(role as any)) {
      rolePermissions.push(permission);
    }
  });
  
  return rolePermissions;
}

// Department enum - must match database department_type enum
export const DEPARTMENTS = [
  'front_office',
  'housekeeping',
  'maintenance',
  'food_beverage',
  'kitchen',
  'bar',
  'finance',
  'management',
  'security',
  'spa',
  'concierge',
  'admin',
] as const;

export const DEPARTMENT_LABELS: Record<string, string> = {
  front_office: 'Front Office',
  housekeeping: 'Housekeeping',
  maintenance: 'Maintenance',
  food_beverage: 'Food & Beverage',
  kitchen: 'Kitchen',
  bar: 'Bar',
  finance: 'Finance',
  management: 'Management',
  security: 'Security',
  spa: 'Spa & Wellness',
  concierge: 'Concierge',
  admin: 'Administration',
};
