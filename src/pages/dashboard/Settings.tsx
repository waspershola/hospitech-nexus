import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { User, Shield, Info, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatPlatformRole } from '@/lib/roleFormatter';

export default function Settings() {
  const { user, role, tenantId, tenantName, platformRole } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display text-foreground mb-2">My Account Settings</h1>
        <p className="text-muted-foreground">
          View your personal account information and role permissions
        </p>
      </div>

      {/* Role Sync Alert - Show if no roles assigned */}
      {!platformRole && !role && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>No role assigned.</strong> If you just signed in, please sign out completely and sign back in to refresh your session. Clear your browser cache if the issue persists.
          </AlertDescription>
        </Alert>
      )}

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          For hotel-wide settings, visit the{' '}
          <a href="/dashboard/domain-config" className="font-medium underline">
            Domain Configuration
          </a>
          {' '}(identity & branding) or{' '}
          <a href="/dashboard/configuration-center" className="font-medium underline">
            Configuration Center
          </a>
          {' '}(operations & integrations).
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Information */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-display text-foreground">Account Information</h3>
          </div>
          <div className="space-y-4">
            <div className="pb-3 border-b">
              <Label className="text-sm text-muted-foreground">Email Address</Label>
              <p className="font-medium text-foreground mt-1">{user?.email}</p>
            </div>
            <div className="pb-3 border-b">
              <Label className="text-sm text-muted-foreground">User ID</Label>
              <p className="font-mono text-xs text-muted-foreground mt-1 break-all">
                {user?.id}
              </p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Account Status</Label>
              <div className="mt-1">
                <Badge variant="default">Active</Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Role & Permissions */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-accent/10">
              <Shield className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-lg font-display text-foreground">Role & Permissions</h3>
          </div>
          <div className="space-y-4">
            {/* Platform Role */}
            {platformRole && (
              <div className="pb-3 border-b">
                <Label className="text-sm text-muted-foreground">Platform Role</Label>
                <div className="mt-1">
                  <Badge variant="destructive" className="capitalize">
                    {formatPlatformRole(platformRole)}
                  </Badge>
                </div>
              </div>
            )}

            {/* Tenant Role */}
            {role && (
              <div className="pb-3 border-b">
                <Label className="text-sm text-muted-foreground">Tenant Role</Label>
                <div className="mt-1">
                  <Badge variant="secondary" className="capitalize">
                    {role}
                  </Badge>
                </div>
              </div>
            )}

            {/* Show message if no roles */}
            {!platformRole && !role && (
              <div className="pb-3 border-b">
                <Label className="text-sm text-muted-foreground">Current Role</Label>
                <p className="text-sm text-muted-foreground mt-1">No role assigned</p>
              </div>
            )}

            {/* Tenant Info - only show if tenant role exists */}
            {role && (
              <>
                <div className="pb-3 border-b">
                  <Label className="text-sm text-muted-foreground">Hotel / Tenant</Label>
                  <p className="font-medium text-foreground mt-1">{tenantName || 'Not assigned'}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Tenant ID</Label>
                  <p className="font-mono text-xs text-muted-foreground mt-1 break-all">
                    {tenantId || 'N/A'}
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Role Permissions Info */}
      <Card className="p-6">
        <h3 className="text-lg font-display text-foreground mb-4">Your Permissions</h3>
        <div className="space-y-3 text-sm">
          {/* Platform Role Permissions */}
          {platformRole === 'super_admin' && (
            <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
              <p className="font-medium text-foreground mb-1">Super Admin Access</p>
              <p className="text-muted-foreground">
                You have full platform access including all tenants, users, billing, platform settings,
                navigation management, and system configuration. Highest level of access.
              </p>
            </div>
          )}
          {platformRole === 'admin' && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="font-medium text-foreground mb-1">Platform Admin Access</p>
              <p className="text-muted-foreground">
                You can manage tenants, platform configuration, and system settings. Limited access
                to billing and super admin functions.
              </p>
            </div>
          )}
          {platformRole === 'support' && (
            <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg">
              <p className="font-medium text-foreground mb-1">Support Admin Access</p>
              <p className="text-muted-foreground">
                You can manage support tickets, assist tenants, and access support tools. Limited
                access to platform configuration.
              </p>
            </div>
          )}
          {platformRole === 'billing_admin' && (
            <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg">
              <p className="font-medium text-foreground mb-1">Billing Admin Access</p>
              <p className="text-muted-foreground">
                You can manage billing, subscriptions, and payment operations for all tenants.
              </p>
            </div>
          )}

          {/* Tenant Role Permissions */}
          {role === 'owner' && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="font-medium text-foreground mb-1">Owner Access</p>
              <p className="text-muted-foreground">
                You have full access to all features including configuration, financial management,
                user management, and all booking operations.
              </p>
            </div>
          )}
          {role === 'manager' && (
            <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg">
              <p className="font-medium text-foreground mb-1">Manager Access</p>
              <p className="text-muted-foreground">
                You can manage bookings, view reports, configure settings, and perform most
                operations except user role management.
              </p>
            </div>
          )}
          {role === 'frontdesk' && (
            <div className="p-3 bg-muted/50 border rounded-lg">
              <p className="font-medium text-foreground mb-1">Front Desk Access</p>
              <p className="text-muted-foreground">
                You can manage bookings, check-ins/check-outs, room assignments, and process
                payments. Limited access to financial reports.
              </p>
            </div>
          )}
          {role === 'housekeeping' && (
            <div className="p-3 bg-muted/50 border rounded-lg">
              <p className="font-medium text-foreground mb-1">Housekeeping Access</p>
              <p className="text-muted-foreground">
                You can update room status, view cleaning schedules, and manage room maintenance
                requests.
              </p>
            </div>
          )}
          {role === 'maintenance' && (
            <div className="p-3 bg-muted/50 border rounded-lg">
              <p className="font-medium text-foreground mb-1">Maintenance Access</p>
              <p className="text-muted-foreground">
                You can view and update maintenance requests, manage work orders, and update room
                conditions.
              </p>
            </div>
          )}
          {!platformRole && !role && (
            <p className="text-sm text-muted-foreground">
              No permissions assigned. Please contact your administrator or sign out and sign back in.
            </p>
          )}
          
          <p className="text-xs text-muted-foreground pt-2">
            {platformRole 
              ? 'Contact the platform super admin if you need different permissions.'
              : 'Contact your hotel administrator if you need different permissions or access levels.'}
          </p>
        </div>
      </Card>
    </div>
  );
}
