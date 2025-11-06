import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RotateCw, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface TenantDetailUsersProps {
  tenantId: string;
}

export default function TenantDetailUsers({ tenantId }: TenantDetailUsersProps) {
  const queryClient = useQueryClient();
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['tenant-users', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role, profiles!inner(email, full_name)')
        .eq('tenant_id', tenantId);

      if (error) throw error;
      return data;
    }
  });

  const resetPassword = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('tenant-user-reset-password', {
        body: { user_id: userId, tenant_id: tenantId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setTempPassword(data.temporary_password);
      toast.success('Password reset successfully');
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reset password');
    }
  });

  const handleResetPassword = (userId: string) => {
    setResetUserId(userId);
    resetPassword.mutate(userId);
  };

  const copyPassword = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      toast.success('Password copied to clipboard');
    }
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
          <CardTitle>Users</CardTitle>
          <CardDescription>Manage tenant users and reset passwords</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users?.map((user: any) => (
              <div 
                key={user.user_id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">{user.profiles.full_name || user.profiles.email}</p>
                  <p className="text-sm text-muted-foreground">{user.profiles.email}</p>
                  <Badge variant="outline" className="mt-2">{user.role}</Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResetPassword(user.user_id)}
                  disabled={resetPassword.isPending}
                >
                  <RotateCw className="h-4 w-4 mr-2" />
                  Reset Password
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!tempPassword} onOpenChange={() => setTempPassword(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary Password Generated</DialogTitle>
            <DialogDescription>
              Copy this temporary password and share it with the user. They will be required to change it on next login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-4 bg-muted rounded-lg font-mono">
              <code className="flex-1">{tempPassword}</code>
              <Button size="sm" variant="ghost" onClick={copyPassword}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              ⚠️ Make sure to save this password - it won't be shown again.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
