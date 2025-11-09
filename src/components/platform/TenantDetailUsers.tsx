import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { useTenantUsers } from '@/hooks/useTenantUsers';
import { TenantUserTable } from '@/components/platform/TenantUserTable';
import { TenantUserDialog } from '@/components/platform/TenantUserDialog';
import { ManualPasswordDialog } from '@/components/platform/ManualPasswordDialog';
import { useState } from 'react';

interface TenantDetailUsersProps {
  tenantId: string;
}

export default function TenantDetailUsers({ tenantId }: TenantDetailUsersProps) {
  const {
    users,
    isLoading,
    createUser,
    updateUser,
    suspendUser,
    activateUser,
    resetPassword,
  } = useTenantUsers(tenantId);

  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userDialogMode, setUserDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [manualPasswordData, setManualPasswordData] = useState<{ password: string; user: any } | null>(null);

  const handleCreateUser = () => {
    setUserDialogMode('create');
    setSelectedUser(null);
    setUserDialogOpen(true);
  };

  const handleEditUser = (user: any) => {
    setUserDialogMode('edit');
    setSelectedUser(user);
    setUserDialogOpen(true);
  };

  const handleUserSubmit = async (data: any) => {
    if (userDialogMode === 'create') {
      const result = await createUser.mutateAsync({
        tenant_id: tenantId,
        ...data,
      });
      
      // Check if manual password delivery
      if (data.password_delivery_method === 'manual' && result?.temporary_password) {
        setManualPasswordData({
          password: result.temporary_password,
          user: { email: data.email, name: data.full_name }
        });
      }
    } else {
      await updateUser.mutateAsync({
        tenant_id: tenantId,
        user_id: data.user_id,
        updates: {
          full_name: data.full_name,
          role: data.role,
        },
      });
    }
    setUserDialogOpen(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>Manage tenant users, roles, and access</CardDescription>
            </div>
            <Button onClick={handleCreateUser}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <TenantUserTable
            users={users || []}
            onEdit={handleEditUser}
            onResetPassword={(userId) => resetPassword.mutate({ tenant_id: tenantId, user_id: userId })}
            onSuspend={(userId) => suspendUser.mutate({ tenant_id: tenantId, user_id: userId })}
            onActivate={(userId) => activateUser.mutate({ tenant_id: tenantId, user_id: userId })}
          />
        </CardContent>
      </Card>

      <TenantUserDialog
        open={userDialogOpen}
        onOpenChange={setUserDialogOpen}
        onSubmit={handleUserSubmit}
        isSubmitting={createUser.isPending || updateUser.isPending}
        mode={userDialogMode}
        initialData={selectedUser}
      />

      <ManualPasswordDialog
        open={!!manualPasswordData}
        onOpenChange={(open) => !open && setManualPasswordData(null)}
        password={manualPasswordData?.password || ''}
        userEmail={manualPasswordData?.user?.email}
        userFullName={manualPasswordData?.user?.name}
      />
    </>
  );
}
