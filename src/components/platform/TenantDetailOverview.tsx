import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Calendar, CreditCard } from 'lucide-react';

interface TenantDetailOverviewProps {
  tenant: any;
}

export default function TenantDetailOverview({ tenant }: TenantDetailOverviewProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Tenant Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Tenant Name</p>
            <p className="font-medium">{tenant.domain || tenant.owner_email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Owner</p>
            <p className="font-medium">{tenant.owner_name || tenant.owner_email}</p>
            <p className="text-sm text-muted-foreground">{tenant.owner_email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Domain</p>
            <p className="font-medium">{tenant.domain || 'Not configured'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Current Plan</p>
            <p className="font-medium">{tenant.plan?.name || 'No plan assigned'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-medium capitalize">{tenant.status}</p>
          </div>
          {tenant.suspended_at && (
            <div>
              <p className="text-sm text-muted-foreground">Suspended At</p>
              <p className="font-medium">{new Date(tenant.suspended_at).toLocaleString()}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="font-medium">{new Date(tenant.created_at).toLocaleString()}</p>
          </div>
          {tenant.activated_at && (
            <div>
              <p className="text-sm text-muted-foreground">Activated</p>
              <p className="font-medium">{new Date(tenant.activated_at).toLocaleString()}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Last Updated</p>
            <p className="font-medium">{new Date(tenant.updated_at).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usage Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="font-medium">Coming soon</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Active Bookings</p>
            <p className="font-medium">Coming soon</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Rooms</p>
            <p className="font-medium">Coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
