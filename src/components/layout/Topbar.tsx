import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatPlatformRole, formatTenantRole, getRoleBadgeVariant } from '@/lib/roleFormatter';
import NotificationBell from './NotificationBell';

export default function Topbar() {
  const { user, role, platformRole, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth/login');
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  // Prioritize platform role for display
  const displayRole = platformRole ? formatPlatformRole(platformRole) : (role ? formatTenantRole(role) : null);
  const hasDualRole = platformRole && role;

  return (
    <div className="flex-1 flex items-center justify-end gap-4">
      <NotificationBell />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {user?.email ? getInitials(user.email) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col items-start">
              <span className="text-sm font-medium">{user?.email}</span>
              {displayRole && (
                <div className="flex items-center gap-1">
                  {platformRole && <Shield className="w-3 h-3 text-destructive" />}
                  <span className="text-xs text-muted-foreground">{displayRole}</span>
                </div>
              )}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {hasDualRole ? (
            <>
              <div className="px-2 py-1.5 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground">Platform Role:</span>
                  <Badge variant={getRoleBadgeVariant(platformRole!)}>
                    {formatPlatformRole(platformRole!)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tenant Role:</span>
                  <Badge variant="outline">
                    {formatTenantRole(role!)}
                  </Badge>
                </div>
              </div>
              <DropdownMenuSeparator />
            </>
          ) : platformRole ? (
            <>
              <div className="px-2 py-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Platform Role:</span>
                  <Badge variant={getRoleBadgeVariant(platformRole)}>
                    {formatPlatformRole(platformRole)}
                  </Badge>
                </div>
              </div>
              <DropdownMenuSeparator />
            </>
          ) : null}
          
          <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
            <User className="mr-2 h-4 w-4" />
            Profile Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}