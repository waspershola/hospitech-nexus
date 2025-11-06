import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, UserCog, KeyRound, PlayCircle, PauseCircle } from 'lucide-react';
import { TenantUser } from '@/hooks/useTenantUsers';
import { formatDistanceToNow } from 'date-fns';

interface TenantUserTableProps {
  users: TenantUser[];
  onEdit: (user: TenantUser) => void;
  onResetPassword: (userId: string) => void;
  onSuspend: (userId: string) => void;
  onActivate: (userId: string) => void;
}

export function TenantUserTable({ 
  users, 
  onEdit, 
  onResetPassword, 
  onSuspend, 
  onActivate 
}: TenantUserTableProps) {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      active: { variant: 'default', label: 'Active' },
      suspended: { variant: 'destructive', label: 'Suspended' },
      pending: { variant: 'secondary', label: 'Pending' },
    };

    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, any> = {
      owner: 'default',
      manager: 'secondary',
      staff: 'outline',
    };

    return <Badge variant={variants[role] || 'outline'}>{role}</Badge>;
  };

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <UserCog className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No users found in this tenant</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Sign In</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{user.full_name || 'N/A'}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                  {user.phone && (
                    <div className="text-xs text-muted-foreground">{user.phone}</div>
                  )}
                </div>
              </TableCell>
              <TableCell>{getRoleBadge(user.role)}</TableCell>
              <TableCell>{getStatusBadge(user.status)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {user.last_sign_in_at 
                  ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true })
                  : 'Never'}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onEdit(user)}>
                      <UserCog className="h-4 w-4 mr-2" />
                      Edit User
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onResetPassword(user.id)}>
                      <KeyRound className="h-4 w-4 mr-2" />
                      Reset Password
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {user.status === 'suspended' ? (
                      <DropdownMenuItem onClick={() => onActivate(user.id)}>
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Activate User
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => onSuspend(user.id)}
                      >
                        <PauseCircle className="h-4 w-4 mr-2" />
                        Suspend User
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
