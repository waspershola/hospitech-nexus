import { ROLES, PERMISSIONS, getRolePermissions } from '@/lib/roles';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PERMISSION_LIST = [
  { key: 'CREATE_BOOKING', label: 'Create Booking', category: 'Booking Management' },
  { key: 'MODIFY_BOOKING', label: 'Modify Booking', category: 'Booking Management' },
  { key: 'CANCEL_BOOKING', label: 'Cancel Booking', category: 'Booking Management' },
  { key: 'FORCE_CHECKOUT', label: 'Force Checkout', category: 'Booking Management' },
  { key: 'RECORD_PAYMENT', label: 'Record Payment', category: 'Financial Operations' },
  { key: 'PROCESS_REFUNDS', label: 'Process Refunds', category: 'Financial Operations' },
  { key: 'VIEW_FINANCE', label: 'View Finance', category: 'Financial Operations' },
  { key: 'MANAGE_FINANCE', label: 'Manage Finance', category: 'Financial Operations' },
  { key: 'EXPORT_DATA', label: 'Export Data', category: 'Reporting' },
  { key: 'MANAGE_GUESTS', label: 'Manage Guests', category: 'Guest Management' },
  { key: 'MANAGE_CONFIGURATION', label: 'Manage Configuration', category: 'Configuration' },
  { key: 'VIEW_CONFIGURATION', label: 'View Configuration', category: 'Configuration' },
  { key: 'VIEW_ROOMS', label: 'View Rooms', category: 'Room & Housekeeping' },
  { key: 'MANAGE_ROOMS', label: 'Manage Rooms', category: 'Room & Housekeeping' },
  { key: 'CLEAN_ROOMS', label: 'Clean Rooms', category: 'Room & Housekeeping' },
  { key: 'ASSIGN_ROOMS', label: 'Assign Rooms', category: 'Room & Housekeeping' },
  { key: 'SET_MAINTENANCE', label: 'Set Maintenance', category: 'Room & Housekeeping' },
  { key: 'VIEW_REPORTS', label: 'View Reports', category: 'Reporting' },
];

const CATEGORIES = Array.from(new Set(PERMISSION_LIST.map(p => p.category)));

export default function RolePermissionsMatrix() {
  const roles = [
    ROLES.OWNER,
    ROLES.MANAGER,
    ROLES.FRONTDESK,
    ROLES.FINANCE,
    ROLES.ACCOUNTANT,
    ROLES.HOUSEKEEPING,
    ROLES.MAINTENANCE,
  ];

  const hasPermission = (role: string, permissionKey: string): boolean => {
    const rolePerms = getRolePermissions(role);
    return rolePerms.includes(permissionKey);
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-display mb-4">Role Permissions Matrix</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Overview of what each role can access and manage
      </p>

      <div className="space-y-6">
        {CATEGORIES.map((category) => {
          const categoryPerms = PERMISSION_LIST.filter(p => p.category === category);
          
          return (
            <div key={category}>
              <h4 className="font-medium text-sm mb-3">{category}</h4>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Permission</TableHead>
                      {roles.map((role) => (
                        <TableHead key={role} className="text-center text-xs">
                          <Badge variant="outline" className="capitalize">
                            {role}
                          </Badge>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryPerms.map((perm) => (
                      <TableRow key={perm.key}>
                        <TableCell className="text-sm">{perm.label}</TableCell>
                        {roles.map((role) => (
                          <TableCell key={role} className="text-center">
                            {hasPermission(role, perm.key) ? (
                              <Check className="w-4 h-4 text-green-600 mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
