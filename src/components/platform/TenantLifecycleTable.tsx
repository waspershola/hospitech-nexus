import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { MoreHorizontal, CheckCircle, XCircle, Pause, Play } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  activated_at?: string;
  suspended_at?: string;
  tenant_subscriptions?: Array<{
    status: string;
    platform_plans: {
      name: string;
      slug: string;
    };
  }>;
  user_roles?: Array<{ count: number }>;
}

interface TenantLifecycleTableProps {
  tenants: Tenant[];
  onActivate?: (tenantId: string) => void;
  onSuspend?: (tenantId: string) => void;
  onDeactivate?: (tenantId: string) => void;
}

export function TenantLifecycleTable({
  tenants,
  onActivate,
  onSuspend,
  onDeactivate,
}: TenantLifecycleTableProps) {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: 'default',
      pending: 'secondary',
      suspended: 'destructive',
      inactive: 'outline',
      trial: 'secondary',
    };

    const icons: Record<string, any> = {
      active: CheckCircle,
      suspended: XCircle,
      pending: Play,
      inactive: Pause,
    };

    const Icon = icons[status];

    return (
      <Badge variant={variants[status] || 'secondary'} className="gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (!tenants || tenants.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No tenants found
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Users</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Activated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.map((tenant) => (
            <TableRow key={tenant.id}>
              <TableCell className="font-medium">
                <div>
                  <div>{tenant.name}</div>
                  <div className="text-sm text-muted-foreground">{tenant.slug}</div>
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(tenant.status)}</TableCell>
              <TableCell>
                {tenant.tenant_subscriptions?.[0]?.platform_plans?.name || 'No Plan'}
              </TableCell>
              <TableCell>{tenant.user_roles?.[0]?.count || 0}</TableCell>
              <TableCell className="text-sm">
                {format(new Date(tenant.created_at), 'MMM dd, yyyy')}
              </TableCell>
              <TableCell className="text-sm">
                {tenant.activated_at
                  ? format(new Date(tenant.activated_at), 'MMM dd, yyyy')
                  : '-'}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {tenant.status === 'pending' && onActivate && (
                      <DropdownMenuItem onClick={() => onActivate(tenant.id)}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Activate
                      </DropdownMenuItem>
                    )}
                    {tenant.status === 'active' && onSuspend && (
                      <DropdownMenuItem onClick={() => onSuspend(tenant.id)}>
                        <Pause className="mr-2 h-4 w-4" />
                        Suspend
                      </DropdownMenuItem>
                    )}
                    {tenant.status === 'suspended' && onActivate && (
                      <DropdownMenuItem onClick={() => onActivate(tenant.id)}>
                        <Play className="mr-2 h-4 w-4" />
                        Reactivate
                      </DropdownMenuItem>
                    )}
                    {tenant.status === 'active' && onDeactivate && (
                      <DropdownMenuItem
                        onClick={() => onDeactivate(tenant.id)}
                        className="text-destructive"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Deactivate
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
