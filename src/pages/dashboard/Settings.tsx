import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { User, Shield, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Settings() {
  const { user, role, tenantId, tenantName } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display text-foreground mb-2">My Account Settings</h1>
        <p className="text-muted-foreground">
          View your personal account information and role permissions
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          For hotel-wide settings like branding, financials, and email configuration, please visit
          the{' '}
          <a href="/dashboard/configuration" className="font-medium underline">
            Configuration Center
          </a>
          .
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
            <div className="pb-3 border-b">
              <Label className="text-sm text-muted-foreground">Current Role</Label>
              <div className="mt-1">
                <Badge variant="secondary" className="capitalize">
                  {role}
                </Badge>
              </div>
            </div>
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
          </div>
        </Card>
      </div>

      {/* Role Permissions Info */}
      <Card className="p-6">
        <h3 className="text-lg font-display text-foreground mb-4">Your Permissions</h3>
        <div className="space-y-3 text-sm">
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
          <p className="text-xs text-muted-foreground pt-2">
            Contact your hotel administrator if you need different permissions or access levels.
          </p>
        </div>
      </Card>
    </div>
  );
}
