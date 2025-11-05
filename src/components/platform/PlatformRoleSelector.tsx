import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface PlatformRoleSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const PLATFORM_ROLES = [
  {
    value: 'super_admin',
    label: 'Super Admin',
    description: 'Full platform control',
    variant: 'destructive' as const,
  },
  {
    value: 'support_admin',
    label: 'Support Admin',
    description: 'View logs, handle tickets',
    variant: 'default' as const,
  },
  {
    value: 'billing_bot',
    label: 'Billing Bot',
    description: 'Automated billing workflows',
    variant: 'secondary' as const,
  },
  {
    value: 'marketplace_admin',
    label: 'Marketplace Admin',
    description: 'Manage add-on catalog',
    variant: 'outline' as const,
  },
  {
    value: 'monitoring_bot',
    label: 'Monitoring Bot',
    description: 'Real-time monitoring',
    variant: 'secondary' as const,
  },
];

export function PlatformRoleSelector({ value, onChange, disabled }: PlatformRoleSelectorProps) {
  const selectedRole = PLATFORM_ROLES.find((r) => r.value === value);

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Select platform role">
            {selectedRole && (
              <div className="flex items-center gap-2">
                <Badge variant={selectedRole.variant}>{selectedRole.label}</Badge>
                <span className="text-sm text-muted-foreground">{selectedRole.description}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PLATFORM_ROLES.map((role) => (
            <SelectItem key={role.value} value={role.value}>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Badge variant={role.variant}>{role.label}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">{role.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function getRoleBadge(role: string) {
  const roleConfig = PLATFORM_ROLES.find((r) => r.value === role);
  if (!roleConfig) return <Badge>{role}</Badge>;
  return <Badge variant={roleConfig.variant}>{roleConfig.label}</Badge>;
}
