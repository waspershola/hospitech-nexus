import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PlatformUser {
  user_id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'support_admin' | 'billing_bot' | 'marketplace_admin' | 'monitoring_bot';
  last_active?: string;
  created_at: string;
  updated_at: string;
}

export function usePlatformUsers() {
  const queryClient = useQueryClient();

  // Fetch all platform users
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['platform-users'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('platform-user-management', {
        method: 'GET',
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to fetch platform users');

      return data.data as PlatformUser[];
    },
  });

  // Create platform user
  const createUser = useMutation({
    mutationFn: async (userData: { email: string; full_name: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke('platform-user-management', {
        method: 'POST',
        body: userData,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to create platform user');

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['platform-users'] });
      toast.success(data.message || 'Platform user created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create user: ${error.message}`);
    },
  });

  // Update platform user
  const updateUser = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<PlatformUser> }) => {
      const { data, error } = await supabase.functions.invoke(
        `platform-user-management/${userId}`,
        {
          method: 'PATCH',
          body: updates,
        }
      );

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to update platform user');

      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-users'] });
      toast.success('Platform user updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update user: ${error.message}`);
    },
  });

  // Delete platform user
  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke(
        `platform-user-management/${userId}`,
        {
          method: 'DELETE',
        }
      );

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to delete platform user');

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-users'] });
      toast.success('Platform user deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete user: ${error.message}`);
    },
  });

  // Send password reset
  const sendPasswordReset = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke(
        `platform-user-management/${userId}/reset-password`,
        {
          method: 'POST',
        }
      );

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to send password reset');

      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Password reset email sent');
    },
    onError: (error: Error) => {
      toast.error(`Failed to send reset: ${error.message}`);
    },
  });

  return {
    users,
    isLoading,
    error,
    createUser,
    updateUser,
    deleteUser,
    sendPasswordReset,
  };
}
