import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { usePlatformUsers, type PlatformUser } from '@/hooks/usePlatformUsers';
import { PlatformUserForm } from '@/components/platform/PlatformUserForm';
import { ManualPasswordDialog } from '@/components/platform/ManualPasswordDialog';
import { PasswordResetDialog } from '@/components/platform/PasswordResetDialog';
import { getRoleBadge } from '@/components/platform/PlatformRoleSelector';
import { UserPlus, Mail, Pencil, Trash2, Shield, Clock, RotateCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

export function PlatformUsersTab() {
  const { user } = useAuth();
  const { users, isLoading, createUser, updateUser, deleteUser, sendPasswordReset } = usePlatformUsers();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const [manualPasswordDialog, setManualPasswordDialog] = useState<{
    open: boolean;
    password: string;
    userEmail: string;
  }>({ open: false, password: '', userEmail: '' });
  const [resetPasswordDialog, setResetPasswordDialog] = useState<{
    open: boolean;
    user: PlatformUser | null;
  }>({ open: false, user: null });

  const handleCreate = (data: { 
    email: string; 
    full_name: string; 
    role: string;
    phone?: string;
    password_delivery_method?: 'email' | 'sms' | 'manual';
  }) => {
    createUser.mutate(data, {
      onSuccess: (response) => {
        setCreateDialogOpen(false);
        
        // Handle manual password display
        if (data.password_delivery_method === 'manual' && response.temporary_password) {
          setManualPasswordDialog({
            open: true,
            password: response.temporary_password,
            userEmail: data.email,
          });
          toast.success('User created successfully. Copy the password now!');
        } else if (data.password_delivery_method === 'sms') {
          toast.success(`User created and password sent via SMS to ${data.phone}`);
        } else {
          toast.success(`User created and password reset email sent to ${data.email}`);
        }
      },
    });
  };

  const handleEdit = (data: { email: string; full_name: string; role: string }) => {
    if (!selectedUser) return;
    updateUser.mutate(
      {
        userId: selectedUser.user_id,
        updates: { full_name: data.full_name, role: data.role as any },
      },
      {
        onSuccess: () => {
          setEditDialogOpen(false);
          setSelectedUser(null);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!selectedUser) return;
    deleteUser.mutate(selectedUser.user_id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setSelectedUser(null);
      },
    });
  };

  const handlePasswordReset = (user: PlatformUser) => {
    setResetPasswordDialog({ open: true, user });
  };

  const handleResetPasswordSubmit = async (userId: string, deliveryMethod: string) => {
    // Platform user password reset would need edge function update similar to tenant users
    // For now, fallback to email only
    sendPasswordReset.mutate(userId);
    setResetPasswordDialog({ open: false, user: null });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Platform Users
              </CardTitle>
              <CardDescription>
                Manage platform administrators and service accounts
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!users || users.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No platform users found</p>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                variant="outline"
                className="mt-4"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Create First User
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-300px)]">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((platformUser) => (
                <TableRow key={platformUser.user_id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{platformUser.full_name}</span>
                          {platformUser.system_locked && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              <Shield className="h-3 w-3 mr-1" />
                              Protected
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                          {platformUser.email}
                          {platformUser.user_id === user?.id && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(platformUser.role)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {platformUser.last_active
                          ? formatDistanceToNow(new Date(platformUser.last_active), {
                              addSuffix: true,
                            })
                          : 'Never'}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(platformUser.created_at), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePasswordReset(platformUser)}
                          disabled={sendPasswordReset.isPending || platformUser.system_locked}
                          title={platformUser.system_locked ? "Cannot reset password for protected account" : "Reset password"}
                        >
                          <RotateCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(platformUser);
                            setEditDialogOpen(true);
                          }}
                          disabled={platformUser.user_id === user?.id || platformUser.system_locked}
                          title={platformUser.system_locked ? "Cannot edit protected account" : "Edit user"}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(platformUser);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={platformUser.user_id === user?.id || platformUser.system_locked}
                          title={platformUser.system_locked ? "Cannot delete protected account" : "Delete user"}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <PlatformUserForm
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreate}
        isSubmitting={createUser.isPending}
        mode="create"
      />

      {/* Edit User Dialog */}
      {selectedUser && (
        <PlatformUserForm
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSubmit={handleEdit}
          isSubmitting={updateUser.isPending}
          mode="edit"
          initialData={{
            email: selectedUser.email,
            full_name: selectedUser.full_name,
            role: selectedUser.role,
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Platform User?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUser?.full_name}? This action cannot be
              undone. The user will lose all platform access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedUser(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manual Password Display Dialog */}
      <ManualPasswordDialog
        open={manualPasswordDialog.open}
        onOpenChange={(open) => setManualPasswordDialog({ ...manualPasswordDialog, open })}
        password={manualPasswordDialog.password}
        userEmail={manualPasswordDialog.userEmail}
      />

      {/* Password Reset Dialog */}
      {resetPasswordDialog.user && (
        <PasswordResetDialog
          open={resetPasswordDialog.open}
          onOpenChange={(open) => setResetPasswordDialog({ open, user: null })}
          user={{
            id: resetPasswordDialog.user.user_id,
            email: resetPasswordDialog.user.email,
            phone: resetPasswordDialog.user.phone,
            full_name: resetPasswordDialog.user.full_name,
          }}
          userType="platform"
          onReset={handleResetPasswordSubmit}
          isResetting={sendPasswordReset.isPending}
        />
      )}
    </>
  );
}
