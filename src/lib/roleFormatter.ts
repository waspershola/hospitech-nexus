/**
 * Role formatting utilities for consistent display across the app
 */

export function formatPlatformRole(role: string): string {
  const roleMap: Record<string, string> = {
    'super_admin': 'Super Admin',
    'admin': 'Platform Admin',
    'support': 'Support Admin',
    'billing_admin': 'Billing Admin',
  };
  
  return roleMap[role] || role.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

export function formatTenantRole(role: string): string {
  const roleMap: Record<string, string> = {
    'owner': 'Owner',
    'manager': 'Manager',
    'frontdesk': 'Front Desk',
    'finance': 'Finance',
    'housekeeping': 'Housekeeping',
    'maintenance': 'Maintenance',
    'restaurant': 'Restaurant',
    'kitchen': 'Kitchen',
    'bar': 'Bar',
    'accountant': 'Accountant',
    'supervisor': 'Supervisor',
    'store_manager': 'Store Manager',
    'procurement': 'Procurement',
  };
  
  return roleMap[role] || role.charAt(0).toUpperCase() + role.slice(1);
}

export function getRoleBadgeVariant(platformRole: string): 'default' | 'destructive' | 'secondary' | 'outline' {
  switch (platformRole) {
    case 'super_admin':
      return 'destructive'; // Gold/Red for highest privilege
    case 'admin':
      return 'default';
    case 'support':
    case 'billing_admin':
      return 'secondary';
    default:
      return 'outline';
  }
}
