import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Users, Lock, Info } from 'lucide-react';
import UserManagementTable from '@/modules/admin/UserManagementTable';
import RolePermissionsMatrix from '@/modules/admin/RolePermissionsMatrix';
import { useRole } from '@/hooks/useRole';

export default function UserRoles() {
  const { isOwner, isManager } = useRole();

  // Only owners and managers can access this page
  if (!isOwner && !isManager) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-offWhite px-4">
        <div className="text-center">
          <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-display text-charcoal mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to manage user roles. This feature is only available to
            Owners and Managers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display text-foreground mb-2">User Roles & Permissions</h1>
        <p className="text-muted-foreground">
          Manage team members and configure role-based access control
        </p>
      </div>

      {/* Security Notice */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Role changes take effect immediately. All edge functions and
          database operations are protected by server-side role verification. UI restrictions are
          for user experience only.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Team Members
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Permissions Matrix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-display">Team Members</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage user roles and access levels for your organization
                </p>
              </div>
            </div>

            <UserManagementTable />
          </Card>

          {/* Role Descriptions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-primary" />
                Owner
              </h4>
              <p className="text-sm text-muted-foreground">
                Full system access including configuration, user management, and all operations.
                Cannot be removed or have role changed.
              </p>
            </Card>

            <Card className="p-4">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-accent" />
                Manager
              </h4>
              <p className="text-sm text-muted-foreground">
                Nearly full access to all features except user role management. Can force checkouts
                and approve payments.
              </p>
            </Card>

            <Card className="p-4">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                Front Desk
              </h4>
              <p className="text-sm text-muted-foreground">
                Manage bookings, check-ins/outs, room assignments, and process payments. Limited
                financial access.
              </p>
            </Card>

            <Card className="p-4">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                Finance
              </h4>
              <p className="text-sm text-muted-foreground">
                Full financial operations access including reports, reconciliation, and payment
                approvals.
              </p>
            </Card>

            <Card className="p-4">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                Housekeeping
              </h4>
              <p className="text-sm text-muted-foreground">
                View and update room status, manage cleaning schedules. Limited to assigned rooms.
              </p>
            </Card>

            <Card className="p-4">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                Maintenance
              </h4>
              <p className="text-sm text-muted-foreground">
                View and update maintenance requests, work orders, and room conditions.
              </p>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="permissions">
          <RolePermissionsMatrix />
        </TabsContent>
      </Tabs>
    </div>
  );
}
