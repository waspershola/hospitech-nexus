import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface TenantUser {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  status: string;
  created_at: string;
  last_sign_in_at?: string;
  phone?: string;
  suspension_metadata?: {
    suspension_type?: 'tenant' | 'individual';
    suspended_at?: string;
    reason?: string;
    suspended_by?: string;
  };
}

export function useTenantUsers(tenantId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['tenant-users', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase.functions.invoke('tenant-user-management', {
        body: { action: 'list', tenant_id: tenantId },
      });

      if (error) throw error;
      return data.users as TenantUser[];
    },
    enabled: !!tenantId,
  });

  const createUser = useMutation({
    mutationFn: async (userData: {
      tenant_id: string;
      email: string;
      full_name: string;
      role: string;
      phone?: string;
      password?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('tenant-user-management', {
        body: { action: 'create', ...userData },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] });
      toast({ title: 'Success', description: 'User created successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to create user',
        variant: 'destructive' 
      });
    },
  });

  const updateUser = useMutation({
    mutationFn: async (data: {
      tenant_id: string;
      user_id: string;
      updates: Partial<TenantUser>;
    }) => {
      const { data: result, error } = await supabase.functions.invoke('tenant-user-management', {
        body: { action: 'update', ...data },
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] });
      toast({ title: 'Success', description: 'User updated successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to update user',
        variant: 'destructive' 
      });
    },
  });

  const suspendUser = useMutation({
    mutationFn: async (data: { tenant_id: string; user_id: string }) => {
      const { data: result, error } = await supabase.functions.invoke('tenant-user-management', {
        body: { action: 'suspend', ...data },
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] });
      toast({ title: 'Success', description: 'User suspended' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to suspend user',
        variant: 'destructive' 
      });
    },
  });

  const activateUser = useMutation({
    mutationFn: async (data: { tenant_id: string; user_id: string }) => {
      const { data: result, error } = await supabase.functions.invoke('tenant-user-management', {
        body: { action: 'activate', ...data },
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] });
      toast({ title: 'Success', description: 'User activated' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to activate user',
        variant: 'destructive' 
      });
    },
  });

  const resetPassword = useMutation({
    mutationFn: async (data: { tenant_id: string; user_id: string }) => {
      const { data: result, error } = await supabase.functions.invoke('tenant-user-management', {
        body: { action: 'reset_password', ...data },
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Password reset email sent' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to reset password',
        variant: 'destructive' 
      });
    },
  });

  return {
    users,
    isLoading,
    createUser,
    updateUser,
    suspendUser,
    activateUser,
    resetPassword,
  };
}
