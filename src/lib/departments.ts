/**
 * Department constants matching the database enum
 * Keep this synchronized with the department enum in the database
 */

export const DEPARTMENTS = [
  { value: 'front_office', label: 'Front Office' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'food_beverage', label: 'Food & Beverage' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bar', label: 'Bar' },
  { value: 'finance', label: 'Finance' },
  { value: 'management', label: 'Management' },
  { value: 'security', label: 'Security' },
  { value: 'spa', label: 'Spa' },
  { value: 'concierge', label: 'Concierge' },
  { value: 'admin', label: 'Admin' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'hr', label: 'HR' },
] as const;

export type DepartmentValue = typeof DEPARTMENTS[number]['value'];
