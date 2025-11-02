import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UserWithRole {
  id: string;
  email: string;
  role: string;
  tenant_id: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export function useUserManagement() {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all users in the tenant
  const { data: users, isLoading } = useQuery({
    queryKey: ['tenant-users', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant ID');

      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          tenant_id,
          created_at,
          profiles:user_id (
            id,
            email,
            full_name
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include user info from auth.users via profiles
      const usersWithDetails: UserWithRole[] = await Promise.all(
        (data || []).map(async (userRole) => {
          const profile = userRole.profiles as any;
          
          // Get last sign in from auth.users metadata
          const { data: authUser } = await supabase.auth.admin.getUserById(userRole.user_id);
          
          return {
            id: userRole.user_id,
            email: profile?.email || 'Unknown',
            role: userRole.role,
            tenant_id: userRole.tenant_id,
            created_at: userRole.created_at,
            last_sign_in_at: authUser?.user?.last_sign_in_at || null,
          };
        })
      );

      return usersWithDetails;
    },
    enabled: !!tenantId,
  });

  // Update user role
  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      if (!tenantId) throw new Error('No tenant ID');
      if (userId === user?.id) throw new Error('Cannot change your own role');

      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole as any }) // Cast to any to handle app_role enum
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] });
      toast.success('User role updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });

  // Remove user from tenant
  const removeUser = useMutation({
    mutationFn: async (userId: string) => {
      if (!tenantId) throw new Error('No tenant ID');
      if (userId === user?.id) throw new Error('Cannot remove yourself');

      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] });
      toast.success('User removed from organization');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove user: ${error.message}`);
    },
  });

  return {
    users,
    isLoading,
    updateRole,
    removeUser,
  };
}
