import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { TenantUserTable } from './TenantUserTable';
import { TenantUserDialog } from './TenantUserDialog';
import { ManualPasswordDialog } from './ManualPasswordDialog';
import { PasswordResetDialog } from './PasswordResetDialog';
import { useTenantUsers, type TenantUser } from '@/hooks/useTenantUsers';

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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<TenantUser | null>(null);
  const [manualPasswordDialog, setManualPasswordDialog] = useState<{
    open: boolean;
    user: { email: string; full_name: string } | null;
    password: string;
  }>({
    open: false,
    user: null,
    password: '',
  });
  const [resetPasswordDialog, setResetPasswordDialog] = useState<{
    open: boolean;
    user: TenantUser | null;
  }>({
    open: false,
    user: null,
  });

  const handleSuspendUser = (userId: string) => {
    suspendUser.mutate({ tenant_id: tenantId, user_id: userId });
  };

  const handleActivateUser = (userId: string) => {
    activateUser.mutate({ tenant_id: tenantId, user_id: userId });
  };

  const handleCreateUser = () => {
    setDialogMode('create');
    setSelectedUser(null);
    setDialogOpen(true);
  };

  const handleEditUser = (user: TenantUser) => {
    setDialogMode('edit');
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleResetPassword = (user: TenantUser) => {
    setResetPasswordDialog({ open: true, user });
  };

  const handleResetPasswordSubmit = async (userId: string, deliveryMethod: string) => {
    const result = await resetPassword.mutateAsync({
      tenantId,
      userId,
      deliveryMethod,
    });
    
    // If manual delivery, show password dialog
    if (deliveryMethod === 'manual' && result?.temporary_password) {
      setManualPasswordDialog({
        open: true,
        user: resetPasswordDialog.user ? {
          email: resetPasswordDialog.user.email,
          full_name: resetPasswordDialog.user.full_name || 'User',
        } : null,
        password: result.temporary_password,
      });
    }
    
    setResetPasswordDialog({ open: false, user: null });
  };

  const handleUserSubmit = async (data: any) => {
    if (dialogMode === 'create') {
      const result = await createUser.mutateAsync({
        tenant_id: tenantId,
        ...data,
      });

      // Check for manual password delivery
      if (data.password_delivery_method === 'manual' && result?.temporary_password) {
        setManualPasswordDialog({
          open: true,
          user: {
            email: data.email,
            full_name: data.full_name || 'User',
          },
          password: result.temporary_password,
        });
      }
    } else {
      await updateUser.mutateAsync({
        tenant_id: tenantId,
        user_id: selectedUser?.id,
        updates: {
          full_name: data.full_name,
          role: data.role,
        },
      });
    }
    setDialogOpen(false);
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tenant Users</CardTitle>
            <CardDescription>Manage users, roles, and passwords for this tenant</CardDescription>
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
          isLoading={isLoading}
          onEdit={handleEditUser}
          onSuspend={handleSuspendUser}
          onActivate={handleActivateUser}
          onResetPassword={handleResetPassword}
        />
      </CardContent>

      <TenantUserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleUserSubmit}
        isSubmitting={createUser.isPending || updateUser.isPending}
        mode={dialogMode}
        initialData={selectedUser}
      />

      <ManualPasswordDialog
        open={manualPasswordDialog.open}
        onOpenChange={(open) => setManualPasswordDialog({ open, user: null, password: '' })}
        password={manualPasswordDialog.password}
        userEmail={manualPasswordDialog.user?.email}
        userFullName={manualPasswordDialog.user?.full_name}
      />

      {resetPasswordDialog.user && (
        <PasswordResetDialog
          open={resetPasswordDialog.open}
          onOpenChange={(open) => setResetPasswordDialog({ open, user: null })}
          user={{
            id: resetPasswordDialog.user.id,
            email: resetPasswordDialog.user.email,
            phone: resetPasswordDialog.user.phone,
            full_name: resetPasswordDialog.user.full_name,
          }}
          userType="tenant"
          tenantId={tenantId}
          onReset={handleResetPasswordSubmit}
          isResetting={resetPassword.isPending}
        />
      )}
    </Card>
  );
}
