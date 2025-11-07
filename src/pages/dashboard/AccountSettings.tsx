import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Building2, Shield, Calendar, CheckCircle2 } from 'lucide-react';

export default function AccountSettings() {
  const { user, tenantId, tenantName, role, department, platformRole } = useAuth();

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Role badge variant
  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'manager':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-display text-foreground mb-2">Profile Settings</h1>
        <p className="text-muted-foreground">
          View your personal account information and permissions
        </p>
      </div>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Account Information
          </CardTitle>
          <CardDescription>
            Your personal account details and authentication status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </label>
              <p className="text-foreground font-medium">{user?.email || 'Not available'}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Shield className="w-4 h-4" />
                User ID
              </label>
              <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                {user?.id || 'Not available'}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Account Created
              </label>
              <p className="text-foreground">{formatDate(user?.created_at)}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Email Verified
              </label>
              <Badge variant={user?.email_confirmed_at ? 'default' : 'outline'}>
                {user?.email_confirmed_at ? 'Verified' : 'Not Verified'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenant & Role Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Organization & Role
          </CardTitle>
          <CardDescription>
            Your role and permissions within the hotel system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Hotel Name
              </label>
              <p className="text-foreground font-medium">{tenantName || 'Not assigned'}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Tenant ID
              </label>
              <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                {tenantId || 'Not assigned'}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Current Role
              </label>
              <Badge variant={getRoleBadgeVariant(role)} className="capitalize">
                {role || 'No role assigned'}
              </Badge>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Department
              </label>
              <p className="text-foreground capitalize">{department || 'Not assigned'}</p>
            </div>

            {platformRole && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Platform Role
                </label>
                <Badge variant="default" className="capitalize">
                  {platformRole}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Note */}
      <Card className="border-muted">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            To modify hotel settings and configurations, visit:
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              <a 
                href="/dashboard/domain-config" 
                className="text-primary hover:underline font-medium"
              >
                → Domain Configuration
              </a>
              {' '}for hotel identity and branding
            </li>
            <li>
              <a 
                href="/dashboard/configuration-center" 
                className="text-primary hover:underline font-medium"
              >
                → Configuration Center
              </a>
              {' '}for operational settings
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
