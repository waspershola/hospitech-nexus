import { ConfigCard } from '../shared/ConfigCard';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Lock, Save, Loader2 } from 'lucide-react';
import { usePermissions, PERMISSION_KEYS } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const ROLES = [
  { value: 'owner', label: 'Owner', variant: 'default' },
  { value: 'manager', label: 'Manager', variant: 'secondary' },
  { value: 'frontdesk', label: 'Front Desk', variant: 'outline' },
  { value: 'housekeeping', label: 'Housekeeping', variant: 'outline' },
  { value: 'maintenance', label: 'Maintenance', variant: 'outline' },
  { value: 'guest', label: 'Guest', variant: 'outline' },
] as const;

export function PermissionsTab() {
  const { tenantId } = useAuth();
  const { permissions, isLoading, updatePermission, isUpdating } = usePermissions();

  const getPermissionValue = (role: string, permissionKey: string) => {
    const permission = permissions.find(
      (p) => p.role === role && p.permission_key === permissionKey
    );
    return permission?.allowed ?? false;
  };

  const handleToggle = (role: string, permissionKey: string, allowed: boolean) => {
    updatePermission({ role: role as any, permission_key: permissionKey, allowed });
  };

  if (isLoading) {
    return (
      <ConfigCard
        title="Role-Based Permissions"
        description="Configure access levels and approval workflows"
        icon={Lock}
      >
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <div className="space-y-3 ml-4">
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-10 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ConfigCard>
    );
  }

  return (
    <ConfigCard
      title="Role-Based Permissions"
      description="Configure access levels and approval workflows for each role"
      icon={Lock}
    >
      <div className="space-y-8">
        {/* Roles Overview */}
        <div className="flex flex-wrap gap-2 p-4 bg-muted/50 rounded-lg">
          {ROLES.map((role) => (
            <Badge key={role.value} variant={role.variant as any}>
              {role.label}
            </Badge>
          ))}
        </div>

        {/* Financial Permissions */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-foreground">Financial Controls</h4>
            <Badge variant="outline" className="text-xs">
              {Object.keys(PERMISSION_KEYS.FINANCIAL).length} permissions
            </Badge>
          </div>
          <div className="grid gap-4">
            {Object.entries(PERMISSION_KEYS.FINANCIAL).map(([key, label]) => (
              <div
                key={key}
                className="p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="font-medium mb-3 text-foreground">{label}</div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {ROLES.map((role) => (
                    <div key={role.value} className="flex items-center justify-between">
                      <Label
                        htmlFor={`${key}-${role.value}`}
                        className="text-sm cursor-pointer text-muted-foreground"
                      >
                        {role.label}
                      </Label>
                      <Switch
                        id={`${key}-${role.value}`}
                        checked={getPermissionValue(role.value, key)}
                        onCheckedChange={(checked) =>
                          handleToggle(role.value, key, checked)
                        }
                        disabled={isUpdating}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Booking Permissions */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-foreground">Booking Controls</h4>
            <Badge variant="outline" className="text-xs">
              {Object.keys(PERMISSION_KEYS.BOOKING).length} permissions
            </Badge>
          </div>
          <div className="grid gap-4">
            {Object.entries(PERMISSION_KEYS.BOOKING).map(([key, label]) => (
              <div
                key={key}
                className="p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="font-medium mb-3 text-foreground">{label}</div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {ROLES.map((role) => (
                    <div key={role.value} className="flex items-center justify-between">
                      <Label
                        htmlFor={`${key}-${role.value}`}
                        className="text-sm cursor-pointer text-muted-foreground"
                      >
                        {role.label}
                      </Label>
                      <Switch
                        id={`${key}-${role.value}`}
                        checked={getPermissionValue(role.value, key)}
                        onCheckedChange={(checked) =>
                          handleToggle(role.value, key, checked)
                        }
                        disabled={isUpdating}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Access Permissions */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-foreground">Data Access</h4>
            <Badge variant="outline" className="text-xs">
              {Object.keys(PERMISSION_KEYS.DATA).length} permissions
            </Badge>
          </div>
          <div className="grid gap-4">
            {Object.entries(PERMISSION_KEYS.DATA).map(([key, label]) => (
              <div
                key={key}
                className="p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="font-medium mb-3 text-foreground">{label}</div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {ROLES.map((role) => (
                    <div key={role.value} className="flex items-center justify-between">
                      <Label
                        htmlFor={`${key}-${role.value}`}
                        className="text-sm cursor-pointer text-muted-foreground"
                      >
                        {role.label}
                      </Label>
                      <Switch
                        id={`${key}-${role.value}`}
                        checked={getPermissionValue(role.value, key)}
                        onCheckedChange={(checked) =>
                          handleToggle(role.value, key, checked)
                        }
                        disabled={isUpdating}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Room Management Permissions */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-foreground">Room Management</h4>
            <Badge variant="outline" className="text-xs">
              {Object.keys(PERMISSION_KEYS.ROOMS).length} permissions
            </Badge>
          </div>
          <div className="grid gap-4">
            {Object.entries(PERMISSION_KEYS.ROOMS).map(([key, label]) => (
              <div
                key={key}
                className="p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="font-medium mb-3 text-foreground">{label}</div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {ROLES.map((role) => (
                    <div key={role.value} className="flex items-center justify-between">
                      <Label
                        htmlFor={`${key}-${role.value}`}
                        className="text-sm cursor-pointer text-muted-foreground"
                      >
                        {role.label}
                      </Label>
                      <Switch
                        id={`${key}-${role.value}`}
                        checked={getPermissionValue(role.value, key)}
                        onCheckedChange={(checked) =>
                          handleToggle(role.value, key, checked)
                        }
                        disabled={isUpdating}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Banner */}
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Note:</strong> Permission changes are saved
            automatically. Owner and Manager roles typically have full access by default.
          </p>
        </div>
      </div>
    </ConfigCard>
  );
}
