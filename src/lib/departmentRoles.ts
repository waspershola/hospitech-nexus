/**
 * Department-specific role mappings for staff invitation
 * Defines which staff roles are valid for each department
 */

export const DEPARTMENT_ROLES: Record<string, { value: string; label: string }[]> = {
  front_office: [
    { value: 'receptionist', label: 'Receptionist' },
    { value: 'guest_service_agent', label: 'Guest Service Agent' },
    { value: 'front_desk_supervisor', label: 'Front Desk Supervisor' },
    { value: 'front_office_manager', label: 'Front Office Manager' },
  ],
  
  housekeeping: [
    { value: 'room_attendant', label: 'Room Attendant' },
    { value: 'housekeeper', label: 'Housekeeper' },
    { value: 'housekeeping_supervisor', label: 'Housekeeping Supervisor' },
    { value: 'housekeeping_manager', label: 'Housekeeping Manager' },
  ],
  
  maintenance: [
    { value: 'technician', label: 'Technician' },
    { value: 'electrician', label: 'Electrician' },
    { value: 'plumber', label: 'Plumber' },
    { value: 'maintenance_supervisor', label: 'Maintenance Supervisor' },
    { value: 'maintenance_manager', label: 'Maintenance Manager' },
  ],
  
  food_beverage: [
    { value: 'waiter', label: 'Waiter/Server' },
    { value: 'server', label: 'Server' },
    { value: 'restaurant_supervisor', label: 'Restaurant Supervisor' },
    { value: 'fnb_manager', label: 'F&B Manager' },
  ],
  
  kitchen: [
    { value: 'cook', label: 'Cook' },
    { value: 'chef', label: 'Chef' },
    { value: 'kitchen_assistant', label: 'Kitchen Assistant' },
    { value: 'sous_chef', label: 'Sous Chef' },
    { value: 'executive_chef', label: 'Executive Chef' },
  ],
  
  bar: [
    { value: 'bartender', label: 'Bartender' },
    { value: 'bar_supervisor', label: 'Bar Supervisor' },
    { value: 'bar_manager', label: 'Bar Manager' },
  ],
  
  finance: [
    { value: 'cashier', label: 'Cashier' },
    { value: 'accountant', label: 'Accountant' },
    { value: 'finance_supervisor', label: 'Finance Supervisor' },
    { value: 'finance_manager', label: 'Finance Manager' },
  ],
  
  inventory: [
    { value: 'store_keeper', label: 'Store Keeper' },
    { value: 'store_clerk', label: 'Store Clerk' },
    { value: 'inventory_supervisor', label: 'Inventory Supervisor' },
    { value: 'inventory_manager', label: 'Inventory Manager' },
    { value: 'store_manager', label: 'Store Manager' },
  ],
  
  hr: [
    { value: 'hr_officer', label: 'HR Officer' },
    { value: 'hr_admin', label: 'HR Admin' },
    { value: 'hr_assistant', label: 'HR Assistant' },
    { value: 'hr_coordinator', label: 'HR Coordinator' },
    { value: 'hr_supervisor', label: 'HR Supervisor' },
    { value: 'hr_manager', label: 'HR Manager' },
  ],
  
  spa: [
    { value: 'therapist', label: 'Therapist' },
    { value: 'spa_staff', label: 'Spa Staff' },
    { value: 'spa_attendant', label: 'Spa Attendant' },
    { value: 'spa_supervisor', label: 'Spa Supervisor' },
    { value: 'spa_manager', label: 'Spa Manager' },
  ],
  
  concierge: [
    { value: 'concierge_agent', label: 'Concierge Agent' },
    { value: 'concierge_staff', label: 'Concierge Staff' },
    { value: 'bell_captain', label: 'Bell Captain' },
    { value: 'concierge_supervisor', label: 'Concierge Supervisor' },
    { value: 'concierge_manager', label: 'Concierge Manager' },
  ],
  
  admin: [
    { value: 'admin_assistant', label: 'Admin Assistant' },
    { value: 'admin_officer', label: 'Admin Officer' },
    { value: 'admin_coordinator', label: 'Admin Coordinator' },
    { value: 'admin_supervisor', label: 'Admin Supervisor' },
    { value: 'admin_manager', label: 'Admin Manager' },
  ],
  
  security: [
    { value: 'security_staff', label: 'Security Staff' },
    { value: 'security_guard', label: 'Security Guard' },
    { value: 'security_supervisor', label: 'Security Supervisor' },
    { value: 'chief_security_officer', label: 'Chief Security Officer' },
  ],
  
  management: [
    { value: 'general_manager', label: 'General Manager' },
    { value: 'manager', label: 'Manager' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'owner', label: 'Owner' },
  ],
};

/**
 * Get available roles for a department
 */
export function getRolesForDepartment(department: string): { value: string; label: string }[] {
  return DEPARTMENT_ROLES[department] || [];
}
